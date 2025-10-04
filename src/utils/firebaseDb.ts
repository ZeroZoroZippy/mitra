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
  deleteDoc,
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

// ============== NEW CHAT-BASED FUNCTIONS ==============

export interface Chat {
  id: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  threadId: number;
}

/**
 * Create a new chat for the current user
 * @param threadId - The thread/persona ID (1-7)
 * @returns The ID of the newly created chat, or null on failure
 */
export const createChat = async (threadId: number): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const chatRef = await addDoc(collection(db, `users/${user.uid}/chats`), {
      title: "New Chat",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      threadId,
    });
    console.log("Created new chat with ID:", chatRef.id);
    return chatRef.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    return null;
  }
};

/**
 * Get all chats for a user, sorted by updatedAt (most recent first)
 * @param userId - The user's ID
 * @returns Array of chats
 */
export const getChats = async (userId: string): Promise<Chat[]> => {
  try {
    const q = query(
      collection(db, `users/${userId}/chats`),
      orderBy("updatedAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title || "New Chat",
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
      threadId: doc.data().threadId || 1,
    }));
  } catch (error) {
    console.error("Error fetching chats:", error);
    return [];
  }
};

/**
 * Delete a chat and all its messages
 * @param userId - The user's ID
 * @param chatId - The chat ID to delete
 * @returns true on success, false on failure
 */
export const deleteChat = async (userId: string, chatId: string): Promise<boolean> => {
  try {
    // Delete all messages in the chat
    const messagesQuery = query(collection(db, `users/${userId}/chats/${chatId}/messages`));
    const messagesSnapshot = await getDocs(messagesQuery);

    const deletePromises = messagesSnapshot.docs.map((messageDoc) =>
      deleteDoc(messageDoc.ref)
    );
    await Promise.all(deletePromises);

    // Delete the chat document
    const chatRef = doc(db, `users/${userId}/chats`, chatId);
    await deleteDoc(chatRef);

    console.log("Deleted chat:", chatId);
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

/**
 * Update the title of a chat
 * @param userId - The user's ID
 * @param chatId - The chat ID
 * @param title - The new title
 * @returns true on success, false on failure
 */
export const updateChatTitle = async (
  userId: string,
  chatId: string,
  title: string
): Promise<boolean> => {
  try {
    const chatRef = doc(db, `users/${userId}/chats`, chatId);
    await updateDoc(chatRef, {
      title,
      updatedAt: serverTimestamp(),
    });
    console.log("Updated chat title:", chatId, title);
    return true;
  } catch (error) {
    console.error("Error updating chat title:", error);
    return false;
  }
};

/**
 * Save a message to a specific chat
 * @param chatId - The chat ID
 * @param text - The message text
 * @param sender - "user" or "assistant"
 * @param likeStatus - Optional like/dislike status
 * @param threadId - Optional thread ID
 */
export const saveChatMessage = async (
  chatId: string,
  text: string,
  sender: "user" | "assistant",
  likeStatus: "like" | "dislike" | null = null,
  threadId?: number
) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await addDoc(collection(db, `users/${user.uid}/chats/${chatId}/messages`), {
      text: text,
      sender,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
      likeStatus,
      encrypted: sender === 'user',
      threadId,
    });

    // Update the chat's updatedAt timestamp
    const chatRef = doc(db, `users/${user.uid}/chats`, chatId);
    await updateDoc(chatRef, {
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving chat message:", error);
  }
};

/**
 * Get messages for a specific chat
 * @param userId - The user's ID
 * @param chatId - The chat ID
 * @param threadId - The thread ID (for filtering)
 * @returns Array of messages
 */
export const getChatMessages = async (
  userId: string,
  chatId: string,
  threadId: number
): Promise<Message[]> => {
  try {
    const q = query(
      collection(db, `users/${userId}/chats/${chatId}/messages`),
      orderBy("clientTimestamp", "asc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const messageData = doc.data();
      const isEncrypted = messageData.encrypted || false;
      const sender = messageData.sender === "ai" ? "assistant" : messageData.sender;

      // Decrypt user messages if they're encrypted
      const text = isEncrypted && sender === "user"
        ? decryptMessage(messageData.text, true)
        : messageData.text;

      return {
        id: doc.id,
        userId: userId,
        text: text,
        sender: sender,
        timestamp: messageData.clientTimestamp || new Date().toISOString(),
        threadId: messageData.threadId || threadId,
        encrypted: false, // Mark as decrypted after processing
        likeStatus: messageData.likeStatus || null,
      };
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return [];
  }
};

/**
 * Listen for real-time updates to messages in a specific chat
 * @param userId - The user's ID
 * @param chatId - The chat ID
 * @param threadId - The thread ID
 * @param callback - Callback function to handle new messages
 * @returns Unsubscribe function
 */
export const listenForChatMessages = (
  userId: string,
  chatId: string,
  threadId: number,
  callback: (messages: Message[]) => void
) => {
  const q = query(
    collection(db, `users/${userId}/chats/${chatId}/messages`),
    orderBy("clientTimestamp", "asc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map((doc) => {
      const messageData = doc.data();
      return {
        id: doc.id,
        userId: userId,
        text: messageData.text,
        sender: messageData.sender === "ai" ? "assistant" : messageData.sender,
        timestamp: messageData.clientTimestamp || new Date().toISOString(),
        threadId: messageData.threadId || threadId,
        encrypted: messageData.encrypted || false,
        likeStatus: messageData.likeStatus || null,
      };
    }).filter(msg => !!msg.timestamp);

    callback(messages as Message[]);
  });
};

