import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  subscribeToChatRooms, 
  joinGroupChat, 
  leaveGroupChat, 
  createGroupChat,
  initializeGlobalChat,
  initialize1QADChat,
  requestJoinGroupChat
} from "../firebase/chatService";
import { triggerDailyLeetcodePost } from "../firebase/automationService";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import NovaVideoCall from "../components/chat/NovaVideoCall";
import toast from "react-hot-toast";
import { X, Loader2 } from "lucide-react";

export default function Chat() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  const { groups } = useOutletContext() || {};
  const navigate = useNavigate();
  const location = useLocation();

  // Access Restriction: Must have at least one batch (unless admin)
  useEffect(() => {
    if (!authLoading && !isAdmin && (!groups || groups.length === 0)) {
        navigate("/dashboard");
    }
  }, [groups, isAdmin, authLoading, navigate]);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [peerProfiles, setPeerProfiles] = useState({});
  
  // Custom Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // Nova Call State
  const [isNovaCallOpen, setIsNovaCallOpen] = useState(false);

  const activeRoomIdRef = React.useRef(activeRoomId);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    if (!user?.uid) return;
    
    // Initialize required rooms and trigger daily automation ONCE per session
    const initChats = async () => {
      try {
        await initializeGlobalChat();
        await initialize1QADChat();
        await triggerDailyLeetcodePost();
      } catch (err) {
        console.error("Error initializing chats:", err);
      }
    };
    initChats();

    const unsubscribe = subscribeToChatRooms(user.uid, (fetchedRooms) => {
      // Filter out rooms where the user is BANNED
      const filteredRooms = fetchedRooms.filter(r => !r.bannedUsers?.includes(user?.uid));
      setRooms(filteredRooms);

      // We use the ref to prevent stale closures without adding it to the dependency array
      if (!activeRoomIdRef.current) {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get("room");
        const savedRoomId = localStorage.getItem("lastActiveChatRoom");
        
        if (!roomParam) {
          if (savedRoomId && filteredRooms.find(r => r.id === savedRoomId)) {
            setActiveRoomId(savedRoomId);
          } else {
            const globalRoom = filteredRooms.find(r => r.type === 'global');
            if (globalRoom) setActiveRoomId(globalRoom.id);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Auto-select room from URL query param (e.g. from notification click)
  useEffect(() => {
    if (rooms.length === 0) return;
    const params = new URLSearchParams(location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      const found = rooms.find(r => r.id === roomParam);
      if (found) setActiveRoomId(roomParam);
    }
  }, [rooms, location.search]);

  // Fetch Profiles for ALL relevant users (Peers in private chats + members of active room)
  useEffect(() => {
    const fetchRelevantProfiles = async () => {
      if (!user?.uid || rooms.length === 0) return;

      const idsToFetch = new Set();
      
      // 1. Peers from private chats (for sidebar)
      rooms.forEach(room => {
        if (room.type === 'private' && room.members?.includes(user.uid)) {
          const peerId = room.members.find(id => id !== user.uid);
          if (peerId && !peerProfiles[peerId]) {
            idsToFetch.add(peerId);
          }
        }
      });

      // 2. Members of the active room (for chat window header and message names)
      const activeRoom = rooms.find(r => r.id === activeRoomId);
      if (activeRoom && activeRoom.members) {
          activeRoom.members.forEach(mId => {
              if (mId !== user.uid && !peerProfiles[mId]) {
                  idsToFetch.add(mId);
              }
          });
      }

      if (idsToFetch.size === 0) return;

      try {
        const idArray = Array.from(idsToFetch);
        const chunkedPromises = [];

        for (let i = 0; i < idArray.length; i += 30) {
          const chunk = idArray.slice(i, i + 30);
          const q = query(collection(db, "users"), where(documentId(), "in", chunk));
          chunkedPromises.push(getDocs(q));
        }

        const snaps = await Promise.all(chunkedPromises);
        
        setPeerProfiles(prev => {
          const newProfiles = { ...prev };
          snaps.forEach(snap => {
            snap.forEach(doc => {
              newProfiles[doc.id] = doc.data();
            });
          });
          return newProfiles;
        });

      } catch (error) {
        console.error("Error fetching peer profiles:", error);
      }
    };

    fetchRelevantProfiles();
  }, [rooms, user?.uid, activeRoomId]); // removed peerProfiles from dependency array to prevent loop

  const handleJoinRoom = async (roomId, isRequest = false) => {
    try {
      if (isRequest) {
        await requestJoinGroupChat(roomId, user.uid, {
            name: userProfile?.fullName || userProfile?.nickName || user?.displayName || "User",
            photo: userProfile?.photoURL || user?.photoURL || null
        });
        toast.success("Join request sent!");
      } else {
        await joinGroupChat(roomId, user.uid);
        setActiveRoomId(roomId);
        toast.success("Joined group chat!");
      }
    } catch (error) {
      console.error("Join error:", error);
      toast.error(isRequest ? "Failed to send request." : "Failed to join group.");
    }
  };

  const handleLeaveRoom = async (roomId) => {
    try {
      await leaveGroupChat(roomId, user.uid);
      const globalRoom = rooms.find(r => r.type === 'global');
      setActiveRoomId(globalRoom?.id || null);
      toast.success("Left group chat.");
    } catch (error) {
      toast.error("Failed to leave group.");
    }
  };

  const handleCreateRoomSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName?.trim()) return;
    
    setCreatingGroup(true);
    try {
      await createGroupChat(newGroupName.trim(), user.uid);
      toast.success(`Group "${newGroupName}" created!`);
      setShowCreateModal(false);
      setNewGroupName("");
    } catch (error) {
      toast.error("Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
    setShowMobileSidebar(false);
    localStorage.setItem("lastActiveChatRoom", roomId);
    navigate(`/dashboard/chat?room=${roomId}`, { replace: true });
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const userName = userProfile?.fullName || userProfile?.nickName || user?.displayName || "User";

  return (
    <div className="absolute inset-0 flex bg-white dark:bg-black overflow-hidden text-sm">
      <div 
        className={`${showMobileSidebar ? 'flex absolute inset-0 z-20' : 'hidden md:flex'} md:relative flex-col w-full md:w-72 lg:w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0a0a] transition-all`}
      >
        <ChatSidebar 
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={(room) => handleSelectRoom(room.id)}
          onJoinRoom={handleJoinRoom}
          userId={user?.uid}
          userProfile={userProfile}
          peerProfiles={peerProfiles}
          onCreateRoom={() => setShowCreateModal(true)}
          onOpenNovaCall={() => setIsNovaCallOpen(true)}
        />
      </div>

      <div className={`${showMobileSidebar ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden relative bg-white dark:bg-black`}>
        <ChatWindow 
          activeRoom={activeRoom}
          userId={user?.uid}
          userName={userName}
          userPhoto={userProfile?.photoURL || user?.photoURL || null}
          userProfile={userProfile}
          peerProfiles={peerProfiles}
          onLeaveRoom={handleLeaveRoom}
          onMenuClick={() => setShowMobileSidebar(true)}
          groups={groups}
        />
      </div>

      {/* Nova Video Call Modal */}
      <NovaVideoCall 
        isOpen={isNovaCallOpen} 
        onClose={() => setIsNovaCallOpen(false)} 
        activeRoom={activeRoom}
        userId={user?.uid}
      />

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col scale-100 transition-transform">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create New Group</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRoomSubmit} className="p-4 sm:p-5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Group Name</label>
              <input
                type="text"
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Project Avengers"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-400"
                required
              />
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold shadow-md transition-all flex items-center gap-2"
                >
                  {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
