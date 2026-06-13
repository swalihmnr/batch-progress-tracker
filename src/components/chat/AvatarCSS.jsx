import React, { useEffect, useRef } from 'react';

export default function AvatarCSS({ isSpeaking, userAudioLevel }) {
  const mouthRef = useRef(null);
  
  useEffect(() => {
    let animationFrame;
    const animateMouth = () => {
      if (mouthRef.current) {
        if (isSpeaking) {
          // Randomize mouth opening to simulate speech syllables
          const randomHeight = 4 + Math.random() * 14; // 4px to 18px
          const randomWidth = 20 + Math.random() * 10; // 20px to 30px
          const randomRadius = 6 + Math.random() * 8;
          mouthRef.current.style.height = `${randomHeight}px`;
          mouthRef.current.style.width = `${randomWidth}px`;
          mouthRef.current.style.borderRadius = `${randomRadius}px`;
          mouthRef.current.style.transform = `translateY(${randomHeight / 4}px)`;
        } else {
           // Closed mouth
          mouthRef.current.style.height = '4px';
          mouthRef.current.style.width = '24px';
          mouthRef.current.style.borderRadius = '4px';
          mouthRef.current.style.transform = `translateY(0px)`;
        }
      }
      // Animate roughly every 80ms for a realistic lip sync speed
      setTimeout(() => {
        animationFrame = requestAnimationFrame(animateMouth);
      }, 80);
    };
    
    animateMouth();
    return () => cancelAnimationFrame(animationFrame);
  }, [isSpeaking]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-end bg-[#0a0f1c] overflow-hidden relative">
      
      {/* Glowing atmospheric background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full z-0"></div>
      {isSpeaking && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/10 blur-[80px] rounded-full animate-pulse z-0"></div>
      )}

      {/* --- Avatar Container --- */}
      <div className="relative flex flex-col items-center w-full max-w-sm mt-20 z-10">
        
        {/* Head / Face */}
        <div className="relative w-40 h-[220px] bg-gradient-to-b from-slate-300 to-slate-400 rounded-[45%_45%_55%_55%] shadow-[inset_0_-15px_30px_rgba(0,0,0,0.3),_0_20px_40px_rgba(0,0,0,0.5)] border border-slate-300/50 overflow-hidden flex flex-col items-center pt-[90px] z-20 transition-transform duration-1000 ease-in-out" style={{ transform: isSpeaking ? 'rotate(-2deg)' : 'rotate(0deg)' }}>
          
          {/* Hair / Hijab styling (Minimalist Elegant) */}
          <div className="absolute top-0 left-0 w-full h-16 bg-slate-900 rounded-t-[50%] shadow-[0_8px_15px_rgba(0,0,0,0.4)] z-30"></div>
          {/* Side draping */}
          <div className="absolute top-12 -left-2 w-10 h-full bg-slate-900 rounded-r-[100%] shadow-lg z-30"></div>
          <div className="absolute top-12 -right-2 w-10 h-full bg-slate-900 rounded-l-[100%] shadow-lg z-30"></div>
          
          {/* Eyes Area */}
          <div className="flex gap-7 mb-9 z-10">
            {/* Left Eye */}
            <div className="relative w-9 h-[18px]">
              <div className="absolute inset-0 bg-slate-900 rounded-[50%_50%_40%_40%] overflow-hidden flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                  {/* Iris */}
                  <div className="w-[10px] h-[10px] bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)] relative">
                     <div className="absolute top-[2px] right-[2px] w-[3px] h-[3px] bg-white rounded-full"></div>
                  </div>
              </div>
              {/* Eyelid (Blinking Animation) */}
              <div className="absolute inset-0 bg-slate-400 rounded-[50%_50%_40%_40%] animate-[cssBlink_4s_infinite] origin-top"></div>
            </div>

            {/* Right Eye */}
            <div className="relative w-9 h-[18px]">
              <div className="absolute inset-0 bg-slate-900 rounded-[50%_50%_40%_40%] overflow-hidden flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                  {/* Iris */}
                  <div className="w-[10px] h-[10px] bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)] relative">
                     <div className="absolute top-[2px] right-[2px] w-[3px] h-[3px] bg-white rounded-full"></div>
                  </div>
              </div>
              {/* Eyelid (Blinking Animation) */}
              <div className="absolute inset-0 bg-slate-400 rounded-[50%_50%_40%_40%] animate-[cssBlink_4s_infinite] origin-top"></div>
            </div>
          </div>

          {/* Nose */}
          <div className="w-2.5 h-8 bg-slate-500/30 rounded-full mb-6 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"></div>

          {/* Mouth (Dynamic CSS Lip Sync) */}
          <div 
            ref={mouthRef}
            className="bg-rose-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_2px_8px_rgba(225,29,72,0.4)] transition-all ease-out z-10 relative overflow-hidden flex justify-center items-end"
            style={{ width: '24px', height: '4px', borderRadius: '4px' }}
          >
            {/* Teeth hint when open */}
            <div className="w-3/4 h-1/3 bg-white/80 rounded-b-full absolute top-0"></div>
          </div>
          
        </div>
        
        {/* Neck */}
        <div className="w-14 h-16 bg-gradient-to-b from-slate-400 to-slate-500 -mt-6 z-10 shadow-[inset_0_10px_10px_rgba(0,0,0,0.4)]"></div>

        {/* Shoulders / Body */}
        <div className="w-[320px] h-48 bg-slate-900 rounded-t-[45%] -mt-8 z-0 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex justify-center relative overflow-hidden">
            {/* Elegant clothing details */}
            <div className="w-40 h-24 bg-slate-800 rounded-b-full shadow-[inset_0_-5px_15px_rgba(0,0,0,0.5)] opacity-50"></div>
        </div>

      </div>

      <style>{`
        @keyframes cssBlink {
          0%, 96%, 100% { transform: scaleY(0); }
          98% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
