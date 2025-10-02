import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaComments } from 'react-icons/fa';
import { HiSparkles } from "react-icons/hi";
import { IoCloseOutline } from "react-icons/io5";
import { FiLayout } from 'react-icons/fi';
import './SideDrawer.css';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscoverClick: () => void;
  onThreadsClick: () => void;
}

const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  onDiscoverClick,
  onThreadsClick
}) => {
  const location = useLocation();
  
  // Check if we're in the concepts view
  const isConceptsView = location.pathname.includes('/concepts');

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="side-drawer-backdrop" onClick={onClose} />
      )}
      
      {/* Side Drawer */}
      <div className={`side-drawer ${isOpen ? 'open' : ''}`}>
        <div className="side-drawer-header">
          <h2>Navigation</h2>
          <button 
            className="side-drawer-close-btn" 
            onClick={onClose}
            aria-label="Close navigation drawer"
          >
            <IoCloseOutline size={24} />
          </button>
        </div>
        
        <nav className="side-drawer-nav">
          <ul className="side-drawer-items">           
            <li className="side-drawer-item">
              {isConceptsView ? (
                <button 
                  className="side-drawer-button"
                  onClick={() => {
                    onDiscoverClick();
                    onClose();
                  }}
                >
                  <div className="side-drawer-icon">
                    <HiSparkles />
                  </div>
                  <span className="side-drawer-label">Concepts</span>
                </button>
              ) : (
                <NavLink 
                  to="/discover" 
                  className={({ isActive }) => 
                    `side-drawer-link ${isActive || location.pathname.startsWith('/discover') ? 'active' : ''}`
                  }
                  onClick={onClose}
                >
                  <div className="side-drawer-icon">
                    <HiSparkles />
                  </div>
                  <span className="side-drawer-label">Concepts</span>
                </NavLink>
              )}
            </li>
            
            <li className="side-drawer-item">
              {isConceptsView ? (
                <button 
                  className="side-drawer-button"
                  onClick={() => {
                    onThreadsClick();
                    onClose();
                  }}
                >
                  <div className="side-drawer-icon">
                    <FaComments />
                  </div>
                  <span className="side-drawer-label">Threads</span>
                </button>
              ) : (
                <NavLink 
                  to="/threads" 
                  className={({ isActive }) => 
                    `side-drawer-link ${isActive || location.pathname.startsWith('/chat') ? 'active' : ''}`
                  }
                  onClick={onClose}
                >
                  <div className="side-drawer-icon">
                    <FaComments />
                  </div>
                  <span className="side-drawer-label">Threads</span>
                </NavLink>
              )}
            </li>
            
            <li className="side-drawer-item">
              <NavLink
                to="/chat"
                className={({ isActive }) =>
                  `side-drawer-link ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <div className="side-drawer-icon">
                  <FiLayout />
                </div>
                <span className="side-drawer-label">Chat</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default SideDrawer;