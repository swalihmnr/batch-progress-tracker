import React, { useEffect } from 'react';
import { useNovaCall } from '../../hooks/useNovaCall';
import { X, Mic, MicOff, PhoneOff, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../firebase/firebaseConfig';
import { doc, setDoc, increment } from 'firebase/firestore';

export default function NovaVideoCall({ isOpen, onClose, activeRoom, userId }) {
  const {
    isActive,
    timeLeft,
    status,
    transcript,
    summary,
    isMuted,
    hasError,
    userAudioLevel,
    startCall,
    endCall,
    toggleMute
  } = useNovaCall();

  // Watch for summary generation to add points
  useEffect(() => {
    if (summary && summary.pointsEarned > 0 && activeRoom?.groupId && userId) {
      const addPoint = async () => {
        try {
          const pointRef = doc(db, "groups", activeRoom.groupId, "englishKick", userId);
          await setDoc(pointRef, { points: increment(1) }, { merge: true });
          toast.success("Added 1 English Kick point for your effort!");
        } catch (err) {
          console.error("Failed to add point:", err);
        }
      };
      addPoint();
    }
  }, [summary, activeRoom?.groupId, userId]);

  // Start call automatically when modal opens
  useEffect(() => {
    if (isOpen && !isActive && !summary && status !== 'complete') {
      startCall();
    }
    // Cleanup if closed abruptly
    return () => {
      if (isActive) endCall();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderActiveCall = () => (
    <div className="flex flex-col items-center justify-between h-full w-full p-6 relative overflow-hidden">
      
      {/* Premium Minimalist Voice UI */}
      <div className="absolute inset-0 z-0 bg-[#0a0f1c] flex items-center justify-center overflow-hidden">
        {/* Core AI Orb */}
        <div className="relative flex items-center justify-center w-64 h-64">
          {/* Base ambient glow */}
          <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full"></div>
          
          {/* Audio reactive rings */}
          {status === 'listening' || status === 'speaking' ? (
            <>
              {/* Outer reactive ring */}
              <div 
                className="absolute inset-0 bg-gradient-to-tr from-indigo-500/40 to-purple-500/40 rounded-full blur-2xl transition-all duration-75 ease-out"
                style={{ 
                  transform: `scale(${1 + (userAudioLevel / 50)})`,
                  opacity: 0.3 + (userAudioLevel / 100)
                }}
              ></div>
              
              {/* Inner intense core */}
              <div 
                className={`absolute w-32 h-32 rounded-full blur-xl transition-all duration-100 ease-out ${status === 'speaking' ? 'bg-indigo-400/80 animate-pulse' : 'bg-emerald-400/60'}`}
                style={{ 
                  transform: `scale(${1 + (userAudioLevel / 100)})` 
                }}
              ></div>
            </>
          ) : (
            <div className="absolute w-32 h-32 bg-slate-700/30 rounded-full blur-xl animate-pulse"></div>
          )}

          {/* Center node */}
          <div className={`relative w-16 h-16 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center backdrop-blur-md border ${status === 'speaking' ? 'bg-indigo-500/20 border-indigo-400/50' : status === 'listening' ? 'bg-emerald-500/20 border-emerald-400/50' : 'bg-slate-800/50 border-slate-700'}`}>
             <Sparkles className={`w-6 h-6 ${status === 'speaking' ? 'text-indigo-300' : status === 'listening' ? 'text-emerald-300' : 'text-slate-500'}`} />
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="absolute top-6 right-6 px-4 py-2 bg-slate-900/60 rounded-full border border-slate-700/50 backdrop-blur-md text-white font-mono text-xl tracking-wider shadow-lg z-20">
        {formatTime(timeLeft)}
      </div>

      <div className="absolute top-6 left-6 text-white/50 text-sm font-medium uppercase tracking-widest z-20 bg-slate-900/40 px-3 py-1 rounded-lg backdrop-blur-md">
        Nova Call Session
      </div>

      {/* Spacer to push content down */}
      <div className="flex-1 w-full"></div>

      {/* Status & Transcript Area */}
      <div className="z-20 w-full max-w-2xl flex flex-col items-center justify-center text-center px-6 py-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl mb-6">
        <p className="text-indigo-300 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
          {status === 'listening' && <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Listening...</>}
          {status === 'processing' && <><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Thinking...</>}
          {status === 'speaking' && <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Speaking</>}
          {status === 'idle' && 'Waiting...'}
        </p>
        <p className="text-white/90 text-lg md:text-xl font-medium max-w-2xl min-h-[3rem] flex items-center justify-center">
          {transcript ? `"${transcript}"` : "..."}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 pb-4 z-20">
        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isMuted ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 border border-rose-500/30' : 'bg-slate-700/70 text-white hover:bg-slate-600/70 border border-slate-600/50'} backdrop-blur-xl`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button 
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105 border border-rose-500"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center animate-fadeIn">
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-emerald-400" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Session Complete!</h2>
      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-emerald-400 my-6">
        {summary.score} <span className="text-2xl text-slate-400">/ 100</span>
      </div>
      <p className="text-slate-300 text-lg max-w-lg mb-8 leading-relaxed">
        {summary.feedback}
      </p>
      {summary.pointsEarned > 0 && (
        <div className="mb-8 px-6 py-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          You earned 1 English Kick point!
        </div>
      )}
      <button 
        onClick={onClose}
        className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors"
      >
        Close & Return to Chat
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={status === 'complete' ? onClose : undefined}></div>
      
      {/* Modal Container */}
      <div className="relative w-full h-full max-w-5xl max-h-[800px] bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {hasError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {/* Background ambient glow for error state */}
            <div className="absolute inset-0 z-0 bg-[#0a0f1c] flex items-center justify-center">
                <div className="w-96 h-96 bg-rose-500/5 blur-[120px] rounded-full"></div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Browser Not Supported</h3>
            <p className="text-slate-400 mb-6 max-w-md">Your browser does not support the Web Speech API required for this feature. Please try Chrome or Edge.</p>
            <button onClick={onClose} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors">Close</button>
          </div>
        ) : status === 'complete' && summary ? (
          renderSummary()
        ) : (
          renderActiveCall()
        )}
      </div>
    </div>
  );
}
