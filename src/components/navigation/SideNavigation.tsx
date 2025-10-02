import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaComments } from 'react-icons/fa';
import { HiSparkles } from "react-icons/hi";
import { FiLayout } from 'react-icons/fi'; // Better icon for Experience Hub
import './SideNavigation.css';

interface SideNavigationProps {
  onDiscoverClick?: () => void;
  onThreadsClick?: () => void;
  isDiscoverOpen?: boolean;
  isThreadsOpen?: boolean;
}

// Updated to handle concept click events
const SideNavigation: React.FC<SideNavigationProps> = ({
  onDiscoverClick,
  onThreadsClick,
  isDiscoverOpen,
  isThreadsOpen
}) => {
  const location = useLocation();
  
  // Check if we're in the concepts view
  const isConceptsView = location.pathname.includes('/concepts');

  return (
    <nav className="side-navigation">
      <ul className="nav-items">
        <li className="nav-item">
          {isConceptsView && onDiscoverClick ? (
            // Use button with onClick when in concepts view
            <button 
              className={`nav-button ${isDiscoverOpen ? 'active' : ''}`}
              onClick={onDiscoverClick}
              title="Concepts"
            >
              <div className="nav-icon">
                <HiSparkles />
              </div>
              <span className="nav-label">Concepts</span>
            </button>
          ) : (
            // Use NavLink otherwise
            <NavLink 
              to="/discover" 
              className={({ isActive }) => 
                `nav-link ${isActive || location.pathname.startsWith('/discover') ? 'active' : ''}`
              }
              title="Concepts"
            >
              <div className="nav-icon">
                <HiSparkles />
              </div>
              <span className="nav-label">Concepts</span>
            </NavLink>
          )}
        </li>

        <li className="nav-item">
          {isConceptsView && onThreadsClick ? (
            // Use button with onClick when in concepts view
            <button 
              className={`nav-button ${isThreadsOpen ? 'active' : ''}`}
              onClick={onThreadsClick}
              title="Threads"
            >
              <div className="nav-icon">
                <FaComments />
              </div>
              <span className="nav-label">Threads</span>
            </button>
          ) : (
            // Use NavLink otherwise
            <NavLink 
              to="/threads" 
              className={({ isActive }) => 
                `nav-link ${isActive || location.pathname.startsWith('/chat') ? 'active' : ''}`
              }
              title="Threads"
            >
              <div className="nav-icon">
                <FaComments />
              </div>
              <span className="nav-label">Threads</span>
            </NavLink>
          )}
        </li>

        <li className="nav-item">
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
            title="Chat"
          >
            <div className="nav-icon">
              <FiLayout />
            </div>
            <span className="nav-label">Chat</span>
          </NavLink>
        </li>

      </ul>
    </nav>
  );
};

export default SideNavigation;