import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Simple lightweight synthetic sound generator for notifications
const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const playOscillator = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        // A pleasant UI "pop-ding"
        playOscillator(600, now, 0.1); 
        playOscillator(800, now + 0.1, 0.25); 
    } catch (e) {
        console.log("Audio API not supported or blocked", e);
    }
};

export default function NotificationManager() {
    const { user } = useAuth();
    const initialNotifsLoad = useRef(true);
    const initialChatsLoad = useRef(true);
    
    // Track active chat listeners to avoid duplicates if rooms change
    const [userRooms, setUserRooms] = useState([]);
    const [mutedPreferences, setMutedPreferences] = useState({});

    // 1. Listen for User Preferences (Muted Chats)
    useEffect(() => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const unsub = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMutedPreferences(data.mutedChats || {});
            }
        });
        return () => unsub();
    }, [user]);

    // 2. Listen for Persistent Notifications (Pokes, Alerts, etc.)
    useEffect(() => {
        if (!user) return;
        
        const q = query(
            collection(db, "users", user.uid, "notifications"),
            orderBy("createdAt", "desc"),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (initialNotifsLoad.current) {
                initialNotifsLoad.current = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    
                    // Prevent old notifications from popping up locally by checking timestamp roughly
                    if (data.createdAt?.toMillis && (Date.now() - data.createdAt.toMillis() > 10000)) return;

                    playNotificationSound();
                    
                    // Show a toast for the notification
                    const icon = data.type === 'success' ? '✅' : data.type === 'alert' ? '👉' : '🔔';
                    toast(data.title + ": " + data.message, {
                        icon: icon,
                        duration: 5000,
                        position: 'top-right',
                        style: {
                            borderRadius: '12px',
                            background: '#333',
                            color: '#fff',
                        },
                    });
                }
            });
        });

        return () => unsubscribe();
    }, [user]);

    // 3. Listen for which Chats the user is in
    useEffect(() => {
        if (!user) return;
        
        const qChats = query(
            collection(db, "chatRooms"),
            where("members", "array-contains", user.uid)
        );

        const unsubscribe = onSnapshot(qChats, (snapshot) => {
            const rooms = [];
            snapshot.forEach(doc => {
                rooms.push({ id: doc.id, name: doc.data().name, type: doc.data().type });
            });
            setUserRooms(rooms);
        });

        return () => unsubscribe();
    }, [user]);

    // 4. Attach Message Listeners to Global and 1QAD Rooms (since they don't create persistent notifications)
    useEffect(() => {
        if (!user) return;

        const roomsToListen = ['global', '1qad'];
        const unsubscribes = [];

        roomsToListen.forEach(roomId => {
            const qMsgs = query(
                collection(db, "chatRooms", roomId, "messages"),
                orderBy("timestamp", "desc"),
                limit(1)
            );

            const unsubscribe = onSnapshot(qMsgs, (snapshot) => {
                if (initialChatsLoad.current) return;

                snapshot.docChanges().forEach(change => {
                    if (change.type === "added") {
                        const msg = change.doc.data();
                        
                        if (msg.senderId === user.uid) return;
                        if (msg.timestamp?.toMillis && (Date.now() - msg.timestamp.toMillis() > 10000)) return;
                        if (mutedPreferences[roomId] === true) return;

                        // Public chats are purely ephemeral sound/toast
                        playNotificationSound();
                        
                        const currentPath = window.location.pathname;
                        if (!(currentPath === "/dashboard/chat" || currentPath.includes(`/dashboard/chat?room=${roomId}`))) {
                            const roomName = roomId === '1qad' ? '1QAD' : 'Global';
                            toast(`${msg.senderName} (${roomName}): ${msg.text ? (msg.text.length > 20 ? msg.text.substring(0,20)+'...' : msg.text) : 'Sent an attachment'}`, {
                                icon: roomId === '1qad' ? '🎯' : '🌐',
                                duration: 3000
                            });
                        }
                    }
                });
            });
            unsubscribes.push(unsubscribe);
        });
        
        setTimeout(() => {
            initialChatsLoad.current = false;
        }, 2000);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, mutedPreferences]);

    return null; // This component handles side effects only
}
