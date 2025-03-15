import {
  signInWithPopup,
  GoogleAuthProvider,
  User,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  getAdditionalUserInfo,
  signInAnonymously,
} from "firebase/auth";
import { auth } from "./firebaseConfig";
import { storeUserDetails, db } from "./firebaseDb";
import { doc, setDoc, updateDoc, increment } from "firebase/firestore";

// ✅ Set authentication persistence
const setupAuth = async () => {
  await setPersistence(auth, browserLocalPersistence);
};
setupAuth();

// ✅ Guest User Sign-In Function
export const signInAsGuest = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    // Set up guest user in Firestore
    await setDoc(doc(db, "users", user.uid), {
      isGuest: true,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      displayName: "Guest User"
    });
    
    // Track new guest account creation
    const statsRef = doc(db, "statistics", "guestUsage");
    await updateDoc(statsRef, {
      totalGuestAccounts: increment(1)
    }).catch(err => console.error("Error tracking guest account creation:", err));
    
    localStorage.setItem("isGuestUser", "true");
    return user;
  } catch (error) {
    console.error("Error signing in as guest:", error);
    throw error;
  }
};

// ✅ Set authentication persistence
export const isCreator = (): boolean => {
  const user = auth.currentUser;
  const creatorStatus = user ? user.email === "yuvaanvithlani@gmail.com" : false;
  return creatorStatus;
};

// ✅ Configure Google Provider with Scopes & Force Full Account Selection
const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");
provider.setCustomParameters({ prompt: "select_account" }); // ✅ Forces Google to show account selection

const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzEazlMx80cMtvh1_x4tg8geuZz2n4UDcXQ6Y_S_zV_hn96NQT6Q-6ehIbinj5JMdfP/exec"; // ✅ Replace with actual Web App URL

// ✅ Google Sign-In Function with First-Time Sign-In Logging
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!user) {
      return null;
    }

    if (!user.displayName || !user.email) {
      // ✅ Force Firebase to update missing profile data
      await updateProfile(user, {
        displayName: user.displayName || "New User",
      });
    }

    const additionalUserInfo = getAdditionalUserInfo(result);

    // ✅ If it's the user's first sign-in, log details to Google Sheets
    if (true || additionalUserInfo?.isNewUser) { // Force logging for testing
      await logUserToGoogleSheet(user);
    }

    await storeUserDetails(user); // ✅ Save user data to Firestore with encryption
    return user;
  } catch (error) {
    return null;
  }
};

// ✅ Function to Log First-Time Users to Google Sheets (with CORS fix)
const logUserToGoogleSheet = async (user: User) => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors", // ✅ Bypass CORS issues
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        name: user.displayName || "Anonymous",
        email: user.email || "No Email",
        photoURL: user.photoURL || "",
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {}
};

export { auth };