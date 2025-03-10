import React, { useEffect, useState } from "react";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { initializeApp } from "firebase/app";

// Initialize Firebase if you haven't already (replace with your config)
const firebaseConfig = {
  // Your Firebase config here
};
initializeApp(firebaseConfig);

// Update this constant for every new release.
// This should match the version you set in your Firestore document.
export const APP_VERSION = "2.0.10";

/**
 * A simple modal component that prompts the user to update.
 */
const UpdateModal: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const modalStyles: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  };

  const contentStyles: React.CSSProperties = {
    background: "#fff",
    borderRadius: "8px",
    padding: "24px",
    maxWidth: "400px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  };

  const buttonStyles: React.CSSProperties = {
    marginTop: "16px",
    padding: "12px 24px",
    fontSize: "1rem",
    fontWeight: 600,
    borderRadius: "4px",
    border: "none",
    background: "#007BFF",
    color: "#fff",
    cursor: "pointer",
  };

  return (
    <div style={modalStyles}>
      <div style={contentStyles}>
        <h2>Update Available</h2>
        <p>
          A new version of the app is available. Please update now to enjoy the latest features.
        </p>
        <button style={buttonStyles} onClick={onUpdate}>
          Update Now
        </button>
      </div>
    </div>
  );
};

/**
 * The main App component.
 * It checks the version from Firestore and shows the update modal if necessary.
 */
const App: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const db = getFirestore();
        // Force a fresh request from the server using getDocFromServer
        const configDoc = await getDocFromServer(doc(db, "config", "appVersion"));
        if (configDoc.exists()) {
          const serverVersion = configDoc.data()?.version;
          console.log("Version check:", { clientVersion: APP_VERSION, serverVersion });
          if (serverVersion && serverVersion !== APP_VERSION) {
            setShowModal(true);
          }
        } else {
          console.error("App version document not found in Firestore.");
        }
      } catch (error) {
        console.error("Error checking app version:", error);
      }
    };

    // Delay slightly to allow Firebase initialization
    const timer = setTimeout(checkAppVersion, 1000);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Unregisters any service workers and reloads the page.
   * This forces the browser to fetch the new assets.
   */
  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error unregistering service workers:", error);
          window.location.reload();
        });
    } else {
      window.location.reload();
    }
  };

  return (
    <div>
      <h1>My Web App</h1>
      <p>Current version: {APP_VERSION}</p>
      {showModal && <UpdateModal onUpdate={handleUpdate} />}
      {/* Rest of your app goes here */}
    </div>
  );
};

export default App;