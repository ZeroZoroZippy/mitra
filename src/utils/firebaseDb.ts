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
  Timestamp,
} from "firebase/firestore";
import { app } from "./firebaseConfig";
import type { User } from "firebase/auth";
import { auth } from "./firebaseConfig";

const db = getFirestore(app);

// ✅ Use the existing constant name for encryption key
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

/**
 * ✅ Updated TypeScript Type for Messages with proper sender type
 */
interface Message {
  id: string;
  userId: string;
  text: string;
  sender: "user" | "assistant"; // Changed from "ai" to match the rest of the code
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
    timestamp: serverTimestamp(), // CHANGE: Use Firestore serverTimestamp()
    clientTimestamp: new Date().toISOString(), // Add client timestamp as backup
    likeStatus,
    encrypted: false,
    threadId,
  });
};

/**
 * ✅ Fixed Function to Retrieve Messages for a User
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
      const messageData = doc.data() as any;
      let timestamp: string;
      
      // Get timestamp in UTC first, then convert to IST
      let utcTimestamp: Date;
      
      if (messageData.timestamp && typeof messageData.timestamp === 'object' && 'toDate' in messageData.timestamp) {
        // For Firestore server timestamps
        utcTimestamp = messageData.timestamp.toDate();
      } else if (messageData.clientTimestamp && typeof messageData.clientTimestamp === 'string') {
        // For client timestamps (fallback)
        utcTimestamp = new Date(messageData.clientTimestamp);
      } else if (messageData.timestamp && typeof messageData.timestamp === 'string') {
        // For legacy string timestamps
        utcTimestamp = new Date(messageData.timestamp);
      } else {
        // Last resort fallback
        utcTimestamp = new Date();
        console.warn("Using current time as fallback for message: ", doc.id);
      }
      
      // Convert to IST format
      timestamp = utcTimestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      messages.push({
        id: doc.id,
        userId: userId,
        text: messageData.text,
        // Map "ai" to "assistant" for consistency if needed
        sender: messageData.sender === "ai" ? "assistant" : messageData.sender,
        timestamp: timestamp,
        encrypted: messageData.encrypted || false,
        likeStatus: messageData.likeStatus || null,
      });
    });

    // Store original Date objects for sorting
    const messagesWithDateObj = messages.map(msg => ({
      ...msg,
      _dateObj: new Date(msg.timestamp) // Store Date object for sorting
    }));
    
    // Sort messages by timestamp using the Date objects
    const sortedMessages = messagesWithDateObj
      .sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime())
      .map(({ _dateObj, ...msg }) => msg); // Remove _dateObj from final result

    return sortedMessages;
  } catch (error) {
    console.error("Error fetching messages:", error);
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
    console.error("Error storing user details:", error);
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
    console.error("Error getting user profile:", error);
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
    const messages: Message[] = [];
    
    querySnapshot.docs.forEach((doc) => {
      const messageData = doc.data() as any;
      let timestamp: string | null = null;
      
      // Process timestamp similar to getMessages
      if (messageData.timestamp) {
        if (typeof messageData.timestamp === 'object' && 'toDate' in messageData.timestamp) {
          try {
            timestamp = messageData.timestamp.toDate().toISOString();
          } catch (error) {
            // Skip invalid timestamp
          }
        } else if (typeof messageData.timestamp === 'string') {
          try {
            const date = new Date(messageData.timestamp);
            if (!isNaN(date.getTime())) {
              timestamp = date.toISOString();
            }
          } catch (error) {
            // Skip invalid timestamp
          }
        }
      }
      
      if (timestamp) {
        messages.push({
          id: doc.id,
          userId: userId,
          text: messageData.text,
          sender: messageData.sender === "ai" ? "assistant" : messageData.sender,
          timestamp: timestamp,
          encrypted: messageData.encrypted || false,
          likeStatus: messageData.likeStatus || null,
        });
      }
    });

    const sortedMessages = messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    callback(sortedMessages);
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
    console.error("Error updating like status:", error);
  }
};

export { db };