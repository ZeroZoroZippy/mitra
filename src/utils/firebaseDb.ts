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
  } from "firebase/firestore";
  import { app } from "./firebaseConfig"; // ✅ Import Firebase app
  import type { User } from "firebase/auth";
  
  const db = getFirestore(app);
  
  /**
   * Function to Save a Message to Firestore
   * @param userId - The authenticated user's ID
   * @param text - The message content
   * @param sender - 'user' or 'ai'
   */
  export const saveMessage = async (
    userId: string,
    text: string,
    sender: "user" | "ai"
  ): Promise<void> => {
    try {
      await addDoc(collection(db, "messages"), {
        userId,
        text,
        sender,
        timestamp: new Date().toISOString(), // Alternatively, use serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };
  
  /**
   * Function to Retrieve Messages for a User
   * @param userId - The authenticated user's ID
   * @returns Array of messages sorted by timestamp
   */
  export const getMessages = async (userId: string) => {
    try {
      const q = query(collection(db, "messages"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  };
  
  /**
   * Function to Store User Details in Firestore
   * Call this after a successful Google Sign-In.
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