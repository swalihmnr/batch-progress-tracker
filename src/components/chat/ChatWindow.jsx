import { useState, useEffect, useRef } from "react";
import { Send, LogOut, AlignLeft, Smile, PlusCircle, Settings, Hash, User, Users, MessageSquare, UserPlus, CheckCircle, Check, Trophy, ChevronDown, Edit2, Trash2, Info, Loader2, Code2, Flame, X } from "lucide-react";
import { subscribeToMessages, sendMessage, editMessage, deleteMessage, markRoomAsRead } from "../../firebase/chatService";
import { db } from "../../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import EmojiPicker from 'emoji-picker-react';
import { verifyLeetCodeSubmission } from "../../utils/leetcodeApi";
import LeetCodeLeaderboard from "./LeetCodeLeaderboard";

export default function ChatWindow({ activeRoom, userId, userName, userPhoto, userProfile, peerProfiles = {}, onLeaveRoom, onMenuClick, groups = [] }) {
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPolledUsersModal, setShowPolledUsersModal] = useState(null);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  
  // Missing Username Modal State
  const [showMissingUsernameModal, setShowMissingUsernameModal] = useState(false);
  const [pendingPollVote, setPendingPollVote] = useState(null);
  
  // Message Options State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editInputText, setEditInputText] = useState("");
  const [showSeenByModal, setShowSeenByModal] = useState(null);
  const [roomLoadingId, setRoomLoadingId] = useState(null);

  const messagesEndRef = useRef(null);

  const isGlobalOrQad = ['global', '1qad'].includes(activeRoom?.type);
  const isMember = activeRoom?.members?.includes(userId);

  useEffect(() => {
    if (!activeRoom?.id) return;
    
    // Start loading this room, instantly clear old messages
    setRoomLoadingId(activeRoom.id);
    setMessages([]);
    
    // We only subscribe if it's Global, 1QAD, or User is a member
    if (!isGlobalOrQad && !isMember) {
      setRoomLoadingId(null);
      return; 
    }

    const unsubscribe = subscribeToMessages(activeRoom.id, (msgs) => {
      setMessages(msgs);
      setRoomLoadingId(null); // Fully loaded
    });
    
    return () => unsubscribe();
  }, [activeRoom?.id, isGlobalOrQad, isMember]);

  useEffect(() => {
    // Self-healing: If we see a message with a senderPhoto, but the peerProfile doesn't have it,
    // update the database so the sidebar (and other areas) get the photo!
    const missingPhotos = new Map();
    messages.forEach(msg => {
      if (msg.senderId !== userId && msg.senderPhoto) {
        const peer = peerProfiles[msg.senderId];
        if (peer && !peer.photoURL && !missingPhotos.has(msg.senderId)) {
          missingPhotos.set(msg.senderId, msg.senderPhoto);
        }
      }
    });

    if (missingPhotos.size > 0) {
      missingPhotos.forEach((photoUrl, uid) => {
        const userRef = doc(db, "users", uid);
        updateDoc(userRef, { photoURL: photoUrl }).catch(console.error);
        
        // Mutate the local peerProfiles object so it reflects instantly without full page reload
        // React might not re-render immediately for this mutation, but it will be there for the sidebar 
        // when state updates trigger next.
        peerProfiles[uid] = { ...peerProfiles[uid], photoURL: photoUrl };
      });
    }
  }, [messages, peerProfiles, userId]);

  useEffect(() => {
    // Jump to the bottom instantly to avoid glitchy scrolling on load
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    
    // Mark room as read when messages arrive or room is opened
    if (activeRoom?.id && userId) {
      markRoomAsRead(activeRoom.id, userId);
    }
  }, [messages, activeRoom?.id, userId]);

  // Click away listener for message menu
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  const handleSend = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!inputText.trim() || !activeRoom) return;
    
    const textToSend = inputText;
    setInputText("");

    try {
      await sendMessage(activeRoom.id, userId, userName, userPhoto, textToSend);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handlePollVote = async (msg) => {
    try {
      const existingVote = msg.pollResponses?.find(r => r.uid === userId);
      const msgRef = doc(db, `chatRooms/${activeRoom.id}/messages/${msg.id}`);

      if (existingVote) {
        // Undo vote
        await updateDoc(msgRef, {
          pollResponses: arrayRemove(existingVote)
        });
        toast.success("Vote removed");
      } else {
        // Add vote - VERIFY LEETCODE FIRST
        if (!userProfile?.leetcodeUsername) {
            setPendingPollVote(msg);
            setShowMissingUsernameModal(true);
            return;
        }

        const toastId = toast.loading("Verifying with LeetCode...");
        
        try {
            const verificationStatus = await verifyLeetCodeSubmission(userProfile.leetcodeUsername, msg.questionData.url);
            
            if (verificationStatus === "UNVERIFIED") {
                toast.dismiss(toastId);
                toast.error("Not solved recently on LeetCode. Please check your username!");
                return;
            }
            
            toast.dismiss(toastId);
            if (verificationStatus === "LENIENT") {
                toast.success("LeetCode servers down, but we trust you! 🙌");
            }
        } catch (apiError) {
            toast.dismiss(toastId);
            toast.error(apiError.message || "Failed to verify LeetCode submission.");
            return;
        }

        const batchName = groups && groups.length > 0 ? groups[0].name : "No Batch";
        
        const currentStreak = userProfile?.leetcodeStreak || 0;
        const lastSolveStr = userProfile?.lastLeetcodeSolve;
        
        const { calculateNewStreak } = await import("../../utils/streakUtils");
        const { newStreak, isAlreadySolvedToday } = calculateNewStreak(currentStreak, lastSolveStr);

        const pollData = {
          uid: userId || "unknown",
          name: userName || "Unknown User",
          photo: userPhoto || null,
          batch: batchName || "No Batch",
          streak: newStreak
        };
        
        await updateDoc(msgRef, {
          pollResponses: arrayUnion(pollData)
        });

        // Update user profile streak
        if (!isAlreadySolvedToday || currentStreak === 0) {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                leetcodeStreak: newStreak,
                lastLeetcodeSolve: new Date().toISOString()
            });
        }

        toast.success(`Verified! Streak: 🔥 ${newStreak}`);
      }
    } catch (err) {
      console.error("Error toggling poll vote:", err);
      toast.error("Failed to update vote");
    }
  };

  const handleBypassVerification = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!pendingPollVote) {
       toast.error("Error: No pending vote found");
       return;
    }
    
    const msg = pendingPollVote;
    const msgRef = doc(db, `chatRooms/${activeRoom.id}/messages/${msg.id}`);
    const batchName = groups && groups.length > 0 ? groups[0].name : "No Batch";
    
    const pollData = {
      uid: userId || "unknown",
      name: userName || "Unknown User",
      photo: userPhoto || null,
      batch: batchName || "No Batch",
      streak: false // Explicitly false so they don't get the fire icon
    };

    try {
      await updateDoc(msgRef, {
        pollResponses: arrayUnion(pollData)
      });
      toast.success("Marked as done without streak privileges");
      setShowMissingUsernameModal(false);
      setPendingPollVote(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark as done: " + err.message);
    }
  };

  const handleEditSubmit = async (e, msgId) => {
    e.preventDefault();
    if (!editInputText.trim()) return;
    try {
      await editMessage(activeRoom.id, msgId, editInputText);
      setEditingMessage(null);
      toast.success("Message updated");
    } catch (err) {
      console.error("Failed to edit message:", err);
      toast.error("Failed to update message");
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (window.confirm("Delete this message?")) {
      try {
        await deleteMessage(activeRoom.id, msgId);
        toast.success("Message deleted");
      } catch (err) {
        console.error("Failed to delete message:", err);
        toast.error("Failed to delete message");
      }
    }
  };

  const handleOpenSettingsPage = () => {
    navigate(`/dashboard/chat/${activeRoom.id}/settings`);
  };

  const onEmojiClick = (emojiObject) => {
    setInputText(prev => prev + emojiObject.emoji);
  };

  if (!activeRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-black text-slate-500">
        <MessageSquareIcon className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-800" />
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  const isGlobal = activeRoom.type === 'global';
  const isPrivate = activeRoom.type === 'private';
  const isGroup = activeRoom.type === 'group';

  // Pending requests badge: only show to current members of the group
  const pendingCount = (isGroup && activeRoom.members?.includes(userId))
    ? (activeRoom.pendingRequests?.length || 0)
    : 0;
  
  // Resolve Peer Profile for Header

  const handleIconEmojiSelect = async (emojiObject) => {
    if (!isPrivate) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("../../firebase/firebaseConfig");
        const roomRef = doc(db, "chatRooms", activeRoom.id);
        await updateDoc(roomRef, { iconEmoji: emojiObject.emoji, iconUrl: null });
        setShowIconPicker(false);
      } catch (error) {
        console.error("Failed to update icon:", error);
      }
    }
  };

  let displayRoomName = activeRoom.name || "Chat Room";
  let displayRoomIcon = null;

  if (isPrivate) {
    const peerId = activeRoom.members?.find(id => id !== userId);
    const peer = peerProfiles[peerId];
    if (peer) {
      displayRoomName = peer.fullName || peer.nickName || peer.displayName || "Private Chat";
      if (peer.photoURL) {
        displayRoomIcon = <img src={peer.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" />;
      }
    } else {
      displayRoomName = "Private Chat";
    }
  } else if (activeRoom.iconEmoji) {
    displayRoomIcon = <div className="text-2xl flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg">{activeRoom.iconEmoji}</div>;
  } else if (activeRoom.iconUrl) {
    displayRoomIcon = <img src={activeRoom.iconUrl} alt="Group Icon" className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" />;
  }

  if (!displayRoomIcon) {
    displayRoomIcon = activeRoom.type === '1qad' ? (
      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
        <Code2 className="w-4 h-4 text-amber-500" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
        {isGlobal ? <GlobeIcon /> : isPrivate ? <User className="w-4 h-4 text-indigo-500" /> : <HashIcon />}
      </div>
    );
  }

  // Wrap group icon with emoji picker toggle
  if (!isPrivate) {
    displayRoomIcon = (
      <div className="relative group/icon cursor-pointer" onClick={() => setShowIconPicker(!showIconPicker)}>
        <div className="group-hover/icon:opacity-80 transition-opacity">
          {displayRoomIcon}
        </div>
        {showIconPicker && (
          <div className="absolute top-10 left-0 z-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
             <div className="fixed inset-0" onClick={() => setShowIconPicker(false)}></div>
             <div className="relative z-10">
               <EmojiPicker 
                 onEmojiClick={handleIconEmojiSelect}
                 theme="auto"
                 skinTonesDisabled
                 searchDisabled
               />
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden w-full bg-slate-50 dark:bg-black">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        {/* Header - Fixed Height for alignment */}
      <div className="h-[60px] px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm z-10 w-full shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onMenuClick(); }} 
            className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <AlignLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {displayRoomIcon}
            
            <div className="flex flex-col flex-1 w-full min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">
                {activeRoom.type === '1qad' ? '1QAD' : displayRoomName}
              </h3>
              {activeRoom.type !== '1qad' && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                  {isGlobal ? "Global Chat" : isPrivate ? "Direct Message" : `${activeRoom.members?.length || 0} members`}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {activeRoom?.type !== '1qad' && activeRoom?.type !== 'private' && (
            <button
              onClick={() => navigate(`/dashboard/chat/${activeRoom.id}/settings?showMembers=true`)}
              className="flex items-center gap-1.5 px-3 py-1.5 mr-1 text-xs sm:text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors outline-none"
              title="View All Members"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Members</span>
            </button>
          )}
          {/* Pending Requests Bell — only visible to group members */}
          {pendingCount > 0 && (
            <button
              onClick={handleOpenSettingsPage}
              className="relative p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors outline-none shrink-0"
              title={`${pendingCount} pending join ${pendingCount === 1 ? 'request' : 'requests'}`}
            >
              <UserPlus className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            </button>
          )}
          <button
            onClick={handleOpenSettingsPage}
            className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-full transition-colors outline-none shrink-0"
            title="Chat Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          {activeRoom?.type === '1qad' && (
             <button
               onClick={() => setShowMobileLeaderboard(true)}
               className="lg:hidden p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors outline-none shrink-0"
               title="View Streaks"
             >
               <Flame className="w-5 h-5" />
             </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 bg-slate-50/50 dark:bg-black w-full flex flex-col xl:flex-row gap-6 items-start"
        onClick={() => setShowEmojiPicker(false)}
      >
        <div className="flex-1 space-y-4 w-full max-w-full xl:max-w-[calc(100%-400px-1.5rem)]">
        {roomLoadingId === activeRoom?.id ? (
           <div className="h-full w-full"></div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm">
            Say hello to start the conversation!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === userId;
            const timeString = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }) : '';
            
            let showAvatar = true;
            if (idx > 0) {
              const prevMsg = messages[idx - 1];
              if (prevMsg.senderId === msg.senderId) {
                if (msg.timestamp?.toDate && prevMsg.timestamp?.toDate) {
                  const prevTime = prevMsg.timestamp.toDate().getTime();
                  const currTime = msg.timestamp.toDate().getTime();
                  // Group messages sent within 5 minutes (300,000 ms) of each other
                  if (currTime - prevTime < 5 * 60 * 1000) {
                    showAvatar = false;
                  }
                } else if (!msg.timestamp?.toDate && !prevMsg.timestamp?.toDate) {
                  showAvatar = false; // Group optimistic UI messages
                }
              }
            }

            // Resolve Sender Name and Photo from peerProfiles for consistency
            const senderProfile = !isMe ? peerProfiles[msg.senderId] : null;
            const displaySenderName = isMe ? "You" : (senderProfile?.fullName || msg.senderName || "Unknown");
            const avatarName = isMe ? (userName || "User") : displaySenderName;
            const displaySenderPhoto = isMe ? userPhoto : (senderProfile?.photoURL || msg.senderPhoto);

            return (
              <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}>
                <div className={`flex gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar section */}
                  <div className={`w-8 h-8 shrink-0 ${!showAvatar ? 'invisible' : ''}`}>
                    <div 
                        onClick={() => navigate(`/dashboard/profile/${msg.senderId}`)}
                        className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden flex items-center justify-center text-white shadow-sm mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {displaySenderPhoto ? (
                        <img 
                          src={displaySenderPhoto} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=6366f1&color=fff`;
                          }}
                        />
                      ) : (
                        <span className="font-bold text-xs uppercase">{(avatarName).charAt(0)}</span>
                      )}
                    </div>
                  </div>

                  {/* Message Bubble + info */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full min-w-0`}>
                    {showAvatar && (
                      <div className={`flex items-baseline gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span 
                            onClick={() => navigate(`/dashboard/profile/${msg.senderId}`)}
                            className="text-[13px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-500 transition-colors"
                        >
                          {displaySenderName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {timeString}
                        </span>
                      </div>
                    )}
                    
                    <div className={`px-3 py-2 text-[14px] sm:text-[15px] leading-relaxed break-words whitespace-pre-wrap rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-md' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700/50 rounded-tl-md'
                    }`}>
                      {msg.type === '1qad_poll' ? (
                        <div className="flex flex-col gap-4 w-[280px] sm:w-[360px] max-w-[80vw] mt-1 p-3">
                          <div className="flex flex-col gap-2">
                            {msg.questionData ? (
                                <>
                                  <div className="font-bold text-xl text-slate-800 dark:text-white">
                                    <span className="text-slate-500 dark:text-slate-400 font-semibold text-sm block mb-0.5">Question:</span>
                                    {msg.questionData.title}
                                  </div>
                                  <div className="text-sm font-semibold flex items-center gap-2 mt-1">
                                    <span className="text-slate-500 dark:text-slate-400">Difficulty:</span> 
                                    <span className={`${
                                      msg.questionData.difficulty === 'Super Easy' ? 'text-cyan-600 bg-cyan-500/10 dark:text-cyan-400 px-2 py-0.5 rounded-md' :
                                      msg.questionData.difficulty === 'Easy' ? 'text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md' : 
                                      msg.questionData.difficulty === 'Medium' ? 'text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md' : 
                                      'text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md'
                                    }`}>{msg.questionData.difficulty}</span>
                                  </div>
                                  <a href={msg.questionData.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold underline mt-2 break-all flex items-center gap-1 w-fit">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    Solve on LeetCode
                                  </a>
                                </>
                            ) : (
                                <div className="font-semibold text-lg" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                            )}
                          </div>
                          
                          <div className="mt-2">
                            <button 
                              onClick={() => handlePollVote(msg)}
                              className={`${
                                msg.pollResponses?.some(r => r.uid === userId) 
                                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700/80 dark:hover:bg-slate-700 dark:text-slate-300 shadow-inner' 
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                              } font-bold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 w-full`}
                            >
                              {msg.pollResponses?.some(r => r.uid === userId) ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                                  Undo
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5" /> 
                                  Mark as Done
                                </>
                              )}
                            </button>
                          </div>

                          <div 
                            onClick={() => msg.pollResponses?.length > 0 && setShowPolledUsersModal(msg)}
                            className={`flex items-center justify-between gap-3 mt-1 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 rounded-lg p-2 -mx-2 transition-colors group ${msg.pollResponses?.length > 0 ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-2 overflow-hidden shrink-0">
                                {(msg.pollResponses || []).slice(0, 3).map((res, i) => (
                                  <div key={i} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm" title={res.name}>
                                    {res.photo ? <img src={res.photo} alt={res.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-500">{res.name?.charAt(0)?.toUpperCase()}</span>}
                                  </div>
                                ))}
                                {msg.pollResponses?.length > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 flex items-center justify-center shrink-0 shadow-sm z-10">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">+{msg.pollResponses.length - 3}</span>
                                  </div>
                                )}
                                {(!msg.pollResponses || msg.pollResponses.length === 0) && (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 flex items-center justify-center shrink-0 shadow-sm border-dashed">
                                    <Trophy className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                {msg.pollResponses?.length || 0} {(msg.pollResponses?.length === 1) ? 'person' : 'persons'} completed
                              </span>
                            </div>
                            {msg.pollResponses?.length > 0 && (
                              <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 opacity-80 group-hover:opacity-100 transition-opacity">View</span>
                            )}
                          </div>
                        </div>
                      ) : msg.isDeleted ? (
                        <span className="italic text-white/70 dark:text-slate-500 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> {msg.text}</span>
                      ) : editingMessage === msg.id ? (
                        <form onSubmit={(e) => handleEditSubmit(e, msg.id)} className="flex items-center gap-2 min-w-[200px]">
                           <input 
                             type="text" 
                             value={editInputText} 
                             onChange={(e) => setEditInputText(e.target.value)} 
                             className="bg-black/20 border-b border-white/40 focus:border-white outline-none px-1 py-0.5 text-sm w-full text-white" 
                             autoFocus
                           />
                           <button type="button" onClick={() => setEditingMessage(null)} className="p-1 hover:bg-black/20 rounded text-white/80">✕</button>
                           <button type="submit" className="p-1 hover:bg-black/20 rounded text-white"><Check className="w-4 h-4" /></button>
                        </form>
                      ) : (
                        <div className="flex flex-col group/msg relative">
                          <span className="pr-4">{msg.text}</span>
                          {msg.isEdited && <span className="text-[10px] opacity-70 mt-0.5">(edited)</span>}
                          
                          {/* Dropdown Menu Arrow */}
                          {isMe && !msg.isDeleted && (
                            <button
                               onClick={(e) => { e.stopPropagation(); setOpenMenuId(msg.id === openMenuId ? null : msg.id); }}
                               className="absolute -right-2 -top-2 p-1 bg-white/20 hover:bg-white/40 text-white rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity shadow-sm"
                            >
                               <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                          
                          {/* Dropdown Menu */}
                          {openMenuId === msg.id && (
                             <div className="absolute right-0 top-6 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 text-slate-700 dark:text-slate-200 text-sm">
                                <button onClick={() => { setEditingMessage(msg.id); setEditInputText(msg.text); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => { setShowSeenByModal(msg); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
                                  <Info className="w-3.5 h-3.5" /> Seen By
                                </button>
                                <button onClick={() => { handleDeleteMessage(msg.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-rose-600 dark:text-rose-400 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Sticky Leaderboard for 1QAD (Inside Chat) */}
        {activeRoom?.type === '1qad' && (
          <div className="hidden xl:block w-[400px] shrink-0 sticky top-4 z-10">
             <LeetCodeLeaderboard />
          </div>
        )}
      </div>

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-50 shadow-2xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a1a]">
          <EmojiPicker 
            onEmojiClick={onEmojiClick} 
            theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} 
            searchDisabled
            skinTonesDisabled
            height={300}
            width={280}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input Area */}
      {activeRoom?.type === '1qad' ? (
        <div className="p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-slate-800">
          This is a read-only channel for Daily Challenges.
        </div>
      ) : (activeRoom?.members?.includes(userId) || activeRoom?.type === 'global') ? (
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-2 bg-white dark:bg-[#0a0a0a] shrink-0 border-t border-slate-100 dark:border-slate-900">
        <form onSubmit={handleSend} className="relative flex items-end bg-slate-100 dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-inner outline outline-1 outline-transparent focus-within:outline-indigo-500/30 transition-all">
          <button
            type="button"
            className="p-3 mb-0.5 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors shrink-0 outline-none"
            title="Add attachment"
          >
             <PlusCircle className="w-6 h-6" />
          </button>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`Message ${displayRoomName}`}
            className="flex-1 max-h-[50vh] min-h-[48px] py-3.5 bg-transparent border-none text-[15px] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-0 resize-none outline-none leading-tight"
            rows="1"
          />
          <div className="flex items-center pr-2 pb-1 shrink-0 gap-1.5 mb-1">
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
              className="p-1.5 text-slate-400 hover:text-indigo-500 dark:hover:text-amber-400 transition-colors outline-none" 
              title="Emoji"
            >
              <Smile className="w-6 h-6" />
            </button>
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="p-2 mr-1 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-full transition-colors outline-none disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 ml-1" 
            >
              <Send className="w-4 h-4 translate-x-px translate-y-px" />
            </button>
          </div>
        </form>
      </div>
      ) : (
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-2 bg-white dark:bg-[#0a0a0a] shrink-0 border-t border-slate-100 dark:border-slate-900 flex justify-center items-center py-4">
         <p className="text-slate-500 text-sm font-medium">You must join this chat to send messages.</p>
      </div>
      )}

      {/* Polled Users Modal */}
      {showPolledUsersModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col scale-100 transition-transform">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-none">Completed By</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{showPolledUsersModal.questionData?.title}</p>
              </div>
              <button 
                onClick={() => setShowPolledUsersModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors outline-none"
              >
                ✕
              </button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
               {showPolledUsersModal.pollResponses?.map((res, i) => (
                 <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer" onClick={() => { setShowPolledUsersModal(null); navigate(`/dashboard/profile/${res.uid}`); }}>
                   <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 overflow-hidden shrink-0 flex items-center justify-center">
                      {res.photo ? <img src={res.photo} alt={res.name} className="w-full h-full object-cover" /> : <span className="font-bold text-indigo-500 dark:text-indigo-400">{res.name?.charAt(0)?.toUpperCase()}</span>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{res.name}</span>
                        {res.batch && res.batch !== "No Batch" && <span className="text-[11px] text-slate-500 truncate">{res.batch}</span>}
                      </div>
                   </div>
                   {/* STREAK PRIVILEGE VISUAL */}
                   {res.streak !== undefined && res.streak !== false && (
                     <div className="flex items-center gap-1 shrink-0 px-2 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-md border border-amber-200/50 dark:border-amber-500/20" title={`${res.streak} Day LeetCode Streak`}>
                        <span className="font-black text-amber-500 text-sm">{res.streak}</span>
                        <span className="text-sm leading-none">🔥</span>
                     </div>
                   )}
                 </div>
               ))}
               {!showPolledUsersModal.pollResponses?.length && (
                 <div className="py-8 text-center text-sm text-slate-500">
                   No one has completed this yet!
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Missing Username Modal */}
      {showMissingUsernameModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-500/30">
               <Flame className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Streaks Disabled</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
               Please save your LeetCode username in your profile to earn streaks, or continue without them.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { setShowMissingUsernameModal(false); navigate('/dashboard/my-profile'); }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm"
              >
                Go to Profile
              </button>
              <button 
                onClick={handleBypassVerification}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Mark as done without streak
              </button>
              <button 
                onClick={() => { setShowMissingUsernameModal(false); setPendingPollVote(null); }}
                className="mt-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline-offset-4 hover:underline outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seen By Modal */}
      {showSeenByModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col scale-100 transition-transform">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-none">Message Info</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Read by</p>
              </div>
              <button 
                onClick={() => setShowSeenByModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] p-4 flex flex-col gap-3">
              {(() => {
                const readReceipts = activeRoom.readReceipts || {};
                const msgTime = showSeenByModal.timestamp?.toMillis ? showSeenByModal.timestamp.toMillis() : Date.now();
                
                // Use Object.keys(readReceipts) to handle Global/1QAD where members array is empty
                const readerIds = Object.keys(readReceipts).filter(memberId => {
                   if (memberId === userId) return false; // don't show self
                   const readTime = readReceipts[memberId]?.toMillis ? readReceipts[memberId].toMillis() : 0;
                   return readTime >= msgTime;
                });
                
                const readers = readerIds.map(id => peerProfiles[id] || { id, fullName: "User" });

                if (readers.length === 0) {
                  return <div className="py-8 text-center text-sm text-slate-500">No one has read this yet!</div>;
                }

                return readers.map((peer, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 shadow-sm">
                      {peer?.photoURL ? <img src={peer.photoURL} alt={peer.fullName || "User"} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-500 w-full h-full flex items-center justify-center">{peer?.fullName?.charAt(0)?.toUpperCase() || peer?.nickName?.charAt(0)?.toUpperCase() || "U"}</span>}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{peer?.fullName || peer?.nickName || "Unknown User"}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Mobile Leaderboard Slider */}
      {showMobileLeaderboard && activeRoom?.type === '1qad' && (
        <div className="lg:hidden fixed inset-0 z-[60] flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowMobileLeaderboard(false)}></div>
          <div className="relative w-[300px] max-w-[85vw] h-full bg-[#0a0a0a] shadow-2xl flex flex-col translate-x-0 transition-transform duration-300 border-l border-amber-500/20">
            <button 
              onClick={() => setShowMobileLeaderboard(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 h-full pt-16">
               <LeetCodeLeaderboard />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub components
function GlobeIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
}
function HashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-slate-500"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
}
function MessageSquareIcon({className}) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
