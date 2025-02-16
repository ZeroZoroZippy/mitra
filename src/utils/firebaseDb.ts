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
    console.error("❌ ENCRYPTION_KEY is missing! Encryption will fail.");
    return text;
  }

  const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  console.log(`🔐 Encrypting: ${text} → ${encrypted}`);
  return encrypted;
};

// ✅ Keep existing decryption function name
export const decryptMessage = (encryptedText: string, isEncrypted: boolean): string => {
  if (!isEncrypted || !encryptedText.startsWith("U2FsdGVkX1")) {
    return encryptedText;
  }

  try {
    console.log("🔍 Attempting to decrypt:", encryptedText);
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) throw new Error("Decryption produced empty result");

    console.log("✅ Successfully decrypted:", decryptedText);
    return decryptedText;
  } catch (error: any) {
    console.error("❌ Decryption Error:", error.message, " | Text:", encryptedText);
    return "[Decryption Failed]";
  }
};

/**
 * ✅ Use the existing function name for saving messages
 */
export const saveMessage = async (
  id: string,
  text: string,
  sender: "user" | "assistant",
  likeStatus: "like" | "dislike" | null = null
) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user found.");
    return;
  }

  await setDoc(doc(db, `users/${user.uid}/messages`, id), {
    text: text,
    sender,
    timestamp: new Date().toISOString(),
    likeStatus,
    encrypted: false
  });
};

/**
 * ✅ Function to Retrieve Messages for a User (Now Restored)
 */
export const getMessages = async (userId: string): Promise<Message[]> => {
  try {
    console.log(`🔍 Fetching messages for user: users/${userId}/messages`);

    const q = query(collection(db, `users/${userId}/messages`));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn("⚠️ No messages found in Firestore.");
    }

    const messages = querySnapshot.docs.map((doc) => {
      const messageData = doc.data() as Message;

      return {
        id: doc.id,
        userId: userId,
        text: messageData.text,
        sender: messageData.sender,
        timestamp: new Date(messageData.timestamp).toISOString(),
        encrypted: false,
        likeStatus: messageData.likeStatus || null
      };
    });

    console.log("📥 Raw messages from Firestore:", messages);

    const sortedMessages = messages
      .filter(msg => msg.timestamp && !isNaN(new Date(msg.timestamp).getTime()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log("✅ Sorted messages for UI:", sortedMessages);

    return sortedMessages;
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
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

      console.log(`📌 Storing Encrypted Data → Name: ${encryptedDisplayName}, Email: ${encryptedEmail}`);

      await setDoc(userRef, {
        uid: user.uid,
        displayName: encryptedDisplayName,
        email: encryptedEmail,
        photoURL: user.photoURL || "",
        signInTimestamp: serverTimestamp(),
      });

      console.log("✅ User details stored successfully with encryption.");
    }
  } catch (error) {
    console.error("❌ Error storing encrypted user details:", error);
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
      
      console.log(`📥 Raw Data from Firestore:`, userData); // ✅ Check before decryption

      return {
        uid: userData.uid,
        displayName: decryptMessage(userData.displayName, true), // ✅ Decrypt Name
        email: decryptMessage(userData.email, true), // ✅ Decrypt Email
        photoURL: userData.photoURL || "",
        signInTimestamp: userData.signInTimestamp,
      };
    }
  } catch (error) {
    console.error("❌ Error fetching encrypted user profile:", error);
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

    console.log(`✅ Like/Dislike updated: ${messageId} → ${newStatus}`);
  } catch (error) {
    console.error("❌ Error updating Like/Dislike:", error);
  }
};

export { db };