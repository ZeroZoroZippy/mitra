import {
  signInWithPopup,
  GoogleAuthProvider,
  User,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  getAdditionalUserInfo,
} from "firebase/auth";
import { auth } from "./firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseDb";

// ✅ Set authentication persistence
const setupAuth = async () => {
  await setPersistence(auth, browserLocalPersistence);
};
setupAuth();

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

    console.log("🔥 Full User Data from Firebase:", user);

    if (!user) {
      console.error("❌ No user returned from Firebase.");
      return null;
    }

    if (!user.displayName || !user.email) {
      console.warn("⚠️ Missing user profile data:", {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });

      // ✅ Force Firebase to update missing profile data
      await updateProfile(user, {
        displayName: user.displayName || "New User",
      });
    }

    const additionalUserInfo = getAdditionalUserInfo(result);

    // ✅ If it's the user's first sign-in, log details to Google Sheets
    if (true || additionalUserInfo?.isNewUser) { // Force logging for testing
      console.log("🆕 Attempting to log user to Google Sheets...");
      await logUserToGoogleSheet(user);
    }

    await storeUserDetails(user); // ✅ Save user data to Firestore
    return user;
  } catch (error) {
    console.error("❌ Sign-in error:", error);
    return null;
  }
};

// ✅ Function to Store User Details in Firestore
export const storeUserDetails = async (user: User) => {
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        displayName: user.displayName || "Anonymous",
        email: user.email || "No Email",
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ User details stored in Firestore:", user);
  } catch (error) {
    console.error("❌ Error storing user details:", error);
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

    console.log("✅ User logged in Google Sheets successfully:", user);
  } catch (error) {
    console.error("❌ Error logging user to Google Sheets:", error);
  }
};

export { auth };