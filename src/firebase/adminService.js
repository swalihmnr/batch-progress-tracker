import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Broadcasts a custom notification to every user in the database.
 * Uses batch writes to handle potentially large numbers of users efficiently.
 */
export const broadcastAnnouncement = async (title, message, link) => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        
        let batch = writeBatch(db);
        let count = 0;
        let totalSent = 0;

        for (const userDoc of usersSnap.docs) {
            const notifRef = doc(collection(db, "users", userDoc.id, "notifications"));
            batch.set(notifRef, {
                title: title.trim() || "Announcement",
                message: message.trim(),
                type: "announcement",
                unread: true,
                createdAt: serverTimestamp(),
                link: link?.trim() || null
            });
            
            count++;
            totalSent++;

            // Firestore batches have a 500 operation limit. 
            // We commit at 490 to be safe.
            if (count === 490) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }

        // Commit any remaining operations in the last batch
        if (count > 0) {
            await batch.commit();
        }

        return totalSent;
    } catch (error) {
        console.error("Error broadcasting announcement:", error);
        throw error;
    }
};
