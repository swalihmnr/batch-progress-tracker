import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, getDoc, getDocs, doc, query, orderBy, deleteDoc, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { ArrowLeft, Users, Edit3, Trash2, X, Save, PlusCircle, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { calculateScore } from "../utils/calculateScore";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    if (seconds < 10) return "just now";
    return Math.floor(seconds) + " seconds ago";
};

function AdminGroupDetails() {
    const { groupId } = useParams();
    const [groupData, setGroupData] = useState(null);
    const [progressList, setProgressList] = useState([]);
    const [totalSubmissions, setTotalSubmissions] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chatMessagesCount, setChatMessagesCount] = useState(0);
    
    // Notion Analytics State
    const [chartData, setChartData] = useState([]);
    const [viewersList, setViewersList] = useState([]);

    const [editingItem, setEditingItem] = useState(null);
    const [editData, setEditData] = useState({});

    // Historical Entry Form State
    const [showHistoricalForm, setShowHistoricalForm] = useState(false);
    const [historicalData, setHistoricalData] = useState({
        userId: "",
        userName: "", // Will be derived from selected userId
        moduleNo: "",
        examStatus: "",
        linkedinActivity: "",
        submissionDate: "", // YYYY-MM-DD format
    });
    const [groupMembersList, setGroupMembersList] = useState([]);

    const fetchGroupData = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);
        try {
            // Fetch group info
            const gDoc = await getDoc(doc(db, "groups", groupId));
            if (gDoc.exists()) {
                const groupInfo = gDoc.data();
                setGroupData(groupInfo);

                // Fetch full User docs for the members to populate dropdown
                if (groupInfo.members && groupInfo.members.length > 0) {
                    const usersSnap = await getDocs(collection(db, "users"));
                    const memberDocs = [];
                    usersSnap.docs.forEach(uDoc => {
                        if (groupInfo.members.includes(uDoc.id)) {
                            const uData = uDoc.data();
                            memberDocs.push({
                                id: uDoc.id,
                                displayName: uData.nickName || uData.fullName || uData.displayName || uData.email || "Unknown"
                            });
                        }
                    });
                    setGroupMembersList(memberDocs);
                }
            }

            // Fetch all progress
            const q = query(
                collection(db, "groups", groupId, "progress"),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            const pData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTotalSubmissions(pData.length);

            // Filter to keep only the latest record per user
            const seenUsers = new Set();
            const latestProgressList = pData.filter(item => {
                if (seenUsers.has(item.userId)) {
                    return false;
                }
                seenUsers.add(item.userId);
                return true;
            });

            setProgressList(latestProgressList);

            // Fetch chat messages count
            try {
                const messagesSnap = await getDocs(collection(db, "chatRooms", groupId, "messages"));
                setChatMessagesCount(messagesSnap.size);
            } catch (err) {
                console.error("No chat room or error fetching messages:", err);
            }

            // Fetch view events for Notion analytics
            try {
                const viewsSnap = await getDocs(query(collection(db, "groups", groupId, "views"), orderBy("timestamp", "asc")));
                const viewsMap = new Map(); // YYYY-MM-DD -> { name, total, uniqueSet }
                const userLatestView = new Map(); // userId -> { userName, timestamp }

                viewsSnap.docs.forEach(d => {
                    const data = d.data();
                    if (!data.timestamp) return;
                    
                    const dateObj = data.timestamp.toDate();
                    const dayStr = dateObj.toISOString().split('T')[0]; // "2023-10-15"

                    if (!viewsMap.has(dayStr)) {
                        viewsMap.set(dayStr, { name: dayStr, total: 0, uniqueSet: new Set() });
                    }
                    
                    const dayData = viewsMap.get(dayStr);
                    dayData.total += 1;
                    dayData.uniqueSet.add(data.userId);

                    userLatestView.set(data.userId, {
                        userId: data.userId,
                        userName: data.userName,
                        timestamp: dateObj
                    });
                });

                // Format chart data
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const finalChartData = Array.from(viewsMap.values()).map(d => {
                    const [year, month, day] = d.name.split('-');
                    const formattedDate = `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
                    return {
                        name: formattedDate,
                        total: d.total,
                        unique: d.uniqueSet.size
                    };
                });
                setChartData(finalChartData);

                // Format viewers list
                const finalViewers = Array.from(userLatestView.values()).sort((a, b) => b.timestamp - a.timestamp);
                setViewersList(finalViewers);
            } catch (err) {
                console.error("Error fetching view events:", err);
            }
        } catch (error) {
            console.error("Error fetching admin group data", error);
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const handleDeleteProgress = async (progressId) => {
        if (!window.confirm("Are you sure you want to permanently delete this record?")) return;
        try {
            await deleteDoc(doc(db, "groups", groupId, "progress", progressId));
            setProgressList(prev => prev.filter(p => p.id !== progressId));
            toast.success("Progress record deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete progress.");
        }
    };

    const handleEditClick = (item) => {
        setEditingItem(item.id);
        setEditData({
            userName: item.userName,
            moduleNo: item.moduleNo,
            examStatus: item.examStatus,
            linkedinActivity: item.linkedinActivity,
            score: item.score
        });
    };

    const handleEditChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async () => {
        try {
            const docRef = doc(db, "groups", groupId, "progress", editingItem);
            // In Admin land, we'll let them forcefully override score
            await updateDoc(docRef, {
                userName: editData.userName,
                moduleNo: Number(editData.moduleNo),
                examStatus: editData.examStatus,
                linkedinActivity: editData.linkedinActivity,
                score: Number(editData.score)
            });
            setEditingItem(null);
            fetchGroupData();
            toast.success("Record updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update record.");
        }
    };

    const handleHistoricalChange = (e) => {
        let value = e.target.value;
        if (e.target.name === "userId") {
            const selectedMember = groupMembersList.find(m => m.id === value);
            setHistoricalData({
                ...historicalData,
                userId: value,
                userName: selectedMember ? selectedMember.displayName : ""
            });
        } else {
            setHistoricalData({ ...historicalData, [e.target.name]: value });
        }
    };

    const handleHistoricalSubmit = async (e) => {
        e.preventDefault();
        try {
            // Calculate Score
            const score = calculateScore(historicalData.examStatus, historicalData.linkedinActivity);

            // Create Firebase Timestamp from YYYY-MM-DD
            // By default, assuming noon local time to avoid timezone edge cases shifting to previous day
            const dateObj = new Date(`${historicalData.submissionDate}T12:00:00`);
            const createdAtTimestamp = Timestamp.fromDate(dateObj);

            await addDoc(collection(db, "groups", groupId, "progress"), {
                userId: historicalData.userId,
                userName: historicalData.userName,
                moduleNo: Number(historicalData.moduleNo),
                examStatus: historicalData.examStatus,
                linkedinActivity: historicalData.linkedinActivity,
                linkedinCount: 0,
                postLink: "",
                score: score,
                createdAt: createdAtTimestamp,
                adminAdded: true
            });

            toast.success("Historical data added successfully!");
            setHistoricalData({
                userId: "",
                userName: "",
                moduleNo: "",
                examStatus: "",
                linkedinActivity: "",
                submissionDate: "",
            });
            setShowHistoricalForm(false);
            fetchGroupData(); // Refresh list

        } catch (error) {
            console.error("Historical entry error:", error);
            toast.error("Failed to add historical record");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="max-w-[1600px] w-full mx-auto space-y-8">

                <div>
                    <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Admin Dashboard
                    </Link>
                </div>

                {/* Header */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-8 border border-slate-200/50 dark:border-white/5 shadow-2xl flex items-center justify-between transition-colors duration-300">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{groupData?.groupName || "Unknown Group"}</h1>
                        <p className="text-sm font-medium text-slate-400 mt-1">Group ID: {groupId}</p>
                    </div>
                    <div className="flex bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 items-center gap-4">
                        <Users className="w-8 h-8 text-indigo-500" />
                        <div>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalSubmissions}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Submissions</p>
                        </div>
                    </div>
                </div>

                {/* Traffic & Analytics Section (Notion Style) */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-white/5 overflow-hidden transition-colors duration-300 p-6 md:p-8">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="text-rose-500">📈</span> Traffic Analytics
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed view history for this batch</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Chart Area */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-4 text-sm font-semibold mb-4">
                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                    <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                                    Total Views
                                </div>
                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                    <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                                    Unique Views
                                </div>
                            </div>
                            
                            <div className="h-[300px] w-full bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                                            <Area type="monotone" dataKey="unique" stroke="#f59e0b" fillOpacity={1} fill="url(#colorUnique)" strokeWidth={2} dot={{r: 4, fill: '#f59e0b'}} activeDot={{r: 6}} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                        Not enough data to display chart yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Viewers List */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[350px]">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 px-2">Viewers</h3>
                            <div className="overflow-y-auto pr-2 space-y-1 flex-1">
                                {viewersList.length > 0 ? viewersList.map(viewer => (
                                    <div key={viewer.userId} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                                {(viewer.userName || "U").charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                                                {viewer.userName}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                                            {timeAgo(viewer.timestamp)}
                                        </p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-500 text-center py-8">No viewers logged yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Optional Historical Form Button */}
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowHistoricalForm(!showHistoricalForm)}
                        className="px-5 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                        {showHistoricalForm ? <X className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                        {showHistoricalForm ? "Close Form" : "Add Historical Data"}
                    </button>
                </div>

                {/* Historical Form */}
                {showHistoricalForm && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-rose-200/50 dark:border-rose-900/50 p-8 animate-fadeIn transition-colors duration-300">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <Calendar className="w-5 h-5 text-rose-500" />
                            Admin Backfill
                        </h2>

                        <form onSubmit={handleHistoricalSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Student</label>
                                    <select
                                        name="userId"
                                        value={historicalData.userId}
                                        onChange={handleHistoricalChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                                    >
                                        <option value="">-- Choose Member --</option>
                                        {groupMembersList.map(member => (
                                            <option key={member.id} value={member.id}>{member.displayName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Original Submission Date</label>
                                    <input
                                        type="date"
                                        name="submissionDate"
                                        required
                                        value={historicalData.submissionDate}
                                        onChange={handleHistoricalChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Module Number</label>
                                    <input
                                        type="number"
                                        name="moduleNo"
                                        placeholder="e.g. 1"
                                        required
                                        value={historicalData.moduleNo}
                                        onChange={handleHistoricalChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Exam Status</label>
                                    <select
                                        name="examStatus"
                                        required
                                        value={historicalData.examStatus}
                                        onChange={handleHistoricalChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                                    >
                                        <option value="">-- Select Status --</option>
                                        <option value="Passed">Passed</option>
                                        <option value="Repeat">Repeat</option>
                                        <option value="Reschedule">Rescheduled</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">LinkedIn Activity</label>
                                    <select
                                        name="linkedinActivity"
                                        required
                                        value={historicalData.linkedinActivity}
                                        onChange={handleHistoricalChange}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                                    >
                                        <option value="">-- Select Activity --</option>
                                        <option value="Posted">Posted</option>
                                        <option value="Commented">Commented</option>
                                        <option value="Shared">Shared</option>
                                        <option value="None">None</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2">
                                    <Save className="w-5 h-5" /> Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Records Table */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-white/5 overflow-hidden transition-colors duration-300">
                    <div className="px-6 py-5 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">All Progress Records</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Module</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">LinkedIn</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Score</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {progressList.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{item.userName}</p>
                                            <p className="text-xs text-slate-400">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "-"}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">Mod {item.moduleNo}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.examStatus}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.linkedinActivity}</td>
                                        <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{item.score}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEditClick(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteProgress(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {progressList.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Modal for Editing */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-transparent dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-rose-500" />
                                Admin Override
                            </h3>
                            <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">User Name</label>
                                <input type="text" name="userName" value={editData.userName} onChange={handleEditChange} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Module</label>
                                    <input type="number" name="moduleNo" value={editData.moduleNo} onChange={handleEditChange} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Override Score</label>
                                    <input type="number" name="score" value={editData.score} onChange={handleEditChange} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-bold text-rose-600" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Status</label>
                                <select name="examStatus" value={editData.examStatus} onChange={handleEditChange} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none">
                                    <option value="Passed">Passed</option>
                                    <option value="Repeat">Repeat</option>
                                    <option value="Reschedule">Rescheduled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">LinkedIn Activity</label>
                                <select name="linkedinActivity" value={editData.linkedinActivity} onChange={handleEditChange} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none">
                                    <option value="Posted">Posted</option>
                                    <option value="Commented">Commented</option>
                                    <option value="Shared">Shared</option>
                                    <option value="None">None</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button onClick={handleUpdate} className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AdminGroupDetails;
