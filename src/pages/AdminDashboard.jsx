import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, query, orderBy, getCountFromServer, limit, startAfter } from "firebase/firestore";
import { ShieldCheck, Users, BookOpen, ChevronRight, Activity, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

function AdminDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, totalGroups: 0, totalViews: 0 });
    const [groups, setGroups] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showUsersModal, setShowUsersModal] = useState(false);
    
    // Server-side lazy loading state
    const [lastVisible, setLastVisible] = useState(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [hasMoreUsers, setHasMoreUsers] = useState(true);

    useEffect(() => {
        const fetchAdminData = async () => {
            setLoading(true);
            try {
                // Instantly fetch total users count without downloading the data
                const usersCountSnap = await getCountFromServer(collection(db, "users"));
                const totalUsers = usersCountSnap.data().count;

                // Fetch Groups
                const groupsQuery = query(collection(db, "groups"), orderBy("createdAt", "desc"));
                const groupsSnap = await getDocs(groupsQuery);
                const totalGroups = groupsSnap.size;

                let totalViewsCount = 0;
                const groupData = groupsSnap.docs.map(groupDoc => {
                    const data = groupDoc.data();
                    totalViewsCount += (data.totalViews || 0);

                    return {
                        id: groupDoc.id,
                        ...data,
                        // No extra queries! Just read from the array directly.
                        activeMembers: data.members?.length || 0,
                    };
                });

                setStats({ totalUsers, totalGroups, totalViews: totalViewsCount });
                setGroups(groupData);

            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const loadUsers = async (isNext = false) => {
        if (loadingUsers || (!hasMoreUsers && isNext)) return;
        setLoadingUsers(true);
        try {
            let usersQuery;
            if (isNext && lastVisible) {
                usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(15));
            } else {
                usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(15));
            }
            
            const snap = await getDocs(usersQuery);
            if (snap.empty) {
                setHasMoreUsers(false);
            } else {
                setLastVisible(snap.docs[snap.docs.length - 1]);
                const newUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                if (isNext) {
                    setUsersList(prev => [...prev, ...newUsers]);
                } else {
                    setUsersList(newUsers);
                }
                
                if (snap.docs.length < 15) {
                    setHasMoreUsers(false);
                }
            }
        } catch (err) {
            console.error("Error loading users", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleOpenUsersModal = () => {
        setShowUsersModal(true);
        if (usersList.length === 0) {
            loadUsers(false);
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="max-w-[1600px] w-full mx-auto space-y-8">

                {/* Header */}
                {/* Header */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-8 shadow-2xl border border-slate-200/50 dark:border-white/5 relative overflow-hidden transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 dark:bg-rose-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-sm border border-rose-100 dark:border-rose-800">
                            <ShieldCheck className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Admin Dashboard</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Platform Overview & Management</p>
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div
                        onClick={handleOpenUsersModal}
                        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-6 border border-slate-200/50 dark:border-white/5 shadow-xl flex items-center gap-6 group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-800 group-hover:scale-110 transition-transform">
                            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Users</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-slate-100">{stats.totalUsers}</p>
                        </div>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-6 border border-slate-200/50 dark:border-white/5 shadow-xl flex items-center gap-6 group hover:-translate-y-1 transition-all duration-300">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shadow-sm border border-emerald-100 dark:border-emerald-800 group-hover:scale-110 transition-transform">
                            <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Batches</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-slate-100">{stats.totalGroups}</p>
                        </div>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] p-6 border border-slate-200/50 dark:border-white/5 shadow-xl flex items-center gap-6 group hover:-translate-y-1 transition-all duration-300">
                        <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shadow-sm border border-sky-100 dark:border-sky-800 group-hover:scale-110 transition-transform">
                            <span className="text-3xl">👁️</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Platform Views</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-slate-100">{stats.totalViews}</p>
                        </div>
                    </div>
                </div>

                {/* Groups List */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-white/5 overflow-hidden transition-colors duration-300">
                    <div className="px-6 py-5 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                            Manage Batches
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-left">
                        {groups.map((group) => (
                            <Link
                                key={group.id}
                                to={`/admin/groups/${group.id}`}
                                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group/row"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm group-hover/row:scale-105 transition-transform">
                                        {(group.groupName || "G").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{group.groupName}</p>
                                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">ID: {group.id}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{group.activeMembers}</p>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Users</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover/row:text-indigo-500 transition-colors" />
                                </div>
                            </Link>
                        ))}

                    </div>
                    {groups.length === 0 && (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            No groups created yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Users List Modal */}
            {showUsersModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowUsersModal(false)}></div>
                    <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <Users className="w-6 h-6" />
                                </div>
                                Registered Users
                                <span className="text-sm font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-3 py-1 rounded-full">{usersList.length} Total</span>
                            </h2>
                            <button onClick={() => setShowUsersModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-0">
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10 sticky top-0 z-10">
                                            <th className="pb-4 pt-4 px-6 font-semibold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">User</th>
                                            <th className="pb-4 pt-4 px-6 font-semibold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Email</th>
                                            <th className="pb-4 pt-4 px-6 font-semibold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Nickname</th>
                                            <th className="pb-4 pt-4 px-6 font-semibold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">Privacy Mode</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {usersList.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 dark:from-indigo-600 dark:to-purple-700 text-white font-bold shadow-sm shrink-0">
                                                            {(user.fullName || user.displayName || user.email || "U").charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                                {user.fullName || user.displayName || user.email || "Unknown User"}
                                                                {user.emoji && <span className="text-lg leading-none">{user.emoji}</span>}
                                                            </p>
                                                            <p className="text-xs text-slate-400 font-medium font-mono">ID: {user.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-sm font-medium">
                                                    {user.email || "—"}
                                                </td>
                                                <td className="py-4 px-6 text-slate-600 dark:text-slate-400 text-sm font-medium">
                                                    {user.nickName || "—"}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.privacyMode ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                        {user.privacyMode ? "Private" : "Public"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {usersList.length === 0 && (
                                    <div className="p-16 text-center text-slate-500 dark:text-slate-400">
                                        No users registered yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{usersList.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.totalUsers}</span> Users
                            </span>
                            
                            {hasMoreUsers ? (
                                <button
                                    onClick={() => loadUsers(true)}
                                    disabled={loadingUsers}
                                    className="px-4 py-2 flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white text-sm font-bold shadow-md transition-colors"
                                >
                                    {loadingUsers && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Load More
                                </button>
                            ) : (
                                <span className="text-sm font-medium text-slate-400 italic">All users loaded</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
