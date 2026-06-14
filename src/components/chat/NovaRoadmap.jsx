import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { X, Map, Target, TrendingUp, Sparkles, BookOpen, MessageCircle, Star, Award, Trophy, CheckCircle, Navigation, Info, PlayCircle, Lock, Activity, BarChart2, Languages, Zap } from 'lucide-react';
import EnglishTextExam from './EnglishTextExam';

const DAILY_KICKS = [
    {
        word: "Resilient",
        meaning: "Able to withstand or recover quickly from difficult conditions.",
        dialogue: [
            { speaker: "A", text: "How is she handling the project failure?" },
            { speaker: "B", text: "She's incredibly resilient. She already drafted a new plan this morning." }
        ]
    },
    {
        word: "Articulate",
        meaning: "Having or showing the ability to speak fluently and coherently.",
        dialogue: [
            { speaker: "A", text: "What did you think of the new manager's presentation?" },
            { speaker: "B", text: "He is very articulate. Everything he said was crystal clear." }
        ]
    },
    {
        word: "Nuance",
        meaning: "A subtle difference in or shade of meaning, expression, or sound.",
        dialogue: [
            { speaker: "A", text: "Did they understand your joke?" },
            { speaker: "B", text: "Not really, they missed the nuance of the cultural reference." }
        ]
    },
    {
        word: "Candid",
        meaning: "Truthful and straightforward; frank.",
        dialogue: [
            { speaker: "A", text: "Can I get your honest opinion on my resume?" },
            { speaker: "B", text: "To be completely candid, it needs a lot of work." }
        ]
    },
    {
        word: "Ambiguous",
        meaning: "Open to more than one interpretation; not clear.",
        dialogue: [
            { speaker: "A", text: "Are we supposed to start the task today or tomorrow?" },
            { speaker: "B", text: "I don't know, the email was very ambiguous." }
        ]
    }
];

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
        description: 'Building the foundation. Focus on basic vocabulary and simple sentence structures.',
        evaluation: 'You are starting to grasp basic English concepts, but might struggle with forming complete sentences or understanding native speakers. This is the perfect time to build a strong foundation!',
        milestones: [
            'Learn the 100 most common English words.',
            'Master basic present, past, and future tenses.',
            'Practice introducing yourself and asking simple questions.'
        ]
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
        description: 'Growing confidence. Engaging in everyday conversations with fewer hesitations.',
        evaluation: 'You can hold everyday conversations and express your thoughts! You might still make grammatical errors or pause to find the right words, but your communication is becoming much clearer.',
        milestones: [
            'Expand vocabulary with common phrasal verbs and idioms.',
            'Improve listening comprehension by consuming English media.',
            'Practice speaking continuously without pausing for mental translation.'
        ]
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
        description: 'Fluid expression. Able to articulate complex thoughts and debate topics smoothly.',
        evaluation: 'Excellent work! You speak smoothly and can handle complex topics. Your grammar is generally solid, but you can still refine your accent and use of nuanced, professional vocabulary.',
        milestones: [
            'Master complex sentence structures (conditionals, passive voice).',
            'Engage in debates and articulate complex arguments confidently.',
            'Focus on reducing accent and improving natural intonation.'
        ]
    },
    {
        id: 'pro',
        name: 'Fluent Pro',
        minScore: 91,
        maxScore: 100,
        color: 'from-amber-500 to-orange-400',
        bgGlow: 'bg-amber-500/20',
        textColor: 'text-amber-500',
        icon: Trophy,
        description: 'Mastery level. Speaking with near-native fluency, perfect grammar, and rich vocabulary.',
        evaluation: 'You command the English language with near-native proficiency! You express yourself effortlessly, accurately, and fluently in almost any situation, professional or casual.',
        milestones: [
            'Maintain language immersion to preserve fluency.',
            'Explore highly specialized or technical vocabulary.',
            'Mentor others in their English journey.'
        ]
    }
];

export default function NovaRoadmap({ isOpen, onClose }) {
    const { user, userProfile } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [averageScore, setAverageScore] = useState(0);
    const [showExamModal, setShowExamModal] = useState(false);
    const [expandedFeedbackMap, setExpandedFeedbackMap] = useState({});
    const [visibleHistoryCount, setVisibleHistoryCount] = useState(3);
    const [dailyKick, setDailyKick] = useState(null);

    useEffect(() => {
        setDailyKick(DAILY_KICKS[Math.floor(Math.random() * DAILY_KICKS.length)]);
    }, []);

    const toggleExpand = (id) => {
        setExpandedFeedbackMap(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const fetchHistory = async () => {
        if (!user) return;
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
                createdAt: typeof doc.data().createdAt?.toDate === 'function' ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt || Date.now())
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

    useEffect(() => {
        if (!isOpen) return;
        fetchHistory();
    }, [isOpen, user]);

    if (!isOpen) return null;

    const latestCall = history.length > 0 ? history[0] : null;
    const aiLevel = latestCall?.level?.toLowerCase() || 'beginner';
    let currentStageIndex = STAGES.findIndex(stage => stage.id === aiLevel);
    if (currentStageIndex === -1) currentStageIndex = 0;
    
    const currentStage = STAGES[currentStageIndex];

    const userName = userProfile?.nickName || userProfile?.fullName || user?.displayName || "Student";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>

            <div className="relative w-full max-w-7xl h-[95vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-fadeIn">
                
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none transition-colors duration-1000 ${currentStage.bgGlow}`} />
                    
                    <div className="relative z-10 flex items-center gap-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${currentStage.color} text-white shadow-lg`}>
                            <Map className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Nova Proficiency Roadmap</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-1">
                                <Target className="w-4 h-4" /> Gamified English Language Evaluation & Mastery Path
                            </p>
                        </div>
                    </div>
                    
                    <div className="relative z-10 flex items-center gap-3">
                        <button 
                            onClick={() => setShowExamModal(true)} 
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                        >
                            <PlayCircle className="w-5 h-5" />
                            <span className="hidden sm:inline">Start Proficiency Challenge</span>
                            <span className="sm:hidden">Exam</span>
                        </button>
                        <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Evaluating your English proficiency...</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        
                        {/* 1. Evaluation Section */}
                        <div className="p-6 lg:p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="max-w-4xl mx-auto text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Stage Evaluation</span>
                                </div>
                                
                                <h3 className="text-2xl sm:text-3xl font-medium text-slate-600 dark:text-slate-400 mb-4">
                                    {userName}, based on your history, you are currently at the
                                </h3>
                                
                                <div className={`text-6xl sm:text-7xl font-black bg-gradient-to-r ${currentStage.color} bg-clip-text text-transparent drop-shadow-sm mb-6`}>
                                    {currentStage.name} Stage
                                </div>
                                
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-lg text-left max-w-3xl mx-auto relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${currentStage.color}`} />
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl bg-gradient-to-br ${currentStage.color} text-white shadow-md flex-shrink-0 mt-1`}>
                                            <Info className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Communication Profile</h4>
                                            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                                                {currentStage.evaluation}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Average Score</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Award className={`w-5 h-5 ${currentStage.textColor}`} /> {averageScore}/100
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Sessions</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                    <MessageCircle className="w-5 h-5 text-indigo-500" /> {history.length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row min-h-0">
                            {/* 2. Actionable Roadmap Section */}
                            <div className="w-full lg:w-3/5 p-6 lg:p-8 lg:border-r border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <Navigation className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Roadmap to Pro</h3>
                                        <p className="text-sm text-slate-500 font-medium mt-1">Actionable milestones to reach English fluency</p>
                                    </div>
                                </div>

                                <div className="relative pl-6 sm:pl-10 pb-8">
                                    {/* Vertical track */}
                                    <div className="absolute left-6 sm:left-10 top-8 bottom-8 w-1.5 bg-slate-100 dark:bg-slate-800 rounded-full -translate-x-1/2" />
                                    
                                    {/* Fill track */}
                                    <div 
                                        className={`absolute left-6 sm:left-10 bottom-8 w-1.5 bg-gradient-to-t ${currentStage.color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--color-primary),0.5)] -translate-x-1/2`}
                                        style={{ height: currentStageIndex === STAGES.length - 1 ? '100%' : `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
                                    />

                                    <div className="space-y-12">
                                        {STAGES.map((stage, index) => {
                                            const isCompleted = index < currentStageIndex;
                                            const isCurrent = index === currentStageIndex;
                                            const isLocked = index > currentStageIndex;
                                            const StageIcon = stage.icon;

                                            return (
                                                <div key={stage.id} className={`relative ${isLocked ? 'opacity-50' : ''} transition-opacity duration-300`}>
                                                    
                                                    {/* Node */}
                                                    <div className={`absolute left-0 -translate-x-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transform transition-all duration-300 z-10 ${isCurrent ? 'scale-110 shadow-xl border-4' : 'border-2'} ${isCompleted || isCurrent ? `bg-gradient-to-br ${stage.color} text-white` : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                                         style={isCurrent ? { borderColor: 'var(--bg-white, #fff)' } : {}}>
                                                        <StageIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${isCurrent ? 'animate-pulse' : ''}`} />
                                                    </div>

                                                    {/* Content Card */}
                                                    <div className="pl-10 sm:pl-14">
                                                        <div className={`bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border ${isCurrent ? `border-indigo-200 dark:border-indigo-500/30 shadow-xl shadow-indigo-500/5` : 'border-slate-200 dark:border-slate-700 shadow-sm'} transition-all`}>
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h4 className={`text-2xl font-black mb-1 ${isCurrent ? stage.textColor : isCompleted ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                        {isLocked ? stage.name : (latestCall?.stages?.[stage.id]?.name || stage.name)}
                                                                    </h4>
                                                                    <p className={`text-sm font-bold ${isCurrent ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                        Score Goal: {stage.minScore}-{stage.maxScore}
                                                                    </p>
                                                                </div>
                                                                {isCompleted && (
                                                                    <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3" /> Mastered
                                                                    </div>
                                                                )}
                                                                {isCurrent && (
                                                                    <div className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                                                        In Progress
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {isLocked ? (
                                                                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 mt-4">
                                                                    <Lock className="w-6 h-6 text-slate-400 dark:text-slate-500 mb-2" />
                                                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center">Master the previous levels to unlock your custom AI plan for {stage.name}.</p>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                                                                        {latestCall?.stages?.[stage.id]?.description || stage.description}
                                                                    </p>
                                                                    
                                                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                                                                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                            <Target className="w-4 h-4" /> {(latestCall?.stages) ? 'Your AI Action Plan' : 'Required Milestones'}
                                                                        </h5>
                                                                        <ul className="space-y-2">
                                                                            {(latestCall?.stages?.[stage.id]?.milestones || stage.milestones).map((milestone, idx) => {
                                                                                let mText = milestone;
                                                                                let mLink = null;
                                                                                if (typeof milestone === 'object' && milestone !== null) {
                                                                                    mText = milestone.text || milestone.description || milestone.milestone || milestone.title || JSON.stringify(milestone);
                                                                                    mLink = milestone.resource || milestone.url || milestone.link;
                                                                                }
                                                                                return (
                                                                                    <li key={idx} className="flex flex-col gap-1 mb-2">
                                                                                        <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                                                            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCompleted ? 'text-emerald-500' : isCurrent ? 'text-indigo-400 animate-pulse' : 'text-slate-300 dark:text-slate-600'}`} />
                                                                                            <span>{mText}</span>
                                                                                        </div>
                                                                                        {mLink && (
                                                                                            <a href={mLink} target="_blank" rel="noopener noreferrer" className="ml-6 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline flex items-center gap-1">
                                                                                                <Navigation className="w-3 h-3" /> View Recommended Resource
                                                                                            </a>
                                                                                        )}
                                                                                    </li>
                                                                                );
                                                                            })}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Daily Kicks & Performance Insights */}
                            <div className="w-full lg:w-2/5 p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-10">
                                
                                {/* 3. Daily English Kick Section */}
                                {dailyKick && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Daily English Kick</h3>
                                                <p className="text-sm text-slate-500 font-medium mt-1">Vocabulary and practical usage</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-200 to-orange-200 dark:from-amber-900/40 dark:to-orange-900/40 blur-2xl rounded-full opacity-50 -translate-y-1/2 translate-x-1/2" />
                                            
                                            <div className="mb-4">
                                                <h4 className="text-xl font-black text-slate-800 dark:text-white">{dailyKick.word}</h4>
                                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 italic">"{dailyKick.meaning}"</p>
                                            </div>
                                            
                                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <MessageCircle className="w-3.5 h-3.5" /> Dialogue Example
                                                </h5>
                                                <div className="space-y-3">
                                                    {dailyKick.dialogue.map((line, idx) => (
                                                        <div key={idx} className="flex gap-3">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                {line.speaker}
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                                                                {line.text}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 4. Performance Insights Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Performance Insights</h3>
                                        <p className="text-sm text-slate-500 font-medium mt-1">Your exam analytics and AI feedback</p>
                                    </div>
                                </div>

                                {/* Analytics Cards */}
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center text-center">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 mb-2">
                                            <BarChart2 className="w-5 h-5" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 dark:text-white">{history.length}</div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Exams Taken</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center text-center">
                                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                                            <Target className="w-5 h-5" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 dark:text-white">{averageScore}/100</div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Average Score</div>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-indigo-500" /> Recent Feedback
                                </h4>

                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                                            <Sparkles className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium px-4">Take your first placement exam to receive personalized feedback!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {history.slice(0, visibleHistoryCount).map((call) => {
                                            const isExpanded = expandedFeedbackMap[call.id];
                                            const feedbackText = call.feedback || call.summary;
                                            const malayalamText = call.malayalamFeedback;
                                            const fullTextLength = (feedbackText ? feedbackText.length : 0) + (malayalamText ? malayalamText.length : 0);
                                            const needsExpansion = fullTextLength > 200;
                                            
                                            return (
                                                <div key={call.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group">
                                                    {/* Score Banner */}
                                                    <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-black ${Number(call.score) >= 75 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : Number(call.score) >= 40 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                                        SCORE: {call.score}
                                                    </div>

                                                    <div className="mb-3 pr-20">
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                            {call.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                                                                Level: {call.level || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 mt-2 space-y-3">
                                                        <p className={`text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium ${!isExpanded && needsExpansion ? 'line-clamp-3' : ''}`}>
                                                            {feedbackText}
                                                        </p>
                                                        {malayalamText && (
                                                            <div className={`p-3 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100/50 dark:border-indigo-500/20 relative mt-3`}>
                                                                <div className="absolute -top-2 left-3 bg-slate-50 dark:bg-slate-900 px-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Feedback</div>
                                                                <p className={`text-indigo-800 dark:text-indigo-300 text-sm leading-relaxed whitespace-pre-wrap font-medium mt-1 ${!isExpanded && needsExpansion ? 'line-clamp-3' : ''}`}>
                                                                    {malayalamText}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {needsExpansion && (
                                                            <button 
                                                                onClick={() => toggleExpand(call.id)}
                                                                className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mt-2 hover:underline focus:outline-none"
                                                            >
                                                                {isExpanded ? "Show Less" : "Read More"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {history.length > visibleHistoryCount && (
                                            <button 
                                                onClick={() => setVisibleHistoryCount(prev => prev + 3)}
                                                className="w-full mt-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                                            >
                                                View More History
                                            </button>
                                        )}
                                    </div>
                                )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
            
            <EnglishTextExam 
                isOpen={showExamModal} 
                onClose={() => {
                    setShowExamModal(false);
                    fetchHistory();
                }} 
                userId={user.uid} 
            />
        </div>
    );
}
