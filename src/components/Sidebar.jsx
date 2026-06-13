import { Users, UserCircle, Settings, LogOut, ChevronLeft, LayoutDashboard, CheckCircle2, ChevronDown, User as UserIcon, PlusCircle, UserPlus, BookOpen, ShieldAlert, Activity, X, Zap, MessageSquare, HelpCircle, Code2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

function Sidebar({ groupContext = {}, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const { group, groups, selectGroup } = groupContext;
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', end: true },
    { name: 'Batch Info', icon: Settings, path: '/dashboard/group-info' },
    { name: 'Batch Mates', icon: Users, path: '/dashboard/peers' },
    { name: 'My Progress', icon: UserCircle, path: '/dashboard/my-progress' },
    { name: 'English Kicks', icon: Zap, path: '/dashboard/english-kick' },
    { name: '1QAD Leetcode', icon: Code2, path: '/dashboard/chat?room=1qad' },
    { name: 'Chat', icon: MessageSquare, path: '/dashboard/chat', hideIfNoGroups: true },
    { name: 'My Profile', icon: UserIcon, path: '/dashboard/my-profile' },
  ];

  const actionItems = [
    { name: "Create Batch", path: "/create-group", icon: PlusCircle, color: "text-indigo-600 dark:text-indigo-400", bgHover: "hover:bg-indigo-50 dark:hover:bg-indigo-900/30" },
    { name: "Join Batch", path: "/join-group", icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400", bgHover: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30" },
  ];

  return (
    <aside className="w-80 bg-white dark:bg-slate-950 border-r-2 border-slate-200 dark:border-slate-800 flex flex-col h-screen fixed sm:relative z-20 transition-colors duration-300">

      {/* BRANDING */}
      <div className="p-6 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none animate-bounce" style={{ animationDuration: '3s' }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="animate-pulse" style={{ animationDuration: '4s' }}>
            <h1 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 leading-tight tracking-tight">Batch Tracker</h1>
            <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mt-0.5">Continuous Learning</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">

        {/* BATCH SWITCHER */}
        {groups && groups.length > 0 && (
          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Active Batch</p>
            <div className="relative px-2">
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate w-full text-left">
                    {group?.groupName || "Select Batch"}
                  </span>
                </div>
                {groups.length > 1 && (
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transform transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {isSwitcherOpen && groups.length > 1 && (
                <div className="absolute top-full mt-2 left-2 right-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-indigo-900/20 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fadeIn">
                  <div className="max-h-48 overflow-y-auto py-2">
                    {groups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => {
                          selectGroup(g);
                          setIsSwitcherOpen(false);
                          if (!location.pathname.startsWith('/dashboard')) navigate('/dashboard');
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-between ${group?.id === g.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                      >
                        <span className="truncate">{g.groupName}</span>
                        {group?.id === g.id && <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Menu */}
        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Main Menu</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              // Hide Chat if user has no batches (unless they are admin)
              if (item.hideIfNoGroups && (!groups || groups.length === 0) && !isAdmin) return null;



              // Fix active logic for query parameters
              const urlPath = item.path ? item.path.split('?')[0] : '';
              const urlQuery = item.path ? item.path.split('?')[1] || '' : '';
              const searchParams = new URLSearchParams(location.search);
              const targetParams = new URLSearchParams(urlQuery);

              let isActive = false;
              if (item.path === "/dashboard") {
                isActive = location.pathname === "/dashboard";
              } else if (urlQuery) {
                // If it has a query param (e.g. ?room=1qad), match both path and query
                isActive = location.pathname.startsWith(urlPath);
                for (const [key, value] of targetParams.entries()) {
                  if (searchParams.get(key) !== value) isActive = false;
                }
              } else {
                // If it has NO query param, but the current URL HAS one (like room=1qad), and this is the Chat tab, we shouldn't highlight Chat if we're explicitly highlighting 1QAD
                isActive = location.pathname.startsWith(item.path);
                if (item.name === 'Chat' && searchParams.get('room') === '1qad') {
                  isActive = false; // Because 1QAD is active instead
                }
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm dark:shadow-none"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                  {item.name}
                </Link>
              );
            })}

            {/* Admin specifically */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => onClose && onClose()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mt-2 ${location.pathname.startsWith('/admin')
                  ? "bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 shadow-sm dark:shadow-none border border-rose-200 dark:border-rose-800"
                  : "text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-slate-900 hover:text-rose-700 dark:hover:text-rose-400"
                  }`}
              >
                <ShieldAlert className={`w-5 h-5 ${location.pathname.startsWith('/admin') ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`} />
                Admin Panel
              </Link>
            )}
          </nav>
        </div>

        {/* Actions */}

        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Actions</p>
          <nav className="space-y-2">
            {actionItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 ${item.bgHover}`}
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

      </div>

      {/* HELP FOOTER */}
      <div className="px-4 pb-6 border-t border-slate-100 dark:border-slate-800 pt-4">
        <Link
          to="/dashboard/help"
          onClick={() => onClose && onClose()}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${location.pathname === '/dashboard/help'
            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
        >
          <HelpCircle className={`w-5 h-5 ${location.pathname === '/dashboard/help' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`} />
          How it Works
        </Link>
      </div>

    </aside>
  );
}

export default Sidebar;