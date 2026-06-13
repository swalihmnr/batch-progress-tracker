import { useState, useEffect, useRef, useCallback } from 'react';
import { NovaCallSession } from '../utils/aiCallService';

const CALL_DURATION_SECONDS = 120; // 2 minutes

export function useNovaCall() {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CALL_DURATION_SECONDS);
  const [status, setStatus] = useState('idle'); // idle, listening, speaking, processing, complete
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0);

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(window.speechSynthesis);
  const sessionRef = useRef(null);
  const timerRef = useRef(null);
  
  // Audio Context refs for visualizer
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Sync state for async callbacks
  const stateRef = useRef({ isActive, isMuted, timeLeft, status });
  useEffect(() => {
    stateRef.current = { isActive, isMuted, timeLeft, status };
  }, [isActive, isMuted, timeLeft, status]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error("Speech Recognition API not supported in this browser.");
      setHasError(true);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => setStatus('listening');
    
    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
        handleUserSpeech(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      if (event.error === 'no-speech') {
        // Expected behavior when user pauses. Ignore it, onend will restart.
        return;
      }
      
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'aborted') {
          setStatus('idle');
      }
    };

    recognitionRef.current.onend = () => {
      const current = stateRef.current;
      if (current.status === 'listening' && current.isActive && !current.isMuted) {
        // Automatically restart if we were supposed to be listening and it timed out
        try { recognitionRef.current.start(); } catch (e) {}
      }
    };

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      synthesisRef.current.cancel();
      stopAudioVisualizer();
    };
  }, []);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      microphoneRef.current.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setUserAudioLevel(average); // value between 0 and 255
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (err) {
      console.error("Microphone access denied for visualizer", err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    setUserAudioLevel(0);
  };

  const handleUserSpeech = async (text) => {
    if (!sessionRef.current || status === 'speaking' || status === 'processing') return;
    
    setStatus('processing');
    if (recognitionRef.current) recognitionRef.current.abort(); // Stop listening while processing

    const aiResponse = await sessionRef.current.sendMessage(text);
    
    speakResponse(aiResponse);
  };

  const speakResponse = (text) => {
    if (synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a good English voice
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en-') && (v.name.includes('Female') || v.name.includes('Google'))) || voices.find(v => v.lang.startsWith('en-'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => {
      const current = stateRef.current;
      if (current.isActive && !current.isMuted && current.timeLeft > 0) {
        setStatus('listening');
        try { recognitionRef.current.start(); } catch(e) {}
      } else {
        setStatus('idle');
      }
    };

    synthesisRef.current.speak(utterance);
  };

  const startCall = useCallback(() => {
    if (hasError) return;
    setIsActive(true);
    setTimeLeft(CALL_DURATION_SECONDS);
    setSummary(null);
    setTranscript('');
    setIsMuted(false);
    
    // Immediately update ref so synchronous calls know we are active
    stateRef.current = { ...stateRef.current, isActive: true, isMuted: false, timeLeft: CALL_DURATION_SECONDS };
    
    sessionRef.current = new NovaCallSession();
    
    // Start initial greeting
    speakResponse("Hi! I'm Nova. We have two minutes to practice your English. What would you like to talk about today?");

    // Start Timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start mic volume visualizer
    startAudioVisualizer();
  }, [hasError]);

  const endCall = useCallback(async () => {
    setIsActive(false);
    setStatus('complete');
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) recognitionRef.current.abort();
    synthesisRef.current.cancel();
    stopAudioVisualizer();

    if (sessionRef.current) {
        setStatus('processing'); // processing summary
        const callSummary = await sessionRef.current.generateSummary();
        setSummary(callSummary);
        setStatus('complete');
    }
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      if (recognitionRef.current) recognitionRef.current.abort();
      setStatus('idle');
    } else {
      setStatus('listening');
      try { recognitionRef.current.start(); } catch(e) {}
    }
  };

  return {
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
  };
}
