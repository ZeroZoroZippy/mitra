import React, { useRef, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./utils/firebaseAuth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import LandingPage from "./pages/LandingPage";
import ChatLayout from "./components/chat/screens/components/ChatLayout";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Dashboard from "./pages/Dashboard";

// Move this to a constant that can be imported elsewhere if needed
export const APP_VERSION = "2.0.10";

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
 * This function unregisters any service workers (if registered) and then reloads the page.
 */
function handleUpdateClick() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
        // Once service workers are unregistered, reload the page
        window.location.reload();
      })
      .catch((error) => {
        console.error("Error unregistering service worker:", error);
        window.location.reload();
      });
  } else {
    window.location.reload();
  }
}

/**
 * Creates and appends a modal prompting the user to update.
 */
function showUpdateModal() {
  const modal = document.createElement("div");
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

  button.addEventListener("click", handleUpdateClick);

  content.appendChild(title);
  content.appendChild(message);
  content.appendChild(button);
  modal.appendChild(content);

  document.body.appendChild(modal);
}

const App: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This ensures Firebase is initialized before checking version
    const checkAppVersion = async () => {
      try {
        // Add timestamp to force a fresh request from Firestore
        const db = getFirestore();
        // @ts-ignore
        const configDoc = await getDoc(doc(db, "config/appVersion"), {
          source: "server",
        });
        const serverVersion = configDoc.data()?.version;

        console.log("Version check:", { clientVersion: APP_VERSION, serverVersion });

        if (serverVersion && serverVersion !== APP_VERSION) {
          // Store a timestamp to prevent showing modal too frequently
          const lastPrompt = localStorage.getItem("last_update_prompt");
          const now = Date.now();

          // Only show prompt once per 12 hours max
          if (!lastPrompt || now - parseInt(lastPrompt) > 43200000) {
            localStorage.setItem("last_update_prompt", now.toString());
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
      <Route path="/home" element={<LandingPage featuresRef={featuresRef} />} />
      <Route path="/chat" element={<ProtectedRoute element={<ChatLayout />} />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<LandingPage featuresRef={featuresRef} />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

export default App;