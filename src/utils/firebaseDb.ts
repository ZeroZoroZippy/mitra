import CryptoJS from "crypto-js";
import {
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
  orderBy,
} from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import type { User } from "firebase/auth";
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

interface Message {
  id: string;
  userId: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  threadId: number;
  likeStatus?: "like" | "dislike" | null;
  encrypted?: boolean;
}

export const encryptMessage = (text: string): string => {
  if (!ENCRYPTION_KEY) return text;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decryptMessage = (encryptedText: string, isEncrypted: boolean): string => {
  if (!isEncrypted || !encryptedText || !encryptedText.startsWith("U2FsdGVkX1")) {
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

export const saveMessage = async (
  text: string,
  sender: "user" | "assistant",
  likeStatus: "like" | "dislike" | null = null,
  threadId?: number,
) => {
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, `users/${user.uid}/messages`), {
    text: text,
    sender,
    timestamp: serverTimestamp(),
    clientTimestamp: new Date().toISOString(),
    likeStatus,
    encrypted: sender === 'user',
    threadId,
  });
};

export const getMessages = async (userId: string, activeChatId: number): Promise<Message[]> => {
  try {
    const q = query(
      collection(db, `users/${userId}/messages`),
      where("threadId", "==", activeChatId),
      orderBy("clientTimestamp", "asc") // Changed from "timestamp" to "clientTimestamp"
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const messageData = doc.data();
      return {
        id: doc.id,
        userId: userId,
        text: messageData.text,
        sender: messageData.sender === "ai" ? "assistant" : messageData.sender,
        timestamp: messageData.clientTimestamp || new Date().toISOString(), // Use clientTimestamp
        threadId: messageData.threadId || activeChatId,
        encrypted: messageData.encrypted || false,
        likeStatus: messageData.likeStatus || null,
      };
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

export const storeUserDetails = async (user: User): Promise<void> => {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: encryptMessage(user.displayName || ""),
        email: encryptMessage(user.email || ""),
        photoURL: user.photoURL || "",
        signInTimestamp: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error storing user details:", error);
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        uid: userData.uid,
        displayName: decryptMessage(userData.displayName, true),
        email: decryptMessage(userData.email, true),
        photoURL: userData.photoURL || "",
        signInTimestamp: userData.signInTimestamp,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const listenForMessages = (
  userId: string,
  activeChatId: number,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    collection(db, `users/${userId}/messages`),
    where("threadId", "==", activeChatId),
    orderBy("clientTimestamp", "asc") // Changed from "timestamp" to "clientTimestamp"
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map((doc) => {
      const messageData = doc.data();
      return {
        id: doc.id,
        userId: userId,
        text: messageData.text,
        sender: messageData.sender === "ai" ? "assistant" : messageData.sender,
        timestamp: messageData.clientTimestamp || new Date().toISOString(), // Use clientTimestamp
        threadId: messageData.threadId,
        encrypted: messageData.encrypted || false,
        likeStatus: messageData.likeStatus || null,
      };
    }).filter(msg => !!msg.timestamp);

    callback(messages as Message[]);
  });
};

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

