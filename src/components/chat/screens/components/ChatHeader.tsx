import React from 'react';
import './ChatHeader.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faCompress, faUserCircle } from '@fortawesome/free-solid-svg-icons';

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
          title={isChatFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <FontAwesomeIcon icon={(isChatFullScreen || isSidebarOpen) ? faCompress : faExpand // ✅ Show "exit" icon when sidebar is open
} />
        </button>
      </div>

      {/* Center Section: Title */}
      <div className="chat-header-center">
        <h3>Chat with Mitra</h3>
      </div>

      {/* Right Section: Profile Avatar */}
      <div className="chat-header-right">
        <FontAwesomeIcon icon={faUserCircle} className="profile-avatar" />
      </div>
    </div>
  );
};

export default ChatHeader;