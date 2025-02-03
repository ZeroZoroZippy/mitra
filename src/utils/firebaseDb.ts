import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot, // ✅ Import onSnapshot for real-time updates
} from "firebase/firestore";
import { app } from "./firebaseConfig"; // ✅ Import Firebase app
import type { User } from "firebase/auth";

const db = getFirestore(app);

/**
 * ✅ Define TypeScript Type for Messages
 */
interface Message {
  id: string;
  userId: string;
  text: string;
  sender: "user" | "ai";
  timestamp: string;
}

/**
 * ✅ Function to Save a Message to Firestore (Now Supports Both User & AI Messages)
 * @param userId - The authenticated user's ID
 * @param text - The message content
 * @param sender - 'user' or 'ai'
 */
export const saveMessage = async (
  userId: string,
  text: string,
  sender: "user" | "ai"
) => {
  try {
    console.log(`Saving message:`, { userId, text, sender }); // ✅ Debug log

    await addDoc(collection(db, "messages"), {
      userId,
      text,
      sender, // ✅ Saves both user and AI messages
      timestamp: new Date().toISOString(), // ✅ Ensures correct sorting
    });
  } catch (error) {
    console.error("Error saving message:", error);
  }
};

/**
 * ✅ Function to Retrieve Messages for a User (Now Fetches AI Messages Too)
 * @param userId - The authenticated user's ID
 * @returns Array of messages sorted by timestamp
 */
export const getMessages = async (userId: string): Promise<Message[]> => {
  try {
    const q = query(collection(db, "messages")); // ✅ Fetches all messages (both user & AI)
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Message)) // ✅ Properly type Firestore documents
      .filter((msg) => msg.sender === "user" || msg.sender === "ai") // ✅ Ensures AI messages are included
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // ✅ Sorts messages by timestamp
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

/**
 * ✅ Function to Listen for Real-Time Messages (Ensures Live Updates Without Refresh)
 * @param userId - The authenticated user's ID
 * @param callback - Function to update messages in UI
 */
export const listenForMessages = (
  userId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(collection(db, "messages"));

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Message)) // ✅ Properly type Firestore documents
      .filter((msg) => msg.userId === userId || msg.sender === "ai") // ✅ Includes AI messages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    callback(messages); // ✅ Updates UI in real-time
  });
};

/**
 * ✅ Function to Store User Details in Firestore (No Changes Here)
 * @param user - The Firebase User object
 */
export const storeUserDetails = async (user: User): Promise<void> => {
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        signInTimestamp: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error storing user details:", error);
  }
};

export { db };