import { collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc, deleteDoc, where, or, writeBatch } from "firebase/firestore";
import { db } from "./firebaseConfig";

// -------------------------------------------------------------
// CHAT ROOMS
// -------------------------------------------------------------

/**
 * Ensures the "Global" chat exists.
 */
export const initializeGlobalChat = async () => {
  const globalRef = doc(db, "chatRooms", "global");
  const globalSnap = await getDoc(globalRef);
  if (!globalSnap.exists()) {
    await setDoc(globalRef, {
      name: "Global Chat",
      type: "global",
      members: [], // Global doesn't strictly need members array since everyone sees it
      createdAt: serverTimestamp(),
    });
  }
};

/**
 * Ensures the "1QAD" (1 Question A Day) chat exists.
 */
export const initialize1QADChat = async () => {
  const qadRef = doc(db, "chatRooms", "1qad");
  const qadSnap = await getDoc(qadRef);
  if (!qadSnap.exists()) {
    await setDoc(qadRef, {
      name: "1QAD",
      type: "1qad",
      members: [],
      createdAt: serverTimestamp(),
    });
  }
};

/**
 * Creates a new Group Chat
 */
export const createGroupChat = async (name, creatorId) => {
  const chatRoomsRef = collection(db, "chatRooms");
  await addDoc(chatRoomsRef, {
    name,
    type: "group",
    members: [creatorId], // Creator joins automatically
    adminId: creatorId,   // Assign admin role to creator
    pendingRequests: [],  // Initialize pending requests
    createdAt: serverTimestamp(),
  });
};

/**
 * Requests to join a Group Chat
 */
export const requestJoinGroupChat = async (roomId, userId, userData) => {
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    pendingRequests: arrayUnion({
      uid: userId,
      name: userData.name,
      photo: userData.photo,
      timestamp: new Date().toISOString()
    })
  });
};

/**
 * Approves a Join Request
 */
export const approveJoinRequest = async (roomId, userId, userData) => {
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    members: arrayUnion(userId),
    pendingRequests: arrayRemove(userData) // userData must match exactly for arrayRemove
  });
};

/**
 * Rejects a Join Request
 */
export const rejectJoinRequest = async (roomId, userData) => {
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    pendingRequests: arrayRemove(userData)
  });
};

/**
 * Joins a Group Chat (Legacy / Direct) - Keep for backward compatibility if needed, but we'll use requests mostly
 */
export const joinGroupChat = async (roomId, userId) => {
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    members: arrayUnion(userId)
  });
};

/**
 * Creates a new Private Chat directly between two users, or returns existing one.
 */
export const createOrGetPrivateChat = async (userId1, userId2) => {
  const chatRoomsRef = collection(db, "chatRooms");

  // Check if a private chat already exists between these two users
  const q = query(
    chatRoomsRef,
    where("type", "==", "private"),
    where("members", "array-contains", userId1)
  );

  const snap = await getDocs(q);
  const existing = snap.docs.find(doc => doc.data().members?.includes(userId2));

  if (existing) {
    return existing.id; // Return existing chat room ID
  }

  // Create a new private chat
  const newChat = await addDoc(chatRoomsRef, {
    name: "Private Chat",
    type: "private",
    members: [userId1, userId2],
    adminId: "system",
    createdAt: serverTimestamp(),
  });

  return newChat.id;
};

/**
 * Leaves a Group Chat
 */
export const leaveGroupChat = async (roomId, userId) => {
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    members: arrayRemove(userId)
  });
};

/**
 * Subscribe to allowed chat rooms (Global, Groups, and User's Private chats)
 */
export const subscribeToChatRooms = (userId, callback) => {
  if (!userId) return () => { };

  const chatRoomsRef = collection(db, "chatRooms");

  // Query 1: Global, 1QAD, and Group rooms (Discovery)
  const qPublic = query(
    chatRoomsRef,
    where("type", "in", ["global", "1qad", "group"])
  );

  // Query 2: Private rooms where USER is a member
  const qPrivate = query(
    chatRoomsRef,
    where("type", "==", "private"),
    where("members", "array-contains", userId)
  );

  let publicRooms = [];
  let privateRooms = [];

  const updateAll = () => {
    // Merge lists
    const all = [...publicRooms, ...privateRooms];
    // Deduplicate by ID
    const unique = Array.from(new Map(all.map(r => [r.id, r])).values());
    // Sort by createdAt (JS sort since we merged)
    unique.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeA - timeB;
    });
    callback(unique);
  };

  const unsub1 = onSnapshot(qPublic, (snap) => {
    publicRooms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateAll();
  }, (err) => console.error("Error in public rooms sub:", err));

  const unsub2 = onSnapshot(qPrivate, (snap) => {
    privateRooms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateAll();
  }, (err) => console.error("Error in private rooms sub:", err));

  return () => {
    unsub1();
    unsub2();
  };
};

