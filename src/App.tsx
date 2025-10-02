import React, { useRef, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./utils/firebaseAuth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import LandingPage from "./pages/LandingPage";
import ChatLayout from "./components/chat/ChatLayout";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ConceptsLayout from "./components/concepts/ConceptsLayout";
import DiscoverScreen from "./components/discover/DiscoverScreen";
import ThreadsScreen from "./components/threads/ThreadsScreen";
import AdminDashboard from "./pages/AdminDashboard";

// Define current app version - update this when releasing new versions
export const APP_VERSION = "3.0.10";

// Initialize the guest analytics function
export const initializeGuestAnalytics = async () => {
  const db = getFirestore();
  const statsRef = doc(db, "statistics", "guestUsage");
  
  // Check if document exists first
  const statsDoc = await getDoc(statsRef);
  
  if (!statsDoc.exists()) {
    // Initialize the statistics document
    await setDoc(statsRef, {
      totalGuestMessages: 0,
      totalGuestAccounts: 0,
      conversions: 0,
      lastUpdated: serverTimestamp()
    });
  }
};

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

/**
 * Compare two semantic version strings and determine if serverVersion is newer
 */
function isNewerVersion(serverVersion: string, clientVersion: string): boolean {
  const serverParts = serverVersion.split('.').map(Number);
  const clientParts = clientVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(serverParts.length, clientParts.length); i++) {
    const server = serverParts[i] || 0;
    const client = clientParts[i] || 0;
    
    if (server > client) return true;
    if (server < client) return false;
  }
  
  return false; // Versions are identical
}

/**
 * Handle the update action by clearing caches and reloading the page
 */
function performUpdate() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
        window.location.reload();
      })
      .catch((error) => {
        window.location.reload();
      });
  } else {
    window.location.reload();
  }
}

/**
 * Show update notification banner (centered on screen)
 */
