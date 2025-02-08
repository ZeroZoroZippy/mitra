import React, { useState, useEffect } from "react";
import "./ChatHeader.css";
import { getUserProfile } from "../../../../utils/firebaseDb";
import { auth } from "../../../../utils/firebaseAuth"; // Import auth to get current user
import { RiExpandDiagonalFill } from "react-icons/ri";
import { CgCompressRight } from "react-icons/cg";
import { FaUserCircle, FaBars } from "react-icons/fa"; // ✅ Added Menu Icon

interface ChatHeaderProps {
  onToggleFullScreen: () => void;
  isChatFullScreen: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void; // ✅ Function to toggle sidebar
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  onToggleFullScreen,
  isChatFullScreen,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [profile, setProfile] = useState<{ photoURL: string } | null>(null);

  // ✅ Fetch user profile (including photo) when component mounts
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        getUserProfile(user.uid).then((userData) => {
          if (userData && userData.photoURL) {
            setProfile(userData as { photoURL: string });
          } else {
            setProfile(null);
          }
        });
      } else {
        setProfile(null); // ✅ Clear profile when user logs out
      }
    });
  
    return () => unsubscribe(); // ✅ Cleanup listener
  }, []);

  return (
    <div className="chat-header-bar">
      {/* ✅ Left Section: Menu Icon to Toggle Sidebar */}
      <div className="chat-header-left">
        <button
          className="icon-button menu-toggle"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Close Menu" : "Open Menu"}
        >
          <FaBars />
        </button>
      </div>

      {/* Center Section: Title */}
      <div className="chat-header-center">
        <h3>Chat with Mitra</h3>
      </div>

      {/* Right Section: Profile Avatar */}
      <div className="chat-header-right">
        {profile && profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt="Profile"
            className="profile-avatar"
          />
        ) : (
          <FaUserCircle />
        )}
      </div>
    </div>
  );
};

export default ChatHeader;