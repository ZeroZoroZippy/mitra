import CryptoJS from "crypto-js";
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
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { app } from "./firebaseConfig";
import type { User } from "firebase/auth";
import { auth } from "./firebaseConfig";

const db = getFirestore(app);

// ✅ Use the existing constant name for encryption key
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

/**
 * ✅ Use the existing TypeScript Type for Messages
 */
interface Message {
  id: string;
  userId: string;
  text: string;
  sender: "user" | "ai";
  timestamp: string;
  likeStatus?: "like" | "dislike" | null;
  encrypted?: boolean;
}

const convertToIST = (utcTimestamp: string): string => {
  const date = new Date(utcTimestamp);
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

// ✅ Keep existing encryption function name
export const encryptMessage = (text: string): string => {
  if (!ENCRYPTION_KEY) {
    return text;
  }

  const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  return encrypted;
};

// ✅ Keep existing decryption function name
export const decryptMessage = (encryptedText: string, isEncrypted: boolean): string => {
  if (!isEncrypted || !encryptedText.startsWith("U2FsdGVkX1")) {
    return encryptedText;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) throw new Error("Decryption produced empty result");

    return decryptedText;
  } catch (error: any) {
    return "[Decryption Failed]";
  }
};

/**
 * ✅ Use the existing function name for saving messages
 */
export const saveMessage = async (
  text: string,
  sender: "user" | "assistant",
  likeStatus: "like" | "dislike" | null = null,
  threadId?: number,
) => {
  const user = auth.currentUser;
  if (!user) {
    return;
  }

  await addDoc(collection(db, `users/${user.uid}/messages`), {
    text: text,
    sender,
    timestamp: new Date().toISOString(),
    likeStatus,
    encrypted: false,
    threadId,
  });
};

/**
 * ✅ Function to Retrieve Messages for a User (Now Restored)
 */
export const getMessages = async (userId: string, activeChatId: number): Promise<Message[]> => {
  try {
    const q = query(
      collection(db, `users/${userId}/messages`),
      where("threadId", "==", activeChatId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return [];
    }

    const messages: Message[] = [];

    querySnapshot.docs.forEach((doc) => {
      const messageData = doc.data() as Message;
      let timestamp: string | null = null;

      // Handle Firestore Timestamp object
      if (messageData.timestamp && typeof messageData.timestamp === 'object' && 'toDate' in messageData.timestamp) {
        try {
          const date = (messageData.timestamp as any).toDate(); // Cast to any to access toDate()
          if (!isNaN(date.getTime())) {
            timestamp = date.toISOString();
          }
        } catch (error) {
          return; // Skip this message
        }
      } 
      // Handle string timestamp
      else if (typeof messageData.timestamp === 'string') {
        try {
          const date = new Date(messageData.timestamp);
          if (!isNaN(date.getTime())) {
            timestamp = date.toISOString();
          }
        } catch (error) {
          return; // Skip this message
        }
      } 
      // Handle missing or invalid timestamp
      else {
        return; // Skip this message
      }

      // Only add message if timestamp is not null
      if (timestamp) {
      messages.push({
        id: doc.id,
        userId: userId,
        text: messageData.text,
        sender: messageData.sender,
          timestamp: timestamp,
          encrypted: false, // Adjust based on your data
        likeStatus: messageData.likeStatus || null,
      });
      }
    });

    // Sort messages by timestamp
    const sortedMessages = messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sortedMessages;
  } catch (error) {
    return [];
  }
};

/**
 * ✅ Use the existing function name for storing user details (Encrypting Name & Email)
 */
export const storeUserDetails = async (user: User): Promise<void> => {
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const encryptedDisplayName = encryptMessage(user.displayName || "");
      const encryptedEmail = encryptMessage(user.email || "");

      await setDoc(userRef, {
        uid: user.uid,
        displayName: encryptedDisplayName,
        email: encryptedEmail,
        photoURL: user.photoURL || "",
        signInTimestamp: serverTimestamp(),
      });
    }
  } catch (error) {
  }
};

/**
 * ✅ Use the existing function name for retrieving user profile (Decrypting Name & Email)
 */
export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        uid: userData.uid,
        displayName: decryptMessage(userData.displayName, true), // ✅ Decrypt Name
        email: decryptMessage(userData.email, true), // ✅ Decrypt Email
        photoURL: userData.photoURL || "",
        signInTimestamp: userData.signInTimestamp,
      };
    }
  } catch (error) {
    return null;
  }
};

/**
 * ✅ Use the existing function name for listening to real-time messages
 */
export const listenForMessages = (
  userId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(collection(db, `users/${userId}/messages`));

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    callback(messages);
  });
};

/**
 * ✅ Use the existing function name for updating like/dislike status on AI messages
 */
export const updateLikeStatus = async (
  messageId: string,
  newStatus: "like" | "dislike" | null
) => {
  const user = auth.currentUser;
  if (!messageId || !user) return;

  try {
    const messageRef = doc(db, `users/${user.uid}/messages`, messageId);
    await updateDoc(messageRef, { likeStatus: newStatus });
  } catch (error) {
  }
};

export { db };