function showUpdateBanner() {
  // Check if banner already exists to prevent duplicates
  if (document.getElementById('saarth-update-banner')) {
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'saarth-update-banner';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(29, 29, 29, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '9999';
  
  const banner = document.createElement('div');
  banner.style.background = 'linear-gradient(45deg, #FDD844, #FFEC9F)';
  banner.style.padding = '20px 24px';
  banner.style.borderRadius = '12px';
  banner.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
  banner.style.display = 'flex';
  banner.style.flexDirection = 'column';
  banner.style.alignItems = 'center';
  banner.style.gap = '16px';
  banner.style.maxWidth = '350px';
  banner.style.width = '85%';
  
  const message = document.createElement('div');
  message.textContent = 'A new version of Saarth is available';
  message.style.color = '#1d1d1d';
  message.style.fontFamily = "'Poppins', sans-serif";
  message.style.fontWeight = '600';
  message.style.fontSize = '16px';
  message.style.textAlign = 'center';
  
  const updateButton = document.createElement('button');
  updateButton.textContent = 'Update Now';
  updateButton.style.padding = '10px 24px';
  updateButton.style.borderRadius = '24px';
  updateButton.style.border = 'none';
  updateButton.style.background = '#1d1d1d';
  updateButton.style.color = '#FDD844';
  updateButton.style.cursor = 'pointer';
  updateButton.style.fontFamily = "'Poppins', sans-serif";
  updateButton.style.fontWeight = '500';
  updateButton.style.fontSize = '14px';
  updateButton.style.width = '80%';
  updateButton.onclick = performUpdate;
  
  const skipButton = document.createElement('button');
  skipButton.textContent = 'Remind me later';
  skipButton.style.background = 'transparent';
  skipButton.style.border = 'none';
  skipButton.style.color = '#1d1d1d';
  skipButton.style.opacity = '0.7';
  skipButton.style.cursor = 'pointer';
  skipButton.style.fontFamily = "'Poppins', sans-serif";
  skipButton.style.fontSize = '12px';
  skipButton.style.marginTop = '8px';
  skipButton.onclick = () => {
    document.body.removeChild(overlay);
    
    // Set a shorter reminder interval (30 minutes)
    const remindTime = Date.now() + 1800000;
    localStorage.setItem("last_update_prompt", remindTime.toString());
    
    // Optional: Schedule a reminder if the tab stays open
    setTimeout(() => {
      const currentTime = Date.now();
      const lastPrompt = localStorage.getItem("last_update_prompt");
      
      // Only show if we haven't shown another prompt since
      if (lastPrompt && parseInt(lastPrompt) === remindTime) {
        showUpdateBanner();
      }
    }, 1800000);
  };
  
  banner.appendChild(message);
  banner.appendChild(updateButton);
  banner.appendChild(skipButton);
  overlay.appendChild(banner);
  document.body.appendChild(overlay);
}

/**
 * Show modal for more critical updates
 */
function showUpdateModal() {
  // Check if modal already exists
  if (document.getElementById('saarth-update-modal')) {
    return;
  }
  
  const modal = document.createElement("div");
  modal.id = 'saarth-update-modal';
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(29,29,29,0.9)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  const content = document.createElement("div");
  content.style.background = "#2d2d2d";
  content.style.borderRadius = "12px";
  content.style.padding = "24px";
  content.style.maxWidth = "400px";
  content.style.textAlign = "center";
  content.style.fontFamily = "'Poppins', sans-serif";

  const title = document.createElement("h3");
  title.style.color = "#fff";
  title.style.marginTop = "0";
  title.style.fontSize = "1.4rem";
  title.textContent = "Saarth Has Evolved";

  const message = document.createElement("p");
  message.style.color = "#aaa";
  message.textContent =
    "We've enhanced your experience with new insights and capabilities.";

  const button = document.createElement("button");
  button.textContent = "Update Now";
  button.style.background = "linear-gradient(45deg, #FDD844, #FFEC9F)";
  button.style.border = "none";
  button.style.color = "#1d1d1d";
  button.style.padding = "12px 24px";
  button.style.borderRadius = "24px";
  button.style.fontWeight = "500";
  button.style.cursor = "pointer";
  button.style.fontFamily = "'Poppins', sans-serif";
  button.addEventListener("click", performUpdate);

  content.appendChild(title);
  content.appendChild(message);
  content.appendChild(button);
  modal.appendChild(content);

  document.body.appendChild(modal);
}

const App: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);
  const [updateChecked, setUpdateChecked] = useState(false);

  useEffect(() => {
    // Initialize guest analytics tracking
    initializeGuestAnalytics().catch(err => 
      console.error("Error initializing guest analytics:", err)
    );
    
    // Check for updates when app loads and after Firebase is initialized
    const checkForUpdates = async () => {
      try {
        const db = getFirestore();
        const configRef = doc(db, "config", "appVersion");
        const configSnap = await getDoc(configRef);
        
        if (!configSnap.exists()) {
          return;
        }
        
        const serverVersion = configSnap.data().version;
        
        // Only show update if server version is newer
        if (isNewerVersion(serverVersion, APP_VERSION)) {
          // Check if it's a major update to determine notification type
          const isMajorUpdate = serverVersion.split('.')[0] > APP_VERSION.split('.')[0];
          
          // Get last update prompt timestamp
          const lastPrompt = localStorage.getItem("last_update_prompt");
          const now = Date.now();
          
          // Show update notification if no recent prompt (within 2 hours)
          if (!lastPrompt || now - parseInt(lastPrompt) > 7200000) {
            localStorage.setItem("last_update_prompt", now.toString());
            
            if (isMajorUpdate) {
              showUpdateModal();
            } else {
              showUpdateBanner();
            }
          }
        }
        
        setUpdateChecked(true);
      } catch (error) {
        console.error("Update check failed:", error);
        setUpdateChecked(true);
      }
    };

    // Wait for auth to initialize before checking for updates
    const unsubscribe = onAuthStateChanged(auth, () => {
      // We're just using this to ensure Firebase is initialized
      checkForUpdates();
    });
    
    // Set up periodic checks (every 15 minutes)
    const intervalId = setInterval(checkForUpdates, 900000);
    
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage featuresRef={featuresRef} />} />
      <Route path="/chat" element={<ProtectedRoute element={<ChatLayout />} />} />
      <Route path="/concepts" element={<ProtectedRoute element={<ConceptsLayout />} />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/discover" element={<ProtectedRoute element={<DiscoverScreen />} />} />
      <Route path="/threads" element={<ProtectedRoute element={<ThreadsScreen />} />} />
      <Route path="/home" element={<Navigate replace to="/chat" />} />
      <Route path="/experience" element={<Navigate replace to="/chat" />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute element={<AdminDashboard />} />} />
      <Route path="*" element={<LandingPage featuresRef={featuresRef} />} />
    </Routes>
  );
};

export default App;