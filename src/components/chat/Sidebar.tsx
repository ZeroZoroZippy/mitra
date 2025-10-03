import React, { useState } from "react";
import { signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { getAuth } from "../../utils/firebaseAuth";

interface SidebarProps {
  onClose: () => void;
  isSidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  isSidebarOpen,
}) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      if (!auth) {
        console.error("Firebase Auth not initialized");
        return;
      }

      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleGoToChat = () => {
    navigate("/chat");
    // Add slight delay before reload to ensure navigation completes
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleFeedback = () => {
    window.location.href =
      "mailto:feedbackforsaarth@gmail.com?subject=Feedback for Saarth&body=Hello, I'd like to share some feedback...";
  };

  return (
    <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <button className="close-sidebar" onClick={onClose}>
          ✖
        </button>
      </div>

      <div className="sidebar-nav">
        <button className="home-button" onClick={handleGoToChat}>
          🏠 Chat Home
        </button>
        <button className="sidebar-button feedback-button" onClick={handleFeedback}>
          ✉️ Feedback
        </button>
        <button className="sidebar-button logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;