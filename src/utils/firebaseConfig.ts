import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// ✅ Firebase Configuration (Replace with actual values)
const firebaseConfig = {
  apiKey: "AIzaSyAag0C_xzFpylDSv89eIo3e9B1r_5rwfFs",
  authDomain: "mitra-a531e.firebaseapp.com",
  projectId: "mitra-a531e",
  storageBucket: "mitra-a531e.firebasestorage.app",
  messagingSenderId: "375657398776",
  appId: "1:375657398776:web:05f9d4813a60fd518b560d",
  measurementId: "G-1TN0BWWHD8"
};

// ✅ Initialize Firebase App
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { app, auth }; // ✅ Export Firebase instance for other services to use