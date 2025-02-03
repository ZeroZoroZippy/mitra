import {
  signInWithPopup,
  GoogleAuthProvider,
  User,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "./firebaseConfig";
await setPersistence(auth, browserLocalPersistence);

const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Sign-in error:", error);
    return null;
  }
};

// This function stores user details in local storage (for now)
// We later override this in LandingPage to use Firestore's storeUserDetails.
export async function storeUserDetails(user: User) {
  localStorage.setItem(
    "mitraUser",
    JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    })
  );
}

export { auth };
