// ConceptsHeader.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebaseAuth";
import { getUserProfile } from "../../utils/firebaseDb";
import { FaUserCircle } from "react-icons/fa";
import { FaRegPenToSquare } from "react-icons/fa6";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoCloseOutline } from "react-icons/io5";

import './ConceptsHeader.css';

interface ConceptsHeaderProps {
  onBackToHome: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onSearch?: (query: string) => void;
  onNewChat?: () => void;
  activeConceptTitle?: string | null; // Add this prop
}

const ConceptsHeader: React.FC<ConceptsHeaderProps> = ({ 
  onBackToHome, 
  onToggleSidebar,
  isSidebarOpen,
  onNewChat,
  activeConceptTitle
}) => {
  const [profile, setProfile] = useState<{ photoURL: string; displayName: string } | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const logoutRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        getUserProfile(user.uid).then((userData) => {
          if (userData && userData.photoURL) {
            setProfile({
              photoURL: userData.photoURL,
              displayName: userData.displayName || "User",
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
      
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowNewChatModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
  
  const handleNewChatClick = () => {
    setShowNewChatModal(true);
  };
  
  const handleStartNewChat = () => {
    if (onNewChat) {
      onNewChat();
      
      // Add visual feedback that action was performed
      const notification = document.createElement('div');
      notification.className = 'new-chat-notification';
      notification.textContent = 'New conversation started';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 300);
        }, 2000);
      }, 100);
    }
    setShowNewChatModal(false);
  };

  return (
    <header className="concept-header-wrapper">
      <div className="concept-header-left-section">
        {isMobile && (
          <button
            className="concept-menu-button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <RxHamburgerMenu size={24} className="concept-icon" />
          </button>
        )}
      </div>

      <div className="concept-header-center-section">
        {activeConceptTitle && (
          <div className="concept-current-title">
            {activeConceptTitle}
          </div>
        )}
      </div>

      <div className="concept-header-right-section">
        {/* New Chat icon without tooltip */}
        {onNewChat && (
          <div className="new-chat-icon-container">
            <button 
              className="new-chat-icon-button" 
              onClick={handleNewChatClick}
              aria-label="New Thread"
            >
              <FaRegPenToSquare size={22} className="concept-icon" color="#979797" />
            </button>
          </div>
        )}

        <div className="concept-profile-container" ref={logoutRef}>
          <div
            onClick={() => setShowLogout((prev) => !prev)}
            className="concept-profile-avatar-wrapper"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="concept-profile-avatar" />
            ) : (
              <FaUserCircle className="concept-profile-avatar" />
            )}
          </div>

          {showLogout && (
            <div className="concept-logout-menu">
              <p className="concept-user-name">{profile?.displayName || "User"}</p>
              <hr className="concept-divider" />
              <button className="concept-logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="new-chat-modal-overlay">
          <div className="new-chat-modal" ref={modalRef}>
            <div className="new-chat-modal-header">
              <h3>Start a New Conversation</h3>
              <button 
                className="new-chat-modal-close" 
                onClick={() => setShowNewChatModal(false)}
                aria-label="Close modal"
              >
                <IoCloseOutline size={22} />
              </button>
            </div>
            <div className="new-chat-modal-content">
              <p>Starting a new conversation will clear your current chat history. Are you sure you want to continue?</p>
            </div>
            <div className="new-chat-modal-actions">
              <button 
                className="new-chat-modal-cancel" 
                onClick={() => setShowNewChatModal(false)}
              >
                Cancel
              </button>
              <button 
                className="new-chat-modal-confirm" 
                onClick={handleStartNewChat}
              >
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default ConceptsHeader;