import { useState, useEffect } from "react";
import { Users, Hash, LogOut, MessageSquarePlus, Globe, Bell, BellOff, User, Code2, Video } from "lucide-react";
import { doc, updateDoc, collection, query, onSnapshot, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import toast from "react-hot-toast";

export default function ChatSidebar({
  rooms,
  activeRoomId,
  onSelectRoom,
  onJoinRoom,
  userId,
  userProfile,
  peerProfiles = {},
  onCreateRoom,
  onOpenNovaCall
}) {
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!userId) return;
    
    // Subscribe to unread chat notifications to calculate room badges
    const notifsRef = collection(db, "users", userId, "notifications");
    const q = query(
        notifsRef, 
        where("unread", "==", true),
        where("type", "==", "chat")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const counts = {};
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.roomId) {
                counts[data.roomId] = (counts[data.roomId] || 0) + 1;
            }
        });
        setUnreadCounts(counts);
    });

    return () => unsubscribe();
  }, [userId]);

  // Self-healing: check legacy private rooms and set hasMessages
  useEffect(() => {
    const checkLegacyPrivateRooms = async () => {
      const legacyRooms = rooms.filter(r => r.type === 'private' && typeof r.hasMessages === 'undefined');
      for (const r of legacyRooms) {
        try {
          const q = query(collection(db, "chatRooms", r.id, "messages"), limit(1));
          const snap = await getDocs(q);
          const roomRef = doc(db, "chatRooms", r.id);
          await updateDoc(roomRef, { hasMessages: !snap.empty });
        } catch (err) {
          console.error("Error healing room:", err);
        }
      }
    };
    if (rooms.length > 0) {
      checkLegacyPrivateRooms();
    }
  }, [rooms]);

  const handleToggleMute = async (e, roomId) => {
    e.stopPropagation();
    if (!userId) return;

    try {
      const isMuted = userProfile?.mutedChats?.[roomId];
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`mutedChats.${roomId}`]: !isMuted
      });
      toast.success(!isMuted ? "Notifications muted for this chat" : "Notifications unmuted for this chat");
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast.error("Failed to update mute settings");
    }
  };

  const getRoomName = (room) => {
    if (room.type === 'private') {
      const peerId = room.members?.find(id => id !== userId);
      const peer = peerProfiles[peerId];
      if (peer) return peer.fullName || peer.nickName || peer.displayName || "Private Chat";
      return "Private Chat";
    }
    return room.name || "Chat Room";
  };

  const getRoomIcon = (room) => {
    if (room.type === 'private') {
      const peerId = room.members?.find(id => id !== userId);
      const peer = peerProfiles[peerId];
      if (peer?.photoURL) {
        return <img src={peer.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />;
      }
      const peerName = peer?.fullName || peer?.nickName || peer?.displayName || "User";
      return (
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(peerName)}&background=6366f1&color=fff&size=64`}
          alt=""
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
      );
    }
    if (room.iconEmoji) {
      return <div className="text-[18px] flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-md shrink-0 leading-none">{room.iconEmoji}</div>;
    }
    if (room.iconUrl) {
      return <img src={room.iconUrl} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />;
    }
    const groupName = room.name || "Group";
    return (
      <img
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=e2e8f0&color=475569&size=64`}
        alt=""
        className="w-8 h-8 rounded-md object-cover shrink-0 dark:opacity-80"
      />
    );
  };

  // Separate into global, 1qad, joined, and discover
  const globalRoom = rooms.find(r => r.type === 'global');
  const qadRoom = rooms.find(r => r.type === '1qad');
  
  const joinedRooms = rooms.filter(r => {
    if (!r.members?.includes(userId)) return false;
    if (r.type === 'private') {
       if (r.id === activeRoomId) return true;
       if (r.hasMessages === false) return false;
    }
    return r.type === 'group' || r.type === 'private';
  });
  
  const discoverRooms = rooms.filter(r => r.type === 'group' && !r.members?.includes(userId));

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a]">
      {/* Header - Fixed Height for alignment */}
      <div className="h-[60px] px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#0a0a0a]">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          Chats
        </h2>
        <button
          onClick={onCreateRoom}
          className="group flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-[13px] font-bold rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
          title="Create Group"
        >
          <MessageSquarePlus className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
          <span>New Group</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Global Chat */}
        <div>
          <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Public
          </div>
          {globalRoom && (
            <div
              className={`w-full group/item flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeRoomId === globalRoom.id
                  ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200"
                  : "text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                }`}
              onClick={() => onSelectRoom(globalRoom)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#408A71]/10 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-[#408A71]" />
                </div>
                <span className="truncate">{globalRoom.name || "Global Chat"}</span>
              </div>

              <button
                onClick={(e) => handleToggleMute(e, globalRoom.id)}
                className={`p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 ${userProfile?.mutedChats?.[globalRoom.id] ? "text-amber-500 opacity-100" : "text-slate-400"
                  }`}
                title={userProfile?.mutedChats?.[globalRoom.id] ? "Unmute" : "Mute"}
              >
                {userProfile?.mutedChats?.[globalRoom.id] ? (
                  <BellOff className="w-3.5 h-3.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
          {qadRoom && (
            <div
              className={`w-full group/item flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer mt-1 ${activeRoomId === qadRoom.id
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                  : "text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                }`}
              onClick={() => onSelectRoom(qadRoom)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Code2 className="w-4 h-4 text-amber-500" />
                </div>
                <span className="truncate">1QAD</span>
              </div>

              <button
                onClick={(e) => handleToggleMute(e, qadRoom.id)}
                className={`p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 ${userProfile?.mutedChats?.[qadRoom.id] ? "text-amber-500 opacity-100" : "text-slate-400"
                  }`}
                title={userProfile?.mutedChats?.[qadRoom.id] ? "Unmute" : "Mute"}
              >
                {userProfile?.mutedChats?.[qadRoom.id] ? (
                  <BellOff className="w-3.5 h-3.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
          {/* Nova Video Call Button */}
          <div
            className="w-full group/item flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer mt-1 text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
            onClick={onOpenNovaCall}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="truncate">Practice AI</span>
            </div>
          </div>
        </div>

        {/* Joined Chats */}
        {joinedRooms.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Your Chats
            </div>
            {joinedRooms.map(room => (
              <div
                key={room.id}
                className={`w-full group/item flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 cursor-pointer ${activeRoomId === room.id
                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200"
                    : "text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                  }`}
                onClick={() => onSelectRoom(room)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getRoomIcon(room)}
                  <span className="truncate">{getRoomName(room)}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {unreadCounts[room.id] > 0 && activeRoomId !== room.id && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-sm">
                      {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleToggleMute(e, room.id)}
                    className={`p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 ${userProfile?.mutedChats?.[room.id] ? "text-amber-500 opacity-100" : "text-slate-400"
                      }`}
                    title={userProfile?.mutedChats?.[room.id] ? "Unmute" : "Mute"}
                  >
                    {userProfile?.mutedChats?.[room.id] ? (
                      <BellOff className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Discover Groups */}
        {discoverRooms.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Discover & Join
            </div>
            {discoverRooms.map(room => (
              <div
                key={room.id}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-[#949ba4] hover:bg-slate-200/50 dark:hover:bg-[#35373c] transition-colors mb-0.5 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="grayscale hover:grayscale-0 transition-all shrink-0 flex items-center">
                    {getRoomIcon(room)}
                  </div>
                  <span className="truncate">{room.name}</span>
                </div>
                {room.pendingRequests?.some(r => r.uid === userId) ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded transition-colors shrink-0">
                    Pending
                  </span>
                ) : (
                  <button
                    onClick={() => onJoinRoom(room.id, true)}
                    className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 dark:bg-[#248046] dark:hover:bg-[#1a6334] text-emerald-700 dark:text-white rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    Request
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
