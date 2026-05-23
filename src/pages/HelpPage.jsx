import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { createOrGetPrivateChat } from "../firebase/chatService";
import { useNavigate } from "react-router-dom";
import { BookOpen, Edit3, Save, X, MessageCircle, ChevronRight, Loader2, Heart } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";

const SUPER_ADMIN_EMAIL = "muhammedshifil@gmail.com";

const DEFAULT_INSTRUCTIONS = `## 👋 Welcome to Batch Tracker!

Batch Tracker is a private learning community platform designed to help you track progress, stay motivated, and connect with your batch mates.

---

### 🧭 Getting Started

1. **Join or Create a Batch** — Use the sidebar to join an existing batch or create your own. All features are unlocked once you're part of a batch.
2. **Log Your Progress** — Head to **My Progress** and submit your latest module number, exam status, and LinkedIn activity.
3. **Check the Dashboard** — See how your batch is performing and where you stand.

---

### 💬 Chat System

- **Global Chat** — Everyone is a member by default. Say hello!
- **Group Chats** — Admins create group rooms. Request to join and wait for approval.
- **Private Chats** — Visit any batch mate's profile and click **Chat** to start a private conversation.
- **Poke** — Just for fun! Poke your batch mates to say hi 👋

---

### 🏆 Leaderboard & English Kicks

- Scores are calculated from your reported progress and LinkedIn activities.
- **English Kicks** is a special score tracked separately by batch coordinators.

---

### 🔔 Notifications

Click any notification to jump directly to the related content. Chat message notifications open the exact chat room.

---

### ⚙️ Settings & Profile

- Set your **Status** in My Profile so others know what you're up to (e.g. ☕ Up for tea).
- You can mute individual chat rooms from within the chat.

---

### 🛡️ Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full access to everything |
| **Batch Admin** | Manage their own batch |
| **Coordinator** | Manage English Kicks scores |
| **Member** | Standard access |
---`;

