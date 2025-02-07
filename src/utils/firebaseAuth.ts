import {
  signInWithPopup,
  GoogleAuthProvider,
  User,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
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

// ✅ Google Sign-In Function with Debugging
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

export { auth };