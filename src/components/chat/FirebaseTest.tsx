import React, { useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../../../../utils/firebaseAuth";

const FirebaseTest: React.FC = () => {
  
  useEffect(() => {
    // ✅ Run a Firebase Test when the component loads
    checkAuthState();
  }, []);

  const checkAuthState = () => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // console.log("✅ User is logged in:", user);
      } else {
        // console.log("❌ No user logged in");
      }
    });
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
        // console.log("✅ Signed in:", result.user);
    } catch (error) {
      console.error("❌ Sign-in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
        // console.log("✅ Signed out successfully");
    } catch (error) {
      console.error("❌ Sign-out error:", error);
    }
  };

  return (
    <div>
      <h1>Firebase Test</h1>
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
};

export default FirebaseTest;