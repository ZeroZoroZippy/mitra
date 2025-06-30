import React, { useState } from "react";
import { signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { auth } from "../../utils/firebaseAuth";

interface Chat {
  id: number;
  title: string;
  timestamp: string;
}

interface SidebarProps {
  chatList: Chat[];
  activeChatId: number;
  onSelectChat: (chatId: number) => void;
  onClose: () => void;
  isSidebarOpen: boolean;
  showLimitModal: () => void; // Not used anymore but kept for compatibility
}

const Sidebar: React.FC<SidebarProps> = ({
  chatList,
  activeChatId,
  onSelectChat,
  onClose,
  isSidebarOpen,
}) => {
  const navigate = useNavigate();
  const [showRoomLimitModal, setShowRoomLimitModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleGoToExperienceHub = () => {
    navigate("/experience");
    // Add slight delay before reload to ensure navigation completes
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleFeedback = () => {
    window.location.href =
      "mailto:feedbackforsaarth@gmail.com?subject=Feedback for Saarth&body=Hello, I'd like to share some feedback...";
  };

  const isGuestUser = () => localStorage.getItem("isGuestUser") === "true";

  return (
    <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <button className="close-sidebar" onClick={onClose}>
          ✖
        </button>
      </div>

      <div className="sidebar-nav">
        <button className="home-button" onClick={handleGoToExperienceHub}>
          🏠 Experience Hub
        </button>
        <button className="sidebar-button feedback-button" onClick={handleFeedback}>
          ✉️ Feedback
        </button>
      </div>

      <h3 className="chat-header">Rooms</h3>

      <ul className="chat-list">
        {chatList.map((chat) => {
          const isDisabled = isGuestUser() && chat.id !== 1;
          
          return (
            <li
              key={chat.id}
              className={`chat-item ${chat.id === activeChatId ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={() => {
                if (isDisabled) {
                  setShowRoomLimitModal(true);
                } else {
                  onSelectChat(chat.id);
                }
              }}
            >
              <span>{chat.title}</span>
              {isDisabled && <span className="guest-lock">🔒</span>}
              <small>{chat.timestamp}</small>
            </li>
          );
        })}
      </ul>

      {/* Room limit modal */}
      {isGuestUser() && showRoomLimitModal && (
        <div className="room-limit-modal">
          <div className="room-limit-content">
            <button 
              className="close-modal-button"
              onClick={() => setShowRoomLimitModal(false)}
            >
              ✖
            </button>
            <h3>Room Access Limited</h3>
            <p>Sign in to unlock all conversation rooms!</p>
            <button 
              className="sign-in-button"
              onClick={() => {
                const provider = new GoogleAuthProvider();
                signInWithPopup(auth, provider)
                  .then(() => {
                    // Clear guest status
                    localStorage.removeItem("isGuestUser");
                    localStorage.removeItem("guestMessageCount");
                    
                    // Close modal
                    setShowRoomLimitModal(false);
                    
                    // If you need to refresh state
                    window.location.reload();
                  })
                  .catch((error) => {
                    console.error("Error during sign in:", error);
                  });
              }}
            >
              Sign In Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;