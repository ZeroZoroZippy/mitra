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
import { getFirebaseAuth, getFirebaseDb } from "./firebaseConfig";
import { storeUserDetails } from "./firebaseDb";
import { doc, setDoc, updateDoc, increment } from "firebase/firestore";

// Track if auth persistence has been set up
let authPersistenceInitialized = false;

// ✅ Set authentication persistence (lazy initialization)
const setupAuth = async () => {
  if (authPersistenceInitialized) return;

  const auth = getFirebaseAuth();
  if (!auth) {
    console.warn("Cannot setup auth persistence - Firebase auth not initialized");
    return;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    authPersistenceInitialized = true;
  } catch (error) {
    console.warn("Failed to set auth persistence:", error);
  }
};

// ✅ Guest User Sign-In Function with enhanced error handling
export const signInAsGuest = async () => {
  // Ensure auth persistence is set up
  await setupAuth();

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }

  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    // Set up guest user in Firestore with retry mechanism
    if (db) {
      try {
        await setDoc(doc(db, "users", user.uid), {
          isGuest: true,
          messageCount: 0,
          createdAt: new Date().toISOString(),
          displayName: "Guest User"
        });
      } catch (firestoreError) {
        console.warn("Failed to create guest user document in Firestore:", firestoreError);
        // Continue with authentication even if Firestore fails
      }

      // Track new guest account creation (non-blocking)
      try {
        const statsRef = doc(db, "statistics", "guestUsage");
        await updateDoc(statsRef, {
          totalGuestAccounts: increment(1)
        });
      } catch (statsError) {
        console.warn("Failed to track guest account creation:", statsError);
        // Analytics failure should not block authentication
      }
    }

    localStorage.setItem("isGuestUser", "true");
    console.log("Guest authentication successful");
    return user;
  } catch (error: any) {
    console.error("Error signing in as guest:", error);

    // Provide more specific error messages
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many authentication attempts. Please try again later.');
    } else {
      throw new Error('Authentication failed. Please try again.');
    }
  }
};

// ✅ Check if current user is the creator
export const isCreator = (): boolean => {
  const auth = getFirebaseAuth();
  if (!auth) return false;

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

// ✅ Google Sign-In Function with Enhanced Error Handling
export const signInWithGoogle = async (): Promise<User | null> => {
  // Ensure auth persistence is set up
  await setupAuth();

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase authentication not initialized');
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    if (!user) {
      console.error('Google sign-in succeeded but no user returned');
      return null;
    }

    // Update profile if missing data
    if (!user.displayName || !user.email) {
      try {
        await updateProfile(user, {
          displayName: user.displayName || "New User",
        });
      } catch (profileError) {
        console.warn('Failed to update user profile:', profileError);
        // Continue authentication even if profile update fails
      }
    }

    const additionalUserInfo = getAdditionalUserInfo(result);

    // Log first-time users to Google Sheets (non-blocking)
    if (true || additionalUserInfo?.isNewUser) { // Force logging for testing
      logUserToGoogleSheet(user).catch(err => {
        console.warn('Failed to log user to Google Sheets:', err);
        // Logging failure should not block authentication
      });
    }

    // Save user data to Firestore (non-blocking for secondary operations)
    try {
      await storeUserDetails(user);
    } catch (firestoreError) {
      console.warn('Failed to store user details in Firestore:', firestoreError);
      // Continue authentication even if Firestore storage fails
    }

    console.log('Google sign-in successful');
    return user;
  } catch (error: any) {
    console.error('Google sign-in failed:', error);

    // Provide user-friendly error messages
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Sign-in popup closed by user');
      return null; // User cancelled, don't show error
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup blocked by browser. Please allow popups and try again.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many sign-in attempts. Please try again later.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Please contact support.');
    } else {
      throw new Error('Google sign-in failed. Please try again.');
    }
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

// Export the getter function that components should use
export const getAuth = getFirebaseAuth;