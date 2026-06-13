import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { X, Map, Target, TrendingUp, Sparkles, BookOpen, MessageCircle, Star, Award, Trophy, ChevronRight } from 'lucide-react';

const STAGES = [
    {
        id: 'beginner',
        name: 'Beginner',
        minScore: 0,
        maxScore: 39,
        color: 'from-blue-500 to-cyan-400',
        bgGlow: 'bg-blue-500/20',
        textColor: 'text-blue-500',
        icon: BookOpen,
        description: 'Building the foundation. Focus on basic vocabulary and simple sentence structures.'
    },
    {
        id: 'intermediate',
        name: 'Intermediate',
        minScore: 40,
        maxScore: 75,
        color: 'from-emerald-500 to-teal-400',
        bgGlow: 'bg-emerald-500/20',
        textColor: 'text-emerald-500',
        icon: MessageCircle,
        description: 'Growing confidence. Engaging in everyday conversations with fewer hesitations.'
    },
    {
        id: 'advanced',
        name: 'Advanced',
        minScore: 76,
        maxScore: 90,
        color: 'from-violet-500 to-purple-400',
        bgGlow: 'bg-violet-500/20',
        textColor: 'text-violet-500',
        icon: Star,
        description: 'Fluid expression. Able to articulate complex thoughts and debate topics smoothly.'
    },
    {
        id: 'topper',
        name: 'Topper',
        minScore: 91,
        maxScore: 100,
        color: 'from-amber-500 to-orange-400',
        bgGlow: 'bg-amber-500/20',
        textColor: 'text-amber-500',
        icon: Trophy,
        description: 'Mastery level. Speaking with near-native fluency, perfect grammar, and rich vocabulary.'
    }
];

