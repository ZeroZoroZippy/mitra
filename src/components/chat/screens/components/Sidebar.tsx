import React from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { auth } from "../../../../utils/firebaseAuth";

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
}

const Sidebar: React.FC<SidebarProps> = ({
  chatList,
  activeChatId,
  onSelectChat,
  onClose,
  isSidebarOpen,
}) => {
  const navigate = useNavigate();

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

  const handleGoHome = () => {
    navigate("/home");
    window.location.reload();
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
        <button className="home-button" onClick={handleGoHome}>
          🏠 Home
        </button>
        <button className="sidebar-button feedback-button" onClick={handleFeedback}>
          ✉️ Feedback
        </button>
      </div>

      {/* Moved the Chats header below the navigation */}
      <h3 className="chat-header">Rooms</h3>

      <ul className="chat-list">
        {chatList.map((chat) => (
          <li
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? "active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <span>{chat.title}</span>
            <small>{chat.timestamp}</small>
          </li>
        ))}
      </ul>

      {/*
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
      */}
    </div>
  );
};

export default Sidebar;