// ConceptsLayout.tsx - Updated with modal functionality for mobile and new route
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNavigation from '../navigation/SideNavigation';
import SideDrawer from '../navigation/SideDrawer';
import ConceptsHeader from './ConceptsHeader';
import ConceptsArea from './ConceptsArea';
import DiscoverScreen from '../discover/DiscoverScreen';
import ThreadsScreen from '../threads/ThreadsScreen';
// Import modal components
import DiscoverModal from '../discover/DiscoverModal';
import ThreadsModal from '../threads/ThreadsModal';
import './ConceptsLayout.css';
import { isCreator } from '../../utils/firebaseAuth';

const ConceptsLayout: React.FC = () => {
  const navigate = useNavigate();
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [activeConceptTitle, setActiveConceptTitle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [isThreadsOpen, setIsThreadsOpen] = useState(false);
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024 && window.innerWidth > 768);
  // Add states for modals
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showThreadsModal, setShowThreadsModal] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  // Add a counter to trigger reset in child components
  const [resetTrigger, setResetTrigger] = useState(0);
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsTablet(width <= 1024 && width > 768);
      
      // When transitioning from mobile to desktop, close any open modals
      if (width > 768) {
        setShowDiscoverModal(false);
        setShowThreadsModal(false);
      }
      
      // When transitioning from desktop to mobile, close panels
      if (width <= 768) {
        setIsDiscoverOpen(false);
        setIsThreadsOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleBackToExperienceHub = () => {
    // Updated to use the new route
    navigate('/experience');
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveConceptId(query);
    setActiveConceptTitle(query);
  };
  
  const handleConceptSelect = (conceptId: string, conceptTitle: string) => {
    setActiveConceptId(conceptId);
    setActiveConceptTitle(conceptTitle);
    
    // Close any open modals or panels
    setShowDiscoverModal(false);
    setShowThreadsModal(false);
    
    if (isMobile) {
      setIsDiscoverOpen(false);
      setIsThreadsOpen(false);
    }
  };
  
  const toggleDiscover = () => {
    // For mobile/tablet devices, show modal instead of panel
    if (isMobile || isTablet) {
      setShowDiscoverModal(!showDiscoverModal);
      // Also close threads modal if open
      if (showThreadsModal) setShowThreadsModal(false);
      return;
    }
    
    // Desktop behavior - use panels
    if (isThreadsOpen) {
      setIsThreadsOpen(false);
      setTimeout(() => {
        setIsDiscoverOpen(!isDiscoverOpen);
      }, 300);
    } else {
      setIsDiscoverOpen(!isDiscoverOpen);
    }
  };
  
  const toggleThreads = () => {
    // For mobile/tablet devices, show modal instead of panel
    if (isMobile || isTablet) {
      setShowThreadsModal(!showThreadsModal);
      // Also close discover modal if open
      if (showDiscoverModal) setShowDiscoverModal(false);
      return;
    }
    
    // Desktop behavior - use panels
    if (isDiscoverOpen) {
      setIsDiscoverOpen(false);
      setTimeout(() => {
        setIsThreadsOpen(!isThreadsOpen);
      }, 300);
    } else {
      setIsThreadsOpen(!isThreadsOpen);
    }
  };
  
  const toggleSideDrawer = () => {
    setIsSideDrawerOpen(!isSideDrawerOpen);
  };
  
  const handleMainContentClick = () => {
    if (isMobile) {
      if (isDiscoverOpen) setIsDiscoverOpen(false);
      if (isThreadsOpen) setIsThreadsOpen(false);
    }
  };

  useEffect(() => {
    if (!isCreator()) {
      navigate('/concepts', { replace: true });
    }
  }, [navigate]);

  const handleNewChat = () => {
    // Reset all state variables
    setActiveConceptId(null);
    setActiveConceptTitle(null);
    setSearchQuery('');
    
    // Increment the reset trigger to force child components to clear their state
    setResetTrigger(prev => prev + 1);
    
    // Close any open panels or modals
    setIsDiscoverOpen(false);
    setIsThreadsOpen(false);
    setShowDiscoverModal(false);
    setShowThreadsModal(false);
  };

  return (
    <div className="concepts-layout-container">
      {!isMobile && (
        <SideNavigation 
          onDiscoverClick={toggleDiscover}
          onThreadsClick={toggleThreads}
          isDiscoverOpen={isDiscoverOpen}
          isThreadsOpen={isThreadsOpen}
        />
      )}
      
      <SideDrawer 
        isOpen={isSideDrawerOpen}
        onClose={() => setIsSideDrawerOpen(false)}
        onDiscoverClick={toggleDiscover}
        onThreadsClick={toggleThreads}
      />

      {/* Only use panel approach for desktop */}
      {!isMobile && !isTablet && (
        <>
          <DiscoverScreen 
            isOpen={isDiscoverOpen} 
            onSelectConcept={handleConceptSelect}
            onClose={() => setIsDiscoverOpen(false)}
            asPanel={true}
          />
          
          <ThreadsScreen 
            isOpen={isThreadsOpen}
            onClose={() => setIsThreadsOpen(false)}
            onSelectThread={handleConceptSelect}
            asPanel={true}
          />
        </>
      )}
      
      {/* Use modals for mobile and tablet */}
      <DiscoverModal
        isOpen={showDiscoverModal}
        onClose={() => setShowDiscoverModal(false)}
        onSelectConcept={handleConceptSelect}
      />
      
      <ThreadsModal
        isOpen={showThreadsModal}
        onClose={() => setShowThreadsModal(false)}
        onSelectThread={handleConceptSelect}
      />

      <div 
        ref={mainContentRef}
        className={`concepts-main-area ${(isDiscoverOpen || isThreadsOpen) && !isMobile && !isTablet ? 'panel-open' : ''}`}
        onClick={handleMainContentClick}
      >
        <ConceptsHeader 
          onBackToHome={handleBackToExperienceHub} // Function renamed for clarity but keeps same purpose
          onSearch={handleSearch}
          onToggleSidebar={toggleSideDrawer}
          onNewChat={handleNewChat}
          isSidebarOpen={isSideDrawerOpen}
          activeConceptTitle={activeConceptTitle}
        />
        
        <div className="concepts-content">
          <ConceptsArea 
            activeConceptId={activeConceptId}
            activeConceptTitle={activeConceptTitle}
            searchQuery={searchQuery}
            isPanelOpen={isDiscoverOpen || isThreadsOpen}
            onSelectConcept={handleConceptSelect}
            resetTrigger={resetTrigger}
          />
        </div>
      </div>
    </div>
  );
};

export default ConceptsLayout;