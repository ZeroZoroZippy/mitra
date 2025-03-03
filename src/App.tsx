import React, { useRef, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./utils/firebaseAuth"; // ✅ Ensure correct import path
import LandingPage from "./pages/LandingPage";
import ChatLayout from "./components/chat/screens/components/ChatLayout";
import PrivacyPolicy from "./pages/PrivacyPolicy"; // ✅ Import Privacy Policy Page
import Dashboard from "./pages/Dashboard";

const ProtectedRoute: React.FC<{ element: JSX.Element }> = ({ element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user); // ✅ Update state based on auth status
    });
    return () => unsubscribe();
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>; // Show loader while checking auth
  return isAuthenticated ? element : <Navigate replace to="/" />;
};

const App: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);

  return (
    <Routes>
      <Route path="/" element={<LandingPage featuresRef={featuresRef} />} />
      <Route path="/home" element={<LandingPage featuresRef={featuresRef}/>} />
      <Route path="/chat" element={<ProtectedRoute element={<ChatLayout />} />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} /> {/* ✅ Add Privacy Policy Route */}
      <Route path="*" element={<LandingPage featuresRef={featuresRef} />} />
      <Route path="/dashboard" element={<Dashboard />} /> {/* ✅ Add Dashboard Route */}
    </Routes>
  );
};

export default App;