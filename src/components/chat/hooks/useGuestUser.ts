import { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, updateDoc, increment } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from '../../../utils/firebaseConfig';

const GUEST_MESSAGE_LIMIT = 5;

// Helper functions that now live only inside the hook
const isGuestUser = () => localStorage.getItem("isGuestUser") === "true";
const getGuestMessageCount = () => parseInt(localStorage.getItem("guestMessageCount") || "0");

export const useGuestUser = () => {
  const [isGuest, setIsGuest] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(GUEST_MESSAGE_LIMIT);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // This effect runs once to initialize the guest state from local storage.
  useEffect(() => {
    const guestStatus = isGuestUser();
    setIsGuest(guestStatus);
    if (guestStatus) {
      const count = getGuestMessageCount();
      setRemainingMessages(Math.max(0, GUEST_MESSAGE_LIMIT - count));
    }
  }, []);

  const handleGuestMessageSend = useCallback(() => {
    const currentCount = getGuestMessageCount();
    
    if (currentCount >= GUEST_MESSAGE_LIMIT) {
      setShowLimitModal(true);
      return false; // Indicates that the message should not be sent
    }

    const newCount = currentCount + 1;
    localStorage.setItem("guestMessageCount", newCount.toString());
    setRemainingMessages(GUEST_MESSAGE_LIMIT - newCount);
    
    // Track the message in Firestore without revealing user info
    const db = getFirestore();
    const statsRef = doc(db, "statistics", "guestUsage");
    updateDoc(statsRef, { totalGuestMessages: increment(1) });
    
    return true; // Indicates the message can be sent
  }, []);

  const handleSignIn = useCallback(() => {
    const db = getFirestore();
    const statsRef = doc(db, "statistics", "guestUsage");
    updateDoc(statsRef, { conversions: increment(1) })
      .catch(err => console.error("Error tracking conversion:", err));

    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(() => {
        // Clear guest status from local storage after successful sign-in
        localStorage.removeItem("isGuestUser");
        localStorage.removeItem("guestMessageCount");
        setShowLimitModal(false);
        window.location.reload(); // Reload to reflect the new signed-in state
      })
      .catch((error) => {
        console.error("Error during sign in:", error);
      });
  }, []);

  return {
    isGuest,
    remainingMessages,
    showLimitModal,
    setShowLimitModal,
    handleGuestMessageSend,
    handleSignIn,
  };
};