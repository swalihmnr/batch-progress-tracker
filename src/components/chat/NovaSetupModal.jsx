import React, { useState, useEffect } from 'react';
import { X, Mic, Code2, Sparkles, Briefcase, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

export default function NovaSetupModal({ isOpen, onClose, onStart }) {
    const [mode, setMode] = useState('practice'); // 'practice' or 'interview'
    const [stack, setStack] = useState('');
    const [topic, setTopic] = useState('');
    const [userLevel, setUserLevel] = useState(null);
    const [isLoadingLevel, setIsLoadingLevel] = useState(true);
    const { user, userProfile } = useAuth();

    useEffect(() => {
        if (isOpen && user?.uid) {
            const fetchUserLevel = async () => {
                try {
                    // Fast path: use real-time userProfile from AuthContext (synced with DB)
                    if (userProfile?.novaLevel) {
                        setUserLevel(userProfile.novaLevel);
                        setIsLoadingLevel(false);
                        return;
                    }

                    // Check local storage as a backup
                    const cachedLevel = localStorage.getItem(`novaLevel_${user.uid}`);
                    if (cachedLevel) {
                        setUserLevel(cachedLevel);
                        setIsLoadingLevel(false);
                        return;
                    }

                    // Fallback to legacy history check for older users who haven't had their level stored on their user doc yet
                    const q = query(
                        collection(db, `users/${user.uid}/novaHistory`),
                        orderBy('createdAt', 'desc'),
                        limit(1)
                    );
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        const level = snapshot.docs[0].data().level;
                        setUserLevel(level);
                        localStorage.setItem(`novaLevel_${user.uid}`, level);
                        await setDoc(doc(db, "users", user.uid), { novaLevel: level }, { merge: true });
                    } else {
                        setUserLevel('beginner'); // default
                    }
                } catch (error) {
                    console.error("Error fetching user level:", error);
                    setUserLevel('beginner');
                } finally {
                    setIsLoadingLevel(false);
                }
            };
            fetchUserLevel();
        }
    }, [isOpen, user, userProfile?.novaLevel]);

    if (!isOpen) return null;

    const isInterviewLocked = false; // Restriction removed as per user request

    const handleStart = () => {
        if (mode === 'interview' && !stack.trim()) return;
        onStart({ mode, stack: stack.trim(), topic: topic.trim() });
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-fadeIn">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        Nova AI Setup
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Select Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMode('practice')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 ${mode === 'practice' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                            >
                                <div className={`p-2 rounded-xl w-fit ${mode === 'practice' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    <Mic className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Casual Practice</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Improve fluency</p>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => !isInterviewLocked && setMode('interview')}
                                disabled={isInterviewLocked || isLoadingLevel}
                                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 relative ${
                                    isInterviewLocked || isLoadingLevel
                                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed opacity-75'
                                        : mode === 'interview' 
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                                }`}
                            >
                                <div className={`p-2 rounded-xl w-fit ${
                                    isInterviewLocked || isLoadingLevel
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                        : mode === 'interview' 
                                            ? 'bg-emerald-500 text-white' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                    {isInterviewLocked && !isLoadingLevel ? <Lock className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${isInterviewLocked ? 'text-slate-500' : 'text-slate-800 dark:text-white'}`}>Mock Interview</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{isInterviewLocked ? 'Requires Intermediate English' : 'Technical grilling'}</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {mode === 'interview' && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <Code2 className="w-4 h-4 text-emerald-500" />
                                    Tech Stack
                                </label>
                                <input
                                    type="text"
                                    value={stack}
                                    onChange={(e) => setStack(e.target.value)}
                                    placeholder="e.g. MERN, Data Science, Flutter"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder-slate-400"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-500" />
                                    Specific Topic (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. React Hooks, Node.js Event Loop"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder-slate-400"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={handleStart}
                        disabled={mode === 'interview' && !stack.trim()}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all ${mode === 'interview' && !stack.trim() ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none' : mode === 'interview' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'}`}
                    >
                        Start {mode === 'interview' ? 'Interview' : 'Call'}
                    </button>
                </div>
            </div>
        </div>
    );
}
