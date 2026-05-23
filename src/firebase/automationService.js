import { doc, collection, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { leetcodeQuestions } from "../utils/leetcodeQuestions";

/**
 * Triggered on app load. Checks if a LeetCode question was posted today in the 1qad room.
 * Uses a Firestore Transaction to guarantee only 1 post per day, even if 100 users load the app simultaneously.
 */
export const triggerDailyLeetcodePost = async () => {
    try {
        const today = new Date().toISOString().split("T")[0]; // e.g. "2026-05-23"
        const qadRef = doc(db, "chatRooms", "1qad");

        await runTransaction(db, async (transaction) => {
            const qadDoc = await transaction.get(qadRef);
            
            if (!qadDoc.exists()) {
                // The room doesn't exist yet, wait for chatService to initialize it on another load
                return;
            }

            const data = qadDoc.data();
            
            // Check if we already posted today (including the bugfix flag)
            if (data.lastPostDate === today && data.fixedTimestampBug === true) {
                return; // Already posted, do nothing
            }

            // Pick a random question
            const randomQuestion = leetcodeQuestions[Math.floor(Math.random() * leetcodeQuestions.length)];

            // Create the new poll message
            const messagesRef = collection(qadRef, "messages");
            const newMsgRef = doc(messagesRef); // Auto-generate ID
            
            const messageData = {
                text: `**Today's LeetCode Challenge:**\n[${randomQuestion.title}](${randomQuestion.url})\nDifficulty: ${randomQuestion.difficulty}`,
                senderId: "system",
                senderName: "1QAD Bot",
                senderPhoto: null,
                timestamp: serverTimestamp(),
                type: "1qad_poll",
                questionData: randomQuestion,
                pollResponses: [] // Array to hold { uid, name, photo }
            };

            // Write the message
            transaction.set(newMsgRef, messageData);

            // Update the last post date on the room
            transaction.update(qadRef, {
                lastPostDate: today,
                fixedTimestampBug: true,
                lastMessage: `Today's Challenge: ${randomQuestion.title}`,
                lastMessageTime: serverTimestamp()
            });
        });
        
    } catch (error) {
        console.error("Error triggering daily Leetcode post:", error);
    }
};
