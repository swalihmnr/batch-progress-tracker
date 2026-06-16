import React, { useState, useEffect, useRef } from 'react';
import { X, Send, BookOpen, Loader2, Award } from 'lucide-react';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { TextExamSession } from '../../utils/aiCallService';
import toast from 'react-hot-toast';

export default function EnglishTextExam({ isOpen, onClose, userId }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [summary, setSummary] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [showMalayalam, setShowMalayalam] = useState(false);
    const [showResultButton, setShowResultButton] = useState(false);
    
    const aiMessageCount = messages.filter(m => m.role === 'assistant' && !m.content.includes('[EXAM_COMPLETE]')).length;
    const currentQuestion = Math.max(1, Math.min(5, aiMessageCount));
    
    // Find the highest question number asked so far by looking for [Q1]...[Q5] tags.
    const lastQIndex = messages.slice().reverse().findIndex(m => m.role === 'assistant' && (m.content.includes('[Q1]') || m.content.includes('[Q2]') || m.content.includes('[Q3]') || m.content.includes('[Q4]') || m.content.includes('[Q5]')));
    let displayQuestion = currentQuestion;
    if (lastQIndex !== -1) {
        const msg = messages[messages.length - 1 - lastQIndex].content;
        if (msg.includes('[Q5]')) displayQuestion = 5;
        else if (msg.includes('[Q4]')) displayQuestion = 4;
        else if (msg.includes('[Q3]')) displayQuestion = 3;
        else if (msg.includes('[Q2]')) displayQuestion = 2;
        else if (msg.includes('[Q1]')) displayQuestion = 1;
    }
    
    const QUESTION_STAGES = [
        'Grammar Assessment', 
        'Vocabulary Test', 
        'Reading Comprehension', 
        'Error Correction', 
        'Idioms & Nuance'
    ];
    const currentStageName = QUESTION_STAGES[displayQuestion - 1] || QUESTION_STAGES[4];

    const sessionRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Cleanup on unmount or close
        return () => {
            if (!isOpen) {
                sessionRef.current = null;
                setMessages([]);
                setSummary(null);
                setSelectedLevel(null);
                setShowResultButton(false);
            }
        };
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectLevel = async (level) => {
        setSelectedLevel(level);
        sessionRef.current = new TextExamSession();
        setIsLoading(true);
        const response = await sessionRef.current.sendMessage(`I claim to be at the '${level}' level. I am ready to begin my placement exam. Please verify my level.`);
        setMessages([{ role: 'assistant', content: response }]);
        setIsLoading(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userText = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        const aiResponse = await sessionRef.current.sendMessage(userText);
        
        if (aiResponse.includes('[EXAM_COMPLETE]')) {
            const preText = aiResponse.replace('[EXAM_COMPLETE]', '').trim();
            if (preText) {
                setMessages(prev => [...prev, { role: 'assistant', content: preText }]);
                setIsLoading(false);
                setShowResultButton(true);
            } else {
                await handleFinishExam();
            }
        } else {
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
            setIsLoading(false);
        }
    };

    const handleFinishExam = async () => {
        setIsGeneratingSummary(true);
        try {
            const finalSummary = await sessionRef.current.generateSummary();
            setSummary(finalSummary);
            
            // Save to Firebase
            if (userId) {
                const historyRef = collection(db, "users", userId, "novaHistory");
                await addDoc(historyRef, {
                    score: finalSummary.score,
                    feedback: finalSummary.feedback,
                    malayalamFeedback: finalSummary.malayalamFeedback || null,
                    pointsEarned: finalSummary.pointsEarned,
                    level: finalSummary.level,
                    stages: finalSummary.stages || null,
                    type: 'text_exam',
                    createdAt: serverTimestamp()
                });

                const userRef = doc(db, "users", userId);
                await setDoc(userRef, { novaLevel: finalSummary.level }, { merge: true });
                localStorage.setItem(`novaLevel_${userId}`, finalSummary.level);
            }
        } catch (err) {
            console.error("Failed to generate summary:", err);
            toast.error("Failed to grade exam.");
        } finally {
            setIsGeneratingSummary(false);
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-fadeIn">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">English Placement Exam</h3>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Text & Reading Comprehension</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Timeline / Progress Bar */}
                {selectedLevel && !summary && !isGeneratingSummary && (
                    <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm z-10">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            <span className="flex items-center gap-2">
                                Question {displayQuestion} of 5 
                                <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-indigo-500 dark:text-indigo-400 normal-case tracking-normal">
                                    {currentStageName}
                                </span>
                            </span>
                            <span className="text-indigo-500">{Math.round((displayQuestion / 5) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${(displayQuestion / 5) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50 dark:bg-[#0a0a0a]">
                    {!selectedLevel && !summary && (
                        <div className="flex flex-col items-center justify-center h-full animate-fadeIn max-w-lg mx-auto w-full">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 text-center">What is your current level?</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm">Select your self-assessed English level. Nova will verify this during the exam.</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                {['Beginner', 'Intermediate', 'Advanced', 'Pro'].map(lvl => (
                                    <button 
                                        key={lvl}
                                        onClick={() => handleSelectLevel(lvl)}
                                        className="p-4 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl text-left transition-all group"
                                    >
                                        <div className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{lvl}</div>
                                        <div className="text-xs text-slate-500 mt-1">Tap to select</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {summary ? (
                        <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${
                                summary.score < 20 && (selectedLevel === 'Pro' || selectedLevel === 'Advanced') 
                                ? 'bg-red-100 dark:bg-red-500/20 text-red-500 animate-bounce' 
                                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500'
                            }`}>
                                {summary.score < 20 && (selectedLevel === 'Pro' || selectedLevel === 'Advanced') ? (
                                    <span className="text-5xl">🤡</span>
                                ) : (
                                    <Award className="w-12 h-12" />
                                )}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
                                {summary.score < 20 && (selectedLevel === 'Pro' || selectedLevel === 'Advanced') ? 'Oh no...' : 'Exam Graded!'}
                            </h2>
                            <div className={`text-6xl font-black text-transparent bg-clip-text my-6 ${
                                summary.score < 20 && (selectedLevel === 'Pro' || selectedLevel === 'Advanced') 
                                ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                                : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                            }`}>
                                {summary.score} / 100
                            </div>
                            <div className="inline-block px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-6">
                                Actual Level: {summary.level}
                            </div>
                            <p className={`max-w-md leading-relaxed mb-8 text-lg font-medium ${
                                summary.score < 20 && (selectedLevel === 'Pro' || selectedLevel === 'Advanced') 
                                ? 'text-red-500 dark:text-red-400' 
                                : 'text-slate-600 dark:text-slate-400'
                            }`}>
                                {summary.feedback}
                            </p>
                            
                            <button onClick={onClose} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30">
                                View Updated Roadmap
                            </button>
                        </div>
                    ) : isGeneratingSummary ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">Grading your responses...</p>
                        </div>
                    ) : selectedLevel ? (
                        messages.map((msg, i) => (
                            <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 ${
                                    msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm'
                                }`}>
                                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                                        {msg.content.replace(/\[Q[1-5]\]\s*/g, '')}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : null}
                    {isLoading && !isGeneratingSummary && (
                        <div className="flex w-full justify-start">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {selectedLevel && !summary && !isGeneratingSummary && (
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        {showResultButton ? (
                            <button 
                                onClick={() => {
                                    setShowResultButton(false);
                                    handleFinishExam();
                                }}
                                className="w-full h-[50px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center transition-all shadow-md gap-2"
                            >
                                <Award className="w-5 h-5" /> View Exam Result
                            </button>
                        ) : (
                            <form onSubmit={handleSend} className="relative flex items-end gap-2">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-h-[50px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none custom-scrollbar text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend(e);
                                        }
                                    }}
                                    disabled={isLoading}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputValue.trim() || isLoading}
                                    className="h-[50px] px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0 shadow-md"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