export default function HelpPage() {
  const { user, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [superAdminUid, setSuperAdminUid] = useState(null);

  // Fetch help content from Firestore
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const ref = doc(db, "config", "appHelp");
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().content) {
          let currentContent = snap.data().content;
          
          // Auto-update footer for Super Admin if it's the old version
          if (isSuperAdmin && (currentContent.toLowerCase().includes("connect with") || currentContent.toLowerCase().includes("have questions?"))) {
            // Very aggressive cleanup to ensure no redundant footers remain in the DB
            currentContent = currentContent
              .split('\n')
              .filter(line => !line.toLowerCase().includes("connect with") && !line.toLowerCase().includes("have questions?"))
              .join('\n')
              .trim();
            
            // Re-add a clean divider if it was stripped
            if (!currentContent.endsWith("---")) {
              currentContent += "\n\n---";
            }
            
            const ref = doc(db, "config", "appHelp");
            setDoc(ref, { 
              content: currentContent, 
              adminUid: user?.uid,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          
          setContent(currentContent);
          setSuperAdminUid(snap.data().adminUid || null);
        } else {
          // First time — seed with defaults
          setContent(DEFAULT_INSTRUCTIONS);
        }
      } catch (err) {
        console.error("Error fetching help content:", err);
        setContent(DEFAULT_INSTRUCTIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleStartEdit = () => {
    setEditContent(content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "config", "appHelp");
      await setDoc(ref, {
        content: editContent,
        adminUid: user?.uid,
        updatedAt: new Date().toISOString(),
      });
      setContent(editContent);
      setIsEditing(false);
      toast.success("Instructions updated!");
    } catch (err) {
      toast.error("Failed to save.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectAdmin = async () => {
    if (isSuperAdmin) {
      toast("That's you! 😄");
      return;
    }

    setStartingChat(true);
    try {
      // Find admin UID dynamically by email
      let adminUid = superAdminUid;
      if (!adminUid) {
        const q = query(collection(db, "users"), where("email", "==", SUPER_ADMIN_EMAIL));
        const snap = await getDocs(q);
        if (snap.empty) {
          toast.error("Admin not found. Try again later.");
          return;
        }
        adminUid = snap.docs[0].id;
        setSuperAdminUid(adminUid);
      }

      await createOrGetPrivateChat(user.uid, adminUid);
      navigate("/dashboard/chat");
    } catch (err) {
      toast.error("Could not start chat.");
      console.error(err);
    } finally {
      setStartingChat(false);
    }
  };

  // Simple markdown-ish renderer
  const renderContent = (text) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="text-2xl font-extrabold text-slate-900 dark:text-white mt-8 mb-3 first:mt-0">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith("---")) return <hr key={i} className="my-4 border-slate-200 dark:border-slate-700" />;
      if (line.startsWith("| ")) {
        // Table row - Skip the separator line |---|---|
        if (line.includes("---")) return null;
        
        const cells = line.split("|").filter(c => c.trim());
        if (cells.length === 0) return null;
        
        const isHeader = i === 0 || (i > 0 && text.split("\n")[i-2]?.startsWith("### "));
        return (
          <div key={i} className={`flex gap-4 px-4 py-2.5 rounded-xl text-sm mb-1 ${isHeader ? 'bg-indigo-50 dark:bg-indigo-900/40 font-bold border border-indigo-100/50 dark:border-indigo-800/30' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
            {cells.map((cell, j) => (
              <span key={j} className={`flex-1 ${j === 0 && !isHeader ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                {cell.trim().replace(/\*\*/g, "")}
              </span>
            ))}
          </div>
        );
      }
      if (line.match(/^\d+\./)) return (
        <div key={i} className="flex gap-3 my-1.5 text-slate-700 dark:text-slate-300 text-sm">
          <ChevronRight className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, "").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      );
      if (line.startsWith("- ")) return (
        <div key={i} className="flex gap-3 my-1.5 text-slate-700 dark:text-slate-300 text-sm">
          <span className="text-indigo-400 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      );

      // Hide any mentions of "Connect" or "questions" in the content - it's already in the separate card
      if (line.toLowerCase().includes("connect with") || line.toLowerCase().includes("have questions?")) return null;

      if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) return (
        <p key={i} className="text-sm italic text-slate-500 dark:text-slate-400 mt-4">{line.slice(1, -1)}</p>
      );
      if (line.trim() === "") return <div key={i} className="h-1" />;
      return (
        <p key={i} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed my-1"
           dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-800 dark:text-slate-200">$1</strong>') }} />
      );
    });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
        }
        .animate-float-slight {
          animation: float 8s ease-in-out infinite;
        }
        .glow-box {
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.05);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glow-box:hover {
          box-shadow: 0 0 40px rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
          transform: scale(1.02);
        }
      `}</style>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">How It Works</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your guide to Batch Tracker</p>
            </div>
          </div>

          {isSuperAdmin && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm font-bold border border-indigo-200 dark:border-indigo-800 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {/* Content Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : isEditing ? (
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Editing instructions (Markdown supported)</p>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={30}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm resize-y"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 space-y-1">
              {renderContent(content)}
            </div>
          )}
        </div>

        {/* Connect with Admin Card (Shown to everyone, for preview/actual use) */}
        <div className="flex justify-center mt-16 mb-12">
          <div className="animate-float-slight glow-box bg-white/90 dark:bg-slate-900/90 rounded-full border border-indigo-100/60 dark:border-indigo-800/40 px-10 py-5 flex flex-col md:flex-row items-center gap-8 shadow-2xl backdrop-blur-lg">
            <h5 className="font-extrabold text-slate-800 dark:text-white text-xl tracking-tight whitespace-nowrap">Anything in your mind?</h5>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
            <button
              onClick={handleConnectAdmin}
              disabled={startingChat}
              className="group relative flex items-center gap-3 px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-70 text-base whitespace-nowrap shadow-xl shadow-indigo-500/30"
            >
              <div className="absolute inset-0 rounded-full bg-indigo-400 blur-xl opacity-0 group-hover:opacity-40 transition-opacity"></div>
              <span className="relative flex items-center gap-2">
                {startingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-5 h-5 fill-rose-400 text-rose-400 drop-shadow-md group-hover:scale-125 transition-transform" />}
                Connect with me
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
