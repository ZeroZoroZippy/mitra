import React from 'react';
import { signOut } from "firebase/auth";
// import { auth } from "../../../shared/utils/firebaseAuth"; // Adjust the relative path if needed
import { useNavigate } from "react-router-dom";
import './Sidebar.css';
import { auth } from '../../../../../../shared/utils/firebaseConfig';

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
}

const Sidebar: React.FC<SidebarProps> = ({ chatList, activeChatId, onSelectChat, onClose }) => {
  
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

  return (
    <div className="sidebar"> {/* ✅ Remove hardcoded 'open' class */}
      <div className="sidebar-header">
        <h3>Chats</h3>
        <button className="close-sidebar" onClick={onClose}>
          ✖
        </button>
      </div>
      <ul className="chat-list">
        {chatList.map((chat) => (
          <li
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <span>{chat.title}</span>
            <small>{chat.timestamp}</small>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;