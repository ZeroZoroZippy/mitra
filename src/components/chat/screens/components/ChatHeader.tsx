import React, { useState, useEffect } from "react";
import "./ChatHeader.css";
import { getUserProfile } from "../../../../utils/firebaseDb";
import { auth } from "../../../../utils/firebaseAuth"; // Import auth to get current user
import { RiExpandDiagonalFill } from "react-icons/ri";
import { CgCompressRight } from "react-icons/cg";
import { FaUserCircle } from "react-icons/fa";

interface ChatHeaderProps {
  onToggleFullScreen: () => void;
  isChatFullScreen: boolean;
  isSidebarOpen: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  onToggleFullScreen,
  isChatFullScreen,
  isSidebarOpen,
}) => {
  const [profile, setProfile] = useState<{ photoURL: string } | null>(null);

  // ✅ Fetch user profile (including photo) when component mounts
  useEffect(() => {
    if (auth.currentUser) {
      getUserProfile(auth.currentUser.uid).then((userData) => {
        if (userData && userData.photoURL) {
          setProfile(userData as { photoURL: string });
        } else {
          setProfile(null);
        }
      });
    }
  }, []);

  return (
    <div className="chat-header-bar">
      {/* Left Section: Fullscreen Toggle Icon */}
      <div className="chat-header-left">
        <button
          className="icon-button fullscreen-toggle"
          onClick={onToggleFullScreen}
          title={isChatFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isChatFullScreen || isSidebarOpen ? (
            <CgCompressRight />
          ) : (
            <RiExpandDiagonalFill />
          )}
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