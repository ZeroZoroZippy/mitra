import React, { useState, useEffect, useRef } from "react";
import "./ChatHeader.css";
import { getUserProfile } from "../../../../utils/firebaseDb";
import { auth } from "../../../../utils/firebaseAuth";
import { FaUserCircle, FaBars } from "react-icons/fa";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeChatId: number;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ isSidebarOpen, onToggleSidebar, activeChatId }) => {
  const [profile, setProfile] = useState<{ photoURL: string; displayName: string } | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const logoutRef = useRef<HTMLDivElement>(null);

  // Fetch user profile (photo + display name)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // getUserProfile already decrypts the displayName & email
        getUserProfile(user.uid).then((userData) => {
          if (userData && userData.photoURL) {
            setProfile({
              photoURL: userData.photoURL,
              displayName: userData.displayName || "User", // Fallback if name is missing
            });
          } else {
            setProfile(null);
          }
        });
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Detect clicks outside the logout menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("❌ Error logging out:", error);
    }
  };

  // Mapping of thread IDs to chat titles for all threads
  const chatTitles: { [key: number]: string } = {
    1: "Companion",
    2: "Love & Connections",
    3: "Dreams & Manifestations",
    4: "Healing & Emotional Release",
    5: "Purpose & Ambition",
    6: "Mental Well-Being",
    7: "Admin Dashboard",
  };

  const getChatTitle = (chatId: number) => {
    return chatTitles[chatId] || "Chat";
  };

  return (
    <div className="chat-header-bar">
      {/* Sidebar Toggle */}
      <div className="chat-header-left">
        <button
          className="icon-button menu-toggle"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Close Menu" : "Open Menu"}
        >
          <FaBars />
        </button>
      </div>

      {/* Chat Title */}
      <div className="chat-header-center">
        <h3>{getChatTitle(activeChatId)}</h3>
      </div>

      {/* Profile Avatar & Logout Menu */}
      <div className="chat-header-right profile-container" ref={logoutRef}>
        <div onClick={() => setShowLogout((prev) => !prev)} className="profile-avatar-wrapper">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="profile-avatar" />
          ) : (
            <FaUserCircle className="profile-avatar" />
          )}
        </div>

        {/* Dropdown Menu with Name & Logout */}
        {showLogout && (
          <div className="logout-menu">
            <p className="user-name">{profile?.displayName || "User"}</p>
            <hr className="divider" />
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;