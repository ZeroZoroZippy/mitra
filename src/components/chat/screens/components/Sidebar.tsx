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
  isSidebarOpen: boolean; // ✅ Add isSidebarOpen prop
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
      localStorage.clear(); // ✅ Clears user session data
      sessionStorage.clear();
      navigate("/"); // Redirects to Landing Page
      window.location.reload(); // ✅ Ensures session is fully reset
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleGoHome = () => {
    navigate("/home");
    window.location.reload(); // ✅ Ensures Landing Page refreshes fully
  };

  const handleFeedback = () => {
    window.location.href = "mailto:feedbackforsaarth@gmail.com?subject=Feedback for Saarth&body=Hello, I'd like to share some feedback...";
  };
  

  return (
    <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}> {/* ✅ Add class conditionally */}
      <div className="sidebar-header">
        <h3>Chats</h3>
        <button className="close-sidebar" onClick={onClose}>
          ✖
        </button>
      </div>

      {/* ✅ Home Button Placed Above Chat List */}
      <div className="sidebar-nav">
        <button className="home-button" onClick={(handleGoHome)}>
          🏠 Home
        </button>
        {/* ✅ Feedback Button */}
        <button className="sidebar-button feedback-button" onClick={handleFeedback}>✉️ Feedback</button>
      </div>

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

      {/* <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div> */}
    </div>
  );
};

export default Sidebar;