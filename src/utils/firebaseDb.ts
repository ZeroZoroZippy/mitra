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
  onSnapshot,
} from "firebase/firestore";
import { app } from "./firebaseConfig"; 
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
 * ✅ Function to Save a Message to Firestore (Now Supports Both User & AI Messages)\
 */
export const saveMessage = async (
  userId: string,
  text: string,
  sender: "user" | "ai"
) => {
  try {
    console.log(`Saving message:`, { userId, text, sender });

    await addDoc(collection(db, "messages"), {
      userId,
      text,
      sender,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving message:", error);
  }
};

/**
 * ✅ Function to Retrieve Messages for a User (Optimized Firestore Query)
 */
export const getMessages = async (userId: string): Promise<Message[]> => {
  try {
    const q = query(collection(db, "messages"), where("userId", "==", userId)); // 🔥 Now filters at Firestore level
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

/**
 * ✅ Function to Listen for Real-Time Messages (Optimized Firestore Query)
 */
export const listenForMessages = (
  userId: string,
  callback: (messages: Message[]) => void
) => {
  const q = query(collection(db, "messages"), where("userId", "==", userId)); // 🔥 Firestore-level filtering

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    callback(messages);
  });
};

/**
 * ✅ Function to Store User Details in Firestore
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

/**
 * ✅ Function to Retrieve User Profile (Including Google Profile Picture)
 */
export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      console.warn("User profile not found in Firestore. Creating new profile.");
      const defaultProfile = {
        uid: userId,
        displayName: "",  // or a default value if available
        email: "",
        photoURL: "",
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, defaultProfile);
      return defaultProfile;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export { db };