import React from "react";
import "./ChatHeader.css";
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
        <FaUserCircle />
      </div>
    </div>
  );
};

export default ChatHeader;
