import { useState, useEffect, useRef } from "react";
import { Send, LogOut, AlignLeft, Smile, PlusCircle, Settings, Hash, User, Users, MessageSquare, UserPlus } from "lucide-react";
import { subscribeToMessages, sendMessage } from "../../firebase/chatService";
import EmojiPicker from 'emoji-picker-react';
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ChatWindow({ activeRoom, userId, userName, userPhoto, peerProfiles = {}, onLeaveRoom, onMenuClick }) {
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!activeRoom?.id) return;
    const unsubscribe = subscribeToMessages(activeRoom.id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [activeRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  } else if (activeRoom.iconUrl) {
    displayRoomIcon = <img src={activeRoom.iconUrl} alt="Group Icon" className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" />;
  }

  if (!displayRoomIcon) {
    displayRoomIcon = (
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
          {isGlobal ? <GlobeIcon /> : isPrivate ? <User className="w-4 h-4 text-indigo-500" /> : <HashIcon />}
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-black h-full overflow-hidden w-full relative">
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
                {displayRoomName}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                {isGlobal ? "Global Chat" : isPrivate ? "Direct Message" : `${activeRoom.members?.length || 0} members`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isGlobal && (
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
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-4 bg-slate-50/50 dark:bg-black w-full"
        onClick={() => setShowEmojiPicker(false)}
      >
        {messages.length === 0 ? (
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
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
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
      {(activeRoom?.members?.includes(userId) || activeRoom?.type === 'global') ? (
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