export default function NovaRoadmap({ isOpen, onClose }) {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [averageScore, setAverageScore] = useState(0);

    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "users", user.uid, "novaHistory"),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                }));
                
                setHistory(docs);

                if (docs.length > 0) {
                    const totalScore = docs.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
                    setAverageScore(Math.round(totalScore / docs.length));
                } else {
                    setAverageScore(0);
                }
            } catch (error) {
                console.error("Error fetching Nova history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, user]);

    if (!isOpen) return null;

    const currentStageIndex = STAGES.findIndex(stage => averageScore >= stage.minScore && averageScore <= stage.maxScore);
    const currentStage = STAGES[currentStageIndex !== -1 ? currentStageIndex : 0];

    // Calculate progress to next stage
    let progressToNext = 100;
    let nextStage = null;
    if (currentStageIndex < STAGES.length - 1) {
        nextStage = STAGES[currentStageIndex + 1];
        const stageRange = currentStage.maxScore - currentStage.minScore;
        const scoreIntoStage = averageScore - currentStage.minScore;
        progressToNext = Math.max(0, Math.min(100, (scoreIntoStage / stageRange) * 100));
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>

            <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-fadeIn">
                
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none transition-colors duration-1000 ${currentStage.bgGlow}`} />
                    
                    <div className="relative z-10 flex items-center gap-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${currentStage.color} text-white shadow-lg`}>
                            <Map className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">English Mastery Roadmap</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-1">
                                <Target className="w-4 h-4" /> Based on your Nova AI conversation history
                            </p>
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="relative z-10 p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Analyzing your linguistic journey...</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                        
                        {/* Left Column: Skill Tree Visualizer */}
                        <div className="w-full lg:w-1/2 p-6 sm:p-8 border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar relative">
                            
                            <div className="mb-10 text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-6">
                                    <TrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Your Current Level</span>
                                </div>
                                
                                <div className={`text-6xl sm:text-7xl font-black bg-gradient-to-r ${currentStage.color} bg-clip-text text-transparent drop-shadow-sm mb-4`}>
                                    {currentStage.name}
                                </div>
                                
                                <div className="flex items-center justify-center gap-4 text-slate-600 dark:text-slate-300 text-lg font-medium">
                                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                                        <Award className={`w-5 h-5 ${currentStage.textColor}`} />
                                        Score: <span className="font-bold text-slate-900 dark:text-white">{averageScore}/100</span>
                                    </div>
                                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                                        <MessageCircle className="w-5 h-5 text-indigo-500" />
                                        Sessions: <span className="font-bold text-slate-900 dark:text-white">{history.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* The Roadmap Line */}
                            <div className="relative max-w-sm mx-auto py-8">
                                {/* Vertical track */}
                                <div className="absolute left-8 top-12 bottom-12 w-1.5 bg-slate-100 dark:bg-slate-800 rounded-full" />
                                
                                {/* Fill track */}
                                <div 
                                    className={`absolute left-8 bottom-12 w-1.5 bg-gradient-to-t ${currentStage.color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--color-primary),0.5)]`}
                                    style={{ 
                                        height: currentStageIndex === STAGES.length - 1 ? '100%' : `${(currentStageIndex / (STAGES.length - 1)) * 100}%` 
                                    }}
                                />

                                <div className="space-y-12">
                                    {STAGES.map((stage, index) => {
                                        const isCompleted = index < currentStageIndex;
                                        const isCurrent = index === currentStageIndex;
                                        const isLocked = index > currentStageIndex;
                                        const StageIcon = stage.icon;

                                        return (
                                            <div key={stage.id} className={`relative flex items-center gap-8 ${isLocked ? 'opacity-40' : ''} transition-opacity duration-300`}>
                                                
                                                {/* Node */}
                                                <div className="relative z-10">
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transform transition-all duration-300 ${isCurrent ? 'scale-110 shadow-xl border-2' : ''} ${isCompleted || isCurrent ? `bg-gradient-to-br ${stage.color} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}
                                                         style={isCurrent ? { borderColor: 'white' } : {}}>
                                                        <StageIcon className={`w-8 h-8 ${isCurrent ? 'animate-pulse' : ''}`} />
                                                    </div>
                                                    
                                                    {/* Glow behind current */}
                                                    {isCurrent && (
                                                        <div className={`absolute inset-0 rounded-2xl blur-xl -z-10 ${stage.bgGlow}`} />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className={`flex-1 ${isCurrent ? 'bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700' : ''}`}>
                                                    <h4 className={`text-xl font-bold mb-1 ${isCurrent ? stage.textColor : isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>
                                                        {stage.name}
                                                    </h4>
                                                    <p className={`text-sm ${isCurrent ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
                                                        {stage.minScore} - {stage.maxScore} points
                                                    </p>
                                                    {isCurrent && (
                                                        <div className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                            {stage.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Next Stage Progress */}
                            {nextStage && (
                                <div className="mt-8 max-w-sm mx-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Path to</p>
                                            <p className={`text-lg font-black ${nextStage.textColor}`}>{nextStage.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{nextStage.minScore - averageScore} <span className="text-sm text-slate-500 font-medium">pts needed</span></p>
                                        </div>
                                    </div>
                                    <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full bg-gradient-to-r ${currentStage.color} rounded-full transition-all duration-1000`}
                                            style={{ width: `${progressToNext}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Right Column: History Feed */}
                        <div className="w-full lg:w-1/2 p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Call History</h3>
                            </div>

                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <MessageCircle className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No calls yet</h4>
                                    <p className="text-slate-500 dark:text-slate-400 max-w-xs">Start a conversation with Nova to begin building your English Mastery Roadmap!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((call) => (
                                        <div key={call.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4" /> 
                                                        {call.createdAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Score</span>
                                                    <span className={`text-2xl font-black ${Number(call.score) >= 75 ? 'text-emerald-500' : Number(call.score) >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                        {call.score}/100
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {call.summary && (
                                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Target className="w-4 h-4 text-indigo-500" /> AI Feedback
                                                        </h5>
                                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{call.summary}</p>
                                                    </div>
                                                )}
                                                
                                                {call.transcript && (
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Transcript Snippet</h5>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs italic bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 line-clamp-3">"{call.transcript}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