// -------------------------------------------------------------
// MESSAGES
// -------------------------------------------------------------

/**
 * Send a message to a specific room and notify members
 */
export const sendMessage = async (roomId, senderId, senderName, senderPhoto, text, imageUrl = null) => {
  if (!text.trim() && !imageUrl) return;

  // 1. Add Message to room
  const messagesRef = collection(db, "chatRooms", roomId, "messages");
  await addDoc(messagesRef, {
    text,
    imageUrl: imageUrl || null,
    senderId,
    senderName,
    senderPhoto: senderPhoto || null,
    timestamp: serverTimestamp(),
  });

  // Update room to indicate it has messages (prevents it from being hidden)
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
      hasMessages: true,
      lastMessageTime: serverTimestamp()
  });

  // 2. Handle Notifications (Skip for global to avoid spam)
  if (roomId === 'global') return;

  try {
    const roomRef = doc(db, "chatRooms", roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const roomData = roomSnap.data();
    const members = roomData.members || [];
    const roomName = roomData.name || "Chat Room";

    // For each member except sender
    for (const memberId of members) {
      if (memberId === senderId) continue;

      // Fetch member profile to check mute
      const memberRef = doc(db, "users", memberId);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        const memberData = memberSnap.data();
        const isMuted = !!memberData.mutedChats?.[roomId];

        if (!isMuted) {
          const notifMsg = imageUrl && !text.trim() ? "Sent an image" : (text.length > 50 ? text.substring(0, 47) + "..." : text);
          const notifRef = collection(db, "users", memberId, "notifications");
          await addDoc(notifRef, {
            title: `Message: ${senderName}`,
            message: notifMsg,
            type: "chat",
            unread: true,
            createdAt: serverTimestamp(),
            link: `/dashboard/chat?room=${roomId}`,
            roomId: roomId
          });
        }
      }
    }
  } catch (error) {
    console.error("Error sending notifications for message:", error);
  }
};

/**
 * Edit a specific message
 */
export const editMessage = async (roomId, messageId, newText) => {
  if (!roomId || !messageId || !newText.trim()) return;
  const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
  await updateDoc(messageRef, {
    text: newText.trim(),
    isEdited: true
  });
};

/**
 * Delete a specific message (soft delete)
 */
export const deleteMessage = async (roomId, messageId) => {
  if (!roomId || !messageId) return;
  const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
  await updateDoc(messageRef, {
    text: "This message was deleted",
    isDeleted: true,
    imageUrl: null
  });
};

/**
 * Mark room as read for a user (for seen by feature)
 */
export const markRoomAsRead = async (roomId, userId) => {
  if (!roomId || !userId) return;
  try {
    const roomRef = doc(db, "chatRooms", roomId);
    // Use dot notation to update a specific key inside the readReceipts map
    await updateDoc(roomRef, {
      [`readReceipts.${userId}`]: serverTimestamp()
    });

    // Also clear notifications for this room so unread badges stay accurate
    const notifsRef = collection(db, "users", userId, "notifications");
    const q = query(notifsRef, where("roomId", "==", roomId), where("unread", "==", true));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
       const batch = writeBatch(db);
       snap.forEach(docSnap => {
           batch.update(docSnap.ref, { unread: false });
       });
       await batch.commit();
    }

  } catch (err) {
    console.error("Error marking room as read:", err);
  }
};

/**
 * Subscribe to messages for a specific room
 */
export const subscribeToMessages = (roomId, callback) => {
  if (!roomId) return () => { };
  const messagesRef = collection(db, "chatRooms", roomId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};

/**
 * Update a Group Chat Name
 */
export const updateGroupName = async (roomId, newName) => {
  if (!roomId || !newName.trim()) return;
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    name: newName.trim()
  });
};

/**
 * Update a Group Chat Icon
 */
export const updateGroupIcon = async (roomId, newIconUrl) => {
  if (!roomId || !newIconUrl) return;
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    iconUrl: newIconUrl
  });
};

/**
 * Delete a Group Chat
 */
export const deleteGroupChat = async (roomId) => {
  if (!roomId) return;
  const roomRef = doc(db, "chatRooms", roomId);
  await deleteDoc(roomRef);
};

/**
 * Kicks a user from a group chat
 */
export const kickUserFromRoom = async (roomId, targetUserId) => {
  if (!roomId || !targetUserId) return;
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    members: arrayRemove(targetUserId)
  });
};

/**
 * Bans a user from a room (prevents re-entry)
 */
export const banUserFromRoom = async (roomId, targetUserId) => {
  if (!roomId || !targetUserId) return;
  const roomRef = doc(db, "chatRooms", roomId);
  await updateDoc(roomRef, {
    bannedUsers: arrayUnion(targetUserId),
    members: arrayRemove(targetUserId) // Also kick them if they were a member
  });
};
