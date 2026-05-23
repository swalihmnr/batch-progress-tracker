import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { Bell, Check, Trash2, X, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

function NotificationDropdown() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "users", user.uid, "notifications"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(data);

            const unreadCount = data.filter(n => n.unread).length;

            // Set PWA badge if supported
            if ("setAppBadge" in navigator) {
                if (unreadCount > 0) {
                    navigator.setAppBadge(unreadCount).catch(e => console.error("Error setting badge:", e));
                } else {
                    navigator.clearAppBadge().catch(e => console.error("Error clearing badge:", e));
                }
            }
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => n.unread).length;

    const markAsRead = async (notificationId) => {
        if (!user) return;
        try {
            const docRef = doc(db, "users", user.uid, "notifications", notificationId);
            await updateDoc(docRef, { unread: false });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (notification.unread) await markAsRead(notification.id);
        setIsOpen(false);

        // Navigate to the relevant page
        if (notification.roomId) {
            navigate(`/dashboard/chat?room=${notification.roomId}`);
        } else if (notification.link) {
            navigate(notification.link);
        }
    };

    const markAllAsRead = async () => {
        if (!user || unreadCount === 0) return;
        try {
            const batch = writeBatch(db);
            notifications.forEach((n) => {
                if (n.unread) {
                    const docRef = doc(db, "users", user.uid, "notifications", n.id);
                    batch.update(docRef, { unread: false });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const clearAll = async () => {
        if (!user || notifications.length === 0) return;
        try {
            const batch = writeBatch(db);
            notifications.forEach((n) => {
                const docRef = doc(db, "users", user.uid, "notifications", n.id);
                batch.delete(docRef);
            });
            await batch.commit();
            setIsOpen(false);
        } catch (error) {
            console.error("Error clearing notifications:", error);
        }
    };

    return (
        <div className="relative pr-6 border-r-2 border-slate-200 dark:border-slate-800" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Notifications"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-ring text-rose-500' : ''}`} />
                {unreadCount > 0 && (
                    <>
                        <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-rose-500 animate-ping opacity-75 transform translate-x-1/4 -translate-y-1/4 pointer-events-none"></span>
                        <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 pointer-events-none transform translate-x-1/4 -translate-y-1/4 shadow-sm">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    </>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-indigo-900/10 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fadeIn flex flex-col max-h-[85vh]">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10 sticky top-0">
                        <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                                    {unreadCount} new
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={clearAll} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" title="Clear All">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors ml-1 lg:hidden">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                        {notifications.length === 0 ? (
                            <div className="px-6 py-12 text-center flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No notifications yet!</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">When there are updates, they'll show up here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`px-5 py-4 transition-colors cursor-pointer group relative hover:bg-slate-50 dark:hover:bg-slate-800/80 ${notification.unread ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'bg-white dark:bg-slate-900'}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex gap-4">
                                            <div className="mt-1 shrink-0">
                                                {notification.type === 'success' ? (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.unread ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'} shadow-sm`}>
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                ) : notification.type === 'chat' ? (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.unread ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'} shadow-sm`}>
                                                        <MessageSquare className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.unread ? 'bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'} shadow-sm`}>
                                                        <Bell className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className={`text-sm ${notification.unread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'} truncate`}>
                                                    {notification.title}
                                                </p>
                                                <p className={`text-sm mt-1 leading-relaxed ${notification.unread ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-500'} line-clamp-2`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-2">
                                                    {notification.createdAt?.toDate ? notification.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Just now"}
                                                </p>
                                            </div>
                                            {notification.unread && (
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/50 outline outline-2 outline-white dark:outline-slate-900"></div>
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
    );
}

export default NotificationDropdown;
