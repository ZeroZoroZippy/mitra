import React, { useRef, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./utils/firebaseAuth";
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import LandingPage from "./pages/LandingPage";
import ChatLayout from "./components/chat/screens/components/ChatLayout";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Dashboard from "./pages/Dashboard";

// Move this to a constant that can be imported elsewhere if needed
export const APP_VERSION = '2.0.5';

const ProtectedRoute: React.FC<{ element: JSX.Element }> = ({ element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;
  return isAuthenticated ? element : <Navigate replace to="/" />;
};

function showUpdateModal() {
  const modalStyles = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(29,29,29,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  const modal = document.createElement('div');
  modal.setAttribute('style', modalStyles);
  modal.innerHTML = `
    <div style="background: #2d2d2d; border-radius: 12px; padding: 24px; max-width: 400px; text-align: center; font-family: 'Poppins', sans-serif;">
      <h3 style="color: #fff; margin-top: 0; font-size: 1.4rem;">Saarth Has Evolved</h3>
      <p style="color: #aaa;">We've enhanced your experience with new insights and capabilities.</p>
      <button 
        onclick="localStorage.setItem('app_version_cache', '${APP_VERSION}'); window.location.reload(true)" 
        style="background: linear-gradient(45deg, #FDD844, #FFEC9F); border: none; color: #1d1d1d; padding: 12px 24px; border-radius: 24px; font-weight: 500; cursor: pointer; font-family: 'Poppins', sans-serif;">
        Update Now
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

const App: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // This ensures Firebase is initialized before checking version
    const checkAppVersion = async () => {
      try {
        // Add timestamp to force fresh request
        const db = getFirestore();
        const configDoc = await getDoc(doc(db, `config/appVersion?_=${Date.now()}`));
        const serverVersion = configDoc.data()?.version;
        
        console.log("Version check:", { clientVersion: APP_VERSION, serverVersion });
        
        if (serverVersion && serverVersion !== APP_VERSION) {
          // Store a timestamp to prevent showing modal too frequently
          const lastPrompt = localStorage.getItem('last_update_prompt');
          const now = Date.now();
          
          // Only show prompt once per 12 hours max
          if (!lastPrompt || (now - parseInt(lastPrompt)) > 43200000) {
            localStorage.setItem('last_update_prompt', now.toString());
            showUpdateModal();
          }
        }
      } catch (error) {
        console.error("Version check failed:", error);
      }
    };
    
    // Short delay to ensure Firebase is ready
    setTimeout(checkAppVersion, 1000);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage featuresRef={featuresRef} />} />
      <Route path="/home" element={<LandingPage featuresRef={featuresRef}/>} />
      <Route path="/chat" element={<ProtectedRoute element={<ChatLayout />} />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<LandingPage featuresRef={featuresRef} />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

export default App;