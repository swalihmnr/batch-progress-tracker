// import { signOut } from "firebase/auth";
// import { auth, db } from "../firebase/firebaseConfig";
// import { useNavigate, Link, useOutletContext } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, Firestore } from "firebase/firestore";
// import { useEffect, useState } from "react";
// import { calculateScore } from "../utils/calculateScore";
// import Leaderboard from "../components/Leaderboard";


// function Dashboard() {

//     const navigate = useNavigate();
//     const { user } = useAuth();
//     const { group } = useOutletContext();

//     const [showForm, setShowForm] = useState(false);
//     const [formData, setFormData] = useState({
//         moduleNo: "",
//         examStatus: "",
//         linkedinActivity:"",
//         linkedinCount:"",
//         postLink:"",
//     });

//     const [latestUpdates, setLatestUpdates] = useState([]);



//     // to fetch the details of latest members to the Dashboard
//     useEffect(() => { 
//         const fetchLatest = async () => {
//             if (!group) return;

//             const q = query(
//                 collection(db, "groups", group.id, "progress"),
//                 orderBy("createdAt", "desc")
//             );

//             const snapshot = await getDocs(q);

//             const all = snapshot.docs.map(doc => ({
//                 id: doc.id,
//                 ...doc.data()
//             }));

//             // to keep only latest entry per user

//             const map = {};
//             all.forEach(entry => {
//                 if(!map[entry.userId]) {
//                     map[entry.userId] = entry;
//                 }
//             });
//             setLatestUpdates(Object.values(map));
//         };



//         fetchLatest();
//     }, [group]);

//     // handle input change
//     const handleChange = (e) => {
//         setFormData({
//             ...formData,
//             [e.target.name]: e.target.value
//         });
//     };

//     // handle submit
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         // console.log("Progress Data:", formData);
//         // alert("Progress captured");
//         // setShowForm(false);

//         if(!group) {
//             alert("No group found");
//             return;
//         }

//         try {

//             // calculating the scores here 
//             const score = calculateScore(
//                 formData.examStatus,
//                 formData.linkedinActivity,
//             );

//             // storeing score in Firestore
//             await addDoc(collection(db, "groups", group.id, "progress"),
//             {
//                 userId: user.uid,
//                 userName: user.displayName || user.email,
//                 moduleNo: Number(formData.moduleNo),
//                 examStatus: formData.examStatus,
//                 linkedinActivity: formData.linkedinActivity,
//                 linkedinCount: formData.linkedinCount || 0,
//                 postLink: formData.postLink,
//                 score: score,
//                 createdAt: serverTimestamp(),
//             }
//             );

//             alert("Progress saved successfully!");

//             setFormData({
//                 moduleNo: "",
//                 examStatus: "",
//                 linkedinActivity: "",
//                 linkedinCount: "",
//                 postLink: "",
//             });

//             setShowForm(false);
//         } catch (error) {
//             console.error("Save error:", error);
//             alert("Failed tp save progress");
//         }
//     };

//     const handleLogout = async () => {
//         await signOut(auth);
//         navigate("/");
//     };

//     return (

//             <div>
//                 {/* <h1>Dashboard</h1> */}
//                 {/* <h2>Welcome {user?.email}</h2> */}

//                 {group ? (
//                     <h2>Group: {group.groupName}</h2>
//                 ) : (
//                     <p>You are not in any group.</p>
//                 )}
//             {group && <Leaderboard groupId={group.id} />}

//             <h2>Batch Progress</h2>

//             {latestUpdates.length === 0 ? (
//                 <p>No submissions yet</p>
//                 ) : (
//                 <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
//                     <thead>
//                     <tr style={{ borderBottom: "2px solid #555" }}>
//                         <th>S.No</th>
//                         <th>Name</th>
//                         <th>Module</th>
//                         <th>Exam Status</th>
//                         <th>LinkedIn Activity</th>
//                         <th>Connections</th>
//                         <th>Date</th>
//                     </tr>
//                     </thead>

//                     <tbody>
//                     {latestUpdates.map((item, index) => (
//                         <tr key={item.id} style={{ textAlign: "center" }}>
//                         <td>{index + 1}</td>
//                         <td>{item.userName}</td>
//                         <td>{item.moduleNo}</td>
//                         <td>{item.examStatus}</td>
//                         <td>{item.linkedinActivity}</td>
//                         <td>{item.linkedinCount}</td>
//                         <td>
//                             {item.createdAt?.toDate
//                             ? item.createdAt.toDate().toLocaleDateString()
//                             : "—"}
//                         </td>
//                         </tr>
//                     ))}
//                     </tbody>
//                 </table>
//             )}


//             <button onClick={()=> setShowForm(!showForm)}>
//                 {showForm ? "Close Form" : "Add Weekly Progress"}
//             </button>
//             {showForm && (
//                 <form 
//                     onSubmit={handleSubmit}
//                     style={{
//                         marginTop: "20px",
//                         padding: "20px",
//                         border: "1px solid #444",
//                         borderRadius: "8px",
//                         maxWidth: "400px"
//                     }}
//                 >
//                     <h3>Weekly Progress</h3>

//                     <input type="number" name="moduleNo" placeholder="Module Number" value={formData.moduleNo} onChange={handleChange} required />

//                     <br /><br />

//                     <select name="examStatus" value={formData.examStatus} onChange={handleChange} required>

//                         <option value="">Exam Status</option>
//                         <option value="Passed">Passed</option>
//                         <option value="Repeat">Repeat</option>
//                         <option value="Reschedule">Rescheduled</option>

//                     </select>

//                     <br /><br />

//                     <select name="linkedinActivity" value={formData.linkedinActivity} onChange={handleChange} required>

//                         <option value="">Linked Activity</option>
//                         <option value="Posted">Posted</option>
//                         <option value="Commented">Commented</option>
//                         <option value="Shared">Shared</option>
//                         <option value="None">None</option>

//                     </select>
//                     <br /><br />
//                     <input type="number" name="linkedinCount" placeholder="LinkedIn Connection Count" value={formData.linkedinCount} onChange={handleChange} />
//                     <br /><br />
//                     <input type="text" name="postLink" placeholder="Post Link" value={formData.postLink} onChange={handleChange} />
//                     {/* <br /><br />
//                     <textarea  name="suggestions" placeholder="Suggestions" value={formData.suggestions} onChange={handleChange} /> */}
//                     <br /><br />
//                     <button type="submit">Submit Progress</button>


//                 </form>
//             )}
//             <br />

//             <Link to="/dashboard/my-progress"><button>My Progress</button></Link>
//             {/* <button onClick={handleLogout}>Logout</button> */}
//         </div>
//     );
// }

// export default Dashboard;



import { LogOut } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, where, limit, doc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { useEffect, useState } from "react";
import { calculateScore } from "../utils/calculateScore";
import { Activity, Target, LayoutDashboard, CheckCircle2, Medal, Clock, TrendingUp, Users, FileText, BarChart, ExternalLink, ChevronRight, Award, Trophy, Play, Calendar, Zap, AlertCircle, X, Check, UsersIcon, ShieldAlert, Sparkles, Target as TargetIcon, Copy, PlusCircle } from "lucide-react";
import Leaderboard from "../components/Leaderboard";
import KicksBoard from "../components/KicksBoard";
import toast from "react-hot-toast";
import ReminderModal from "../components/ReminderModal";
import NovaRoadmap from "../components/chat/NovaRoadmap";
import { Map } from "lucide-react";

function Dashboard() {
    const { user, userProfile } = useAuth();
    const { group, groups, selectGroup } = useOutletContext();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [showNovaRoadmap, setShowNovaRoadmap] = useState(false);
    const [showReminder, setShowReminder] = useState(false);
    const [formData, setFormData] = useState({
        moduleNo: "",
        examStatus: "",
        linkedinActivity: "",
        linkedinCount: "",
        postLink: "",
    });

    const [latestUpdates, setLatestUpdates] = useState([]);
    const [copiedContent, setCopiedContent] = useState(false);

    // Track analytics
    useEffect(() => {
        if (group?.id && user?.uid) {
            const visitKey = `visited_${group.id}`;
            // Allow logging one view per hour to build the time-series graph
            const lastVisit = sessionStorage.getItem(visitKey);
            const now = Date.now();

            let lastVisitTime = 0;
            if (lastVisit === 'true') {
                lastVisitTime = 0; // Force update if they have the old format
            } else if (lastVisit) {
                lastVisitTime = parseInt(lastVisit) || 0;
            }

            if (!lastVisit || (now - lastVisitTime) > 3600000) { // 1 hour cooldown
                sessionStorage.setItem(visitKey, now.toString());

                // Add view event to subcollection for chart
                addDoc(collection(db, 'groups', group.id, 'views'), {
                    userId: user.uid,
                    userName: userProfile?.nickName || userProfile?.fullName || user?.displayName || user?.email || "Unknown User",
                    timestamp: serverTimestamp()
                }).catch(err => console.error("Analytics event error:", err));

                // Still increment total stats for the quick cards
                const groupRef = doc(db, 'groups', group.id);
                updateDoc(groupRef, {
                    totalViews: increment(1),
                    visitedBy: arrayUnion(user.uid)
                }).catch(err => console.error("Analytics total error:", err));
            }
        }
    }, [group?.id, user?.uid, userProfile]);

    const handleCopyCode = () => {
        if (group?.groupCode) {
            navigator.clipboard.writeText(group.groupCode);
            setCopiedContent(true);
            toast.success("Batch code copied!");
            setTimeout(() => setCopiedContent(false), 2000);
        } else if (group?.id) {
            navigator.clipboard.writeText(group.id);
            setCopiedContent(true);
            toast.success("Batch code copied!");
            setTimeout(() => setCopiedContent(false), 2000);
        }
    };

    // Timeline State Options
    const [timelineData, setTimelineData] = useState([]);

    const checkWeeklyProgress = async (groupId, userId) => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday

        const lastSaturday = new Date(now);
        if (dayOfWeek === 6) { // It's Saturday
            lastSaturday.setHours(0, 0, 0, 0);
        } else {
            const daysToSubtract = (dayOfWeek + 1);
            lastSaturday.setDate(now.getDate() - daysToSubtract);
            lastSaturday.setHours(0, 0, 0, 0);
        }

        const weeklyProgressQuery = query(
            collection(db, "groups", groupId, "progress"),
            where("userId", "==", userId)
        );

        let weeklySnapshot;
        try {
            weeklySnapshot = await getDocs(weeklyProgressQuery);
        } catch (error) {
            console.warn("Failed to check weekly progress:", error);
            return;
        }
        
        const hasRecentProgress = weeklySnapshot.docs.some(doc => {
            const data = doc.data();
            return data.createdAt && data.createdAt.toDate() >= lastSaturday;
        });

        if (!hasRecentProgress) {
            const reminderDismissed = sessionStorage.getItem(`reminder_dismissed_${userId}`);
            if (!reminderDismissed) {
                setShowReminder(true);
            }
        }
    };

    const closeReminder = () => {
        setShowReminder(false);
        sessionStorage.setItem(`reminder_dismissed_${user.uid}`, 'true');
    };

    const handleLogNow = () => {
        setShowReminder(false);
        setShowForm(true);
    };

    useEffect(() => {
        const fetchLatest = async () => {
            if (!group) return;

            const q = query(
                collection(db, "groups", group.id, "progress"),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(q);

            const all = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Fetch users to map the latest name and emojis
            const usersSnap = await getDocs(collection(db, "users"));
            const userDocsMap = {};
            usersSnap.docs.forEach(d => {
                const data = d.data();
                userDocsMap[d.id] = {
                    name: data?.nickName || data?.fullName || data?.displayName || data?.email || "Unknown",
                    emoji: data?.emoji || "",
                    photoURL: data?.photoURL || null
                };
            });

            const map = {};
            all.forEach(entry => {
                if (!userDocsMap[entry.userId]) return;
                if (!map[entry.userId]) {
                    entry.userName = userDocsMap[entry.userId].name;
                    entry.emoji = userDocsMap[entry.userId].emoji;
                    entry.photoURL = userDocsMap[entry.userId].photoURL;
                    map[entry.userId] = entry;
                }
            });
            const finalUpdates = Object.values(map);
            finalUpdates.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setLatestUpdates(finalUpdates);

            // Timeline Calculation for all group members
            const allTimelinesMap = {};
            (group.members || [])
                .filter(memberId => userDocsMap[memberId])
                .forEach(memberId => {
                    const userInfo = userDocsMap[memberId];
                    allTimelinesMap[memberId] = {
                        userId: memberId,
                        userName: userInfo.name,
                        emoji: userInfo.emoji || "",
                        photoURL: userInfo.photoURL || null,
                        highestModule: 0,
                        highestPassedModule: 0,
                        delays: 0,
                        latestDate: null
                    };
                });

            all.forEach(entry => {
                if (!userDocsMap[entry.userId]) return;
                if (!allTimelinesMap[entry.userId]) {
                    const userInfo = userDocsMap[entry.userId];
                    allTimelinesMap[entry.userId] = {
                        userId: entry.userId,
                        userName: userInfo.name,
                        emoji: userInfo.emoji || "",
                        photoURL: userInfo.photoURL || null,
                        highestModule: 0,
                        highestPassedModule: 0,
                        delays: 0,
                        latestDate: null
                    };
                }
                const stats = allTimelinesMap[entry.userId];
                if (entry.moduleNo > stats.highestModule) {
                    stats.highestModule = entry.moduleNo;
                }
                if (entry.examStatus === "Passed" && entry.moduleNo > stats.highestPassedModule) {
                    stats.highestPassedModule = entry.moduleNo;
                }
                if (entry.createdAt) {
                    const entryDate = entry.createdAt.toDate();
                    if (!stats.latestDate || entryDate > stats.latestDate) {
                        stats.latestDate = entryDate;
                    }
                }
                if (entry.examStatus === "Repeat" || entry.examStatus === "Reschedule") {
                    stats.delays += 1;
                }
            });

            const timelineArray = Object.values(allTimelinesMap).map(stats => {
                const currentModule = Math.max(stats.highestModule, stats.highestPassedModule + 1);
                const remainingModules = Math.max(0, 52 - (currentModule - 1));

                let expectedDate = stats.latestDate ? new Date(stats.latestDate) : new Date();
                const now = new Date();
                const weeksSinceLastLog = stats.latestDate ? Math.floor((now - stats.latestDate) / (1000 * 60 * 60 * 24 * 7)) : 0;

                if (remainingModules > 0) {
                    const fullCycles = Math.floor(remainingModules / 6);
                    const singleModules = remainingModules % 6;

                    // Step 3: Add cycle days (49 days for 6 modules)
                    expectedDate.setDate(expectedDate.getDate() + (fullCycles * 49));

                    // Step 4: Handle remainder modules individually + delays + unlogged weeks
                    for (let i = 0; i < singleModules + stats.delays + weeksSinceLastLog; i++) {
                        expectedDate.setDate(expectedDate.getDate() + 8);
                        // Shift if landing on Sunday (0)
                        if (expectedDate.getDay() === 0) {
                            expectedDate.setDate(expectedDate.getDate() + 1);
                        }
                    }
                }

                return {
                    ...stats,
                    expectedEndDate: expectedDate,
                    remainingDays: "Calculated",
                    weeksSinceLastLog
                };
            });

            timelineArray.sort((a, b) => a.expectedEndDate - b.expectedEndDate);
            setTimelineData(timelineArray);

            if (user && group) {
                checkWeeklyProgress(group.id, user.uid);
            }
        };

        fetchLatest();
    }, [group, user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!group) {
            toast.error("No group found");
            return;
        }

        if (formData.linkedinActivity === "Posted" && !formData.postLink.trim()) {
            toast.error("Please provide the LinkedIn Post Link.");
            return;
        }

        try {
            // Check connection count and module rules
            const currentLinkedinCount = Number(formData.linkedinCount || 0);
            if (currentLinkedinCount < 0) {
                toast.error("Connection count cannot be negative.");
                return;
            }

            const allUserProgressQuery = query(
                collection(db, "groups", group.id, "progress"),
                where("userId", "==", user.uid)
            );
            const allUserProgressDocs = await getDocs(allUserProgressQuery);

            let maxConnectionCount = 0;
            let hasPassedThisModule = false;

            allUserProgressDocs.forEach(doc => {
                const data = doc.data();
                if (data.linkedinCount > maxConnectionCount) {
                    maxConnectionCount = data.linkedinCount;
                }
                if (data.moduleNo === Number(formData.moduleNo)) {
                    if (data.examStatus === "Passed") hasPassedThisModule = true;
                }
            });

            // If user provided a connection count, check if it's not less than max previous
            if (formData.linkedinCount !== "" && currentLinkedinCount < maxConnectionCount) {
                toast.error(`Connection count cannot be less than your previous count (${maxConnectionCount}).`);
                return;
            }

            if (hasPassedThisModule && formData.examStatus === "Passed") {
                toast.error(`You have already passed Module ${formData.moduleNo}.`);
                return;
            }

            const score = calculateScore(
                formData.examStatus,
                formData.linkedinActivity,
            );

            await addDoc(collection(db, "groups", group.id, "progress"), {
                userId: user.uid,
                userName: userProfile?.nickName || userProfile?.fullName || user.displayName || user.email,
                moduleNo: Number(formData.moduleNo),
                examStatus: formData.examStatus,
                linkedinActivity: formData.linkedinActivity,
                linkedinCount: formData.linkedinCount || 0,
                postLink: formData.postLink,
                score: score,
                createdAt: serverTimestamp(),
            });



            setFormData({
                moduleNo: "",
                examStatus: "",
                linkedinActivity: "",
                linkedinCount: "",
                postLink: "",
            });

            setShowForm(false);

            // Re-fetch latest updates immediately
            const q = query(collection(db, "groups", group.id, "progress"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const usersSnap = await getDocs(collection(db, "users"));
            const userDocsMap = {};
            usersSnap.docs.forEach(d => {
                const data = d.data();
                userDocsMap[d.id] = {
                    name: data?.nickName || data?.fullName || data?.displayName || data?.email || "Unknown",
                    emoji: data?.emoji || "",
                    photoURL: data?.photoURL || null
                };
            });

            const map = {};
            const allTimelinesMap = {};

            (group.members || [])
                .filter(memberId => userDocsMap[memberId])
                .forEach(memberId => {
                    const userInfo = userDocsMap[memberId];
                    allTimelinesMap[memberId] = {
                        userId: memberId,
                        userName: userInfo.name,
                        emoji: userInfo.emoji || "",
                        photoURL: userInfo.photoURL || null,
                        highestModule: 0,
                        highestPassedModule: 0,
                        delays: 0,
                        latestDate: null
                    };
                });

            all.forEach(entry => {
                if (!userDocsMap[entry.userId]) return;
                if (!map[entry.userId]) {
                    entry.userName = userDocsMap[entry.userId].name;
                    entry.emoji = userDocsMap[entry.userId].emoji;
                    entry.photoURL = userDocsMap[entry.userId].photoURL;
                    map[entry.userId] = entry;
                }

                if (!allTimelinesMap[entry.userId]) {
                    const userInfo = userDocsMap[entry.userId];
                    allTimelinesMap[entry.userId] = {
                        userId: entry.userId,
                        userName: userInfo.name,
                        emoji: userInfo.emoji || "",
                        photoURL: userInfo.photoURL || null,
                        highestModule: 0,
                        highestPassedModule: 0,
                        delays: 0,
                        latestDate: null
                    };
                }
                const stats = allTimelinesMap[entry.userId];
                if (entry.moduleNo > stats.highestModule) {
                    stats.highestModule = entry.moduleNo;
                }
                if (entry.examStatus === "Passed" && entry.moduleNo > stats.highestPassedModule) {
                    stats.highestPassedModule = entry.moduleNo;
                }
                if (entry.createdAt) {
                    const entryDate = entry.createdAt.toDate();
                    if (!stats.latestDate || entryDate > stats.latestDate) {
                        stats.latestDate = entryDate;
                    }
                }
                if (entry.examStatus === "Repeat" || entry.examStatus === "Reschedule") {
                    stats.delays += 1;
                }
            });

            const finalUpdatesAfterSubmit = Object.values(map);
            finalUpdatesAfterSubmit.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setLatestUpdates(finalUpdatesAfterSubmit);

            const timelineArray = Object.values(allTimelinesMap).map(stats => {
                const currentModule = Math.max(stats.highestModule, stats.highestPassedModule + 1);
                const remainingModules = Math.max(0, 52 - (currentModule - 1));

                let expectedDate = stats.latestDate ? new Date(stats.latestDate) : new Date();
                const now = new Date();
                const weeksSinceLastLog = stats.latestDate ? Math.floor((now - stats.latestDate) / (1000 * 60 * 60 * 24 * 7)) : 0;

                if (remainingModules > 0) {
                    const fullCycles = Math.floor(remainingModules / 6);
                    const singleModules = remainingModules % 6;

                    // Step 3: Add cycle days (49 days for 6 modules)
                    expectedDate.setDate(expectedDate.getDate() + (fullCycles * 49));

                    // Step 4: Handle remainder individually + delays + unlogged weeks
                    for (let i = 0; i < singleModules + stats.delays + weeksSinceLastLog; i++) {
                        expectedDate.setDate(expectedDate.getDate() + 8);
                        // Shift if landing on Sunday (0)
                        if (expectedDate.getDay() === 0) {
                            expectedDate.setDate(expectedDate.getDate() + 1);
                        }
                    }
                }

                return {
                    ...stats,
                    expectedEndDate: expectedDate,
                    remainingDays: "Calculated",
                    weeksSinceLastLog
                };
            });

            timelineArray.sort((a, b) => a.expectedEndDate - b.expectedEndDate);
            setTimelineData(timelineArray);

            toast.success("Progress saved successfully!");

            if (user && group) {
                checkWeeklyProgress(group.id, user.uid);
            }

        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save progress");
        }
    };

    return (
        <div className="min-h-screen bg-transparent p-3 sm:p-4 lg:p-6 transition-colors duration-300">
            <div className="max-w-[1600px] w-full mx-auto space-y-8">

                {/* 1. Sleek Group Info Header Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl md:rounded-[2rem] p-4 sm:p-6 text-slate-800 dark:text-white border border-slate-200/50 dark:border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">
                                <Target className="w-4 h-4" /> Active Batch
                            </div>
                            {group ? (
                                <div>
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent mb-4">{group.groupName}</h1>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Batch Code:</p>
                                        <button
                                            onClick={handleCopyCode}
                                            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-bold tracking-widest transition-colors border border-slate-200 dark:border-slate-700 uppercase font-mono"
                                            title="Click to copy invite code"
                                        >
                                            {group.groupCode || group.id}
                                            {copiedContent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xl text-slate-500 dark:text-slate-400">You are not in any group yet.</p>
                            )}
                        </div>
                        {group && (
                            <div className="flex flex-col sm:flex-row gap-4 items-stretch md:items-center w-full md:w-auto mt-6 md:mt-0">
                                <button 
                                    onClick={() => setShowNovaRoadmap(true)}
                                    className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl md:rounded-2xl shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 border border-violet-400/50 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] bg-[position:200%_0,0_0] bg-no-repeat group-hover:bg-[position:-200%_0,0_0] transition-[background-position] duration-1000"></div>
                                    <Map className="w-5 h-5 relative z-10" />
                                    <span className="relative z-10">Nova Story</span>
                                </button>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="px-4 sm:px-6 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl md:rounded-2xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 border border-indigo-500"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                    Log Weekly Progress
                                </button>
                                <Link to="/dashboard/peers" className="bg-slate-50 dark:bg-slate-800/50 rounded-xl md:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 text-center min-w-[100px] sm:min-w-[120px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 group cursor-pointer block flex-shrink-0">
                                    <div className="text-2xl sm:text-3xl font-black mb-1 group-hover:scale-110 transition-transform text-slate-800 dark:text-white">{group.members?.length || 0}</div>
                                    <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Total Mates</div>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {group && (
                    <div className="space-y-8">
                        {/* Nova Roadmap Modal */}
                        <NovaRoadmap isOpen={showNovaRoadmap} onClose={() => setShowNovaRoadmap(false)} />

                        {/* Modal for Logging Progress */}
                        {showForm && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)}></div>

                                <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 animate-fadeIn transform transition-all scale-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                                                <Activity className="w-6 h-6" />
                                            </div>
                                            Log Progress
                                        </h3>
                                        <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-full transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5 relative">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Module Number</label>
                                            <input
                                                type="number"
                                                name="moduleNo"
                                                placeholder="e.g. 25"
                                                value={formData.moduleNo}
                                                onChange={handleChange}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition font-medium"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Exam Status</label>
                                                <select
                                                    name="examStatus"
                                                    value={formData.examStatus}
                                                    onChange={handleChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition appearance-none font-medium"
                                                    required
                                                >
                                                    <option value="">Select status</option>
                                                    <option value="Passed">Passed</option>
                                                    <option value="Repeat">Repeat</option>
                                                    <option value="Reschedule">Rescheduled</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">LinkedIn Activity</label>
                                                <select
                                                    name="linkedinActivity"
                                                    value={formData.linkedinActivity}
                                                    onChange={handleChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition appearance-none font-medium"
                                                    required
                                                >
                                                    <option value="">Select activity</option>
                                                    <option value="Posted">Posted</option>
                                                    <option value="Commented">Commented</option>
                                                    <option value="Shared">Shared</option>
                                                    <option value="None">None</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Connection Count</label>
                                                <input
                                                    type="number"
                                                    name="linkedinCount"
                                                    placeholder="Total connections"
                                                    value={formData.linkedinCount}
                                                    onChange={handleChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                    Post Link {formData.linkedinActivity === "Posted" ? <span className="text-red-500">*</span> : "(Optional)"}
                                                </label>
                                                <input
                                                    type="text"
                                                    name="postLink"
                                                    placeholder="URL"
                                                    value={formData.postLink}
                                                    onChange={handleChange}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition font-medium"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 mt-4 rounded-xl font-bold transition-all hover:scale-[1.01] shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                                        >
                                            <Target className="w-5 h-5" />
                                            Submit Progress
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* 3. Bottom Row: Leaderboard, Timeline, Kicks */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                            <Leaderboard groupId={group.id} />

                            {/* Timeline Card */}
                            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl md:rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-white/5 overflow-hidden relative h-full flex flex-col transition-colors duration-300">
                                <div className="px-4 py-4 border-b border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-indigo-900 dark:from-slate-100 dark:to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
                                        <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                        Timeline
                                    </h2>
                                </div>

                                <div className="p-2 sm:p-3 flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                                    {timelineData.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 mb-4">
                                                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">No batch timeline available</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {timelineData.map(userStats => (
                                                <div key={userStats.userId} className="flex items-center justify-between px-4 py-3 rounded-xl border border-transparent bg-slate-50/50 dark:bg-slate-900/30 transition-all duration-300 hover:shadow-md hover:scale-[1.01] hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 dark:from-indigo-600 dark:to-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden">
                                                            {userStats.photoURL ? (
                                                                <img src={userStats.photoURL} alt={userStats.userName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (userStats.userName || "U").charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                {userStats.userName}
                                                                {userStats.emoji && <span className="text-lg">{userStats.emoji}</span>}
                                                            </span>
                                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                                                                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Current: {Math.max(userStats.highestModule, userStats.highestPassedModule + 1)}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                                <span>Remaining: {Math.max(0, 52 - (Math.max(userStats.highestModule, userStats.highestPassedModule + 1) - 1))}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                                                            {userStats.expectedEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                                                            End Date
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <KicksBoard groupId={group.id} />

                        </div>
                    </div>
                )}

                {/* 4. Batch Progress History */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl md:rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-white/5 overflow-hidden transition-colors duration-300">
                    <div className="px-4 md:px-6 py-4 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            Recent Batch Activity
                        </h2>
                        <Link to="/dashboard/my-progress" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                            View My History <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="p-0 sm:p-2">
                        {latestUpdates.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 mb-4">
                                    <UsersIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 font-semibold text-lg">No activity yet</p>
                                <p className="text-sm text-slate-400 mt-1">Be the first to log progress in this batch!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar rounded-xl">
                                <table className="w-full text-left border-collapse relative">
                                    <thead className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-10 shadow-sm border-b-2 border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Student</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Module</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">LinkedIn</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {latestUpdates.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group">
                                                <td className="px-4 sm:px-6 py-3 text-center text-sm font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 sm:px-6 py-3 whitespace-nowrap min-w-[150px]">
                                                    <Link to={`/dashboard/profile/${item.userId}`} className="flex items-center gap-3 group-hover:opacity-90 transition-opacity">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 dark:from-indigo-600 dark:to-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden">
                                                            {item.photoURL ? (
                                                                <img src={item.photoURL} alt={item.userName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (item.userName || "U").charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5">{item.userName} {item.emoji && <span className="text-lg leading-none">{item.emoji}</span>}</span>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "Just now"}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        Module {item.moduleNo}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.examStatus === 'Passed' ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400' :
                                                        item.examStatus === 'Repeat' ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400' :
                                                            'bg-sky-100/80 dark:bg-sky-500/20 text-sky-800 dark:text-sky-400'
                                                        }`}>
                                                        {item.examStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.linkedinActivity}</span>
                                                        {item.postLink && (
                                                            <a
                                                                href={item.postLink.startsWith('http') ? item.postLink : `https://${item.postLink}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                                                title="View Post"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                                                    <span className="font-bold text-xl text-indigo-600 dark:text-indigo-400">{item.score || 0}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            <ReminderModal
                isOpen={showReminder}
                onClose={closeReminder}
                onLogNow={handleLogNow}
            />
        </div >
    );
}

export default Dashboard;