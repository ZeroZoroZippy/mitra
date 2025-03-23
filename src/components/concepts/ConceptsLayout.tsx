// ConceptsLayout.tsx - Updated with reset functionality
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNavigation from '../navigation/SideNavigation';
import SideDrawer from '../navigation/SideDrawer';
import ConceptsHeader from './ConceptsHeader';
import ConceptsArea from './ConceptsArea';
import DiscoverScreen from '../discover/DiscoverScreen';
import ThreadsScreen from '../threads/ThreadsScreen';
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
  const mainContentRef = useRef<HTMLDivElement>(null);
  // Add a counter to trigger reset in child components
  const [resetTrigger, setResetTrigger] = useState(0);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleBackToHome = () => {
    navigate('/home');
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveConceptId(query);
    setActiveConceptTitle(query);
  };
  
  const handleConceptSelect = (conceptId: string, conceptTitle: string) => {
    setActiveConceptId(conceptId);
    setActiveConceptTitle(conceptTitle);
    
    if (isMobile) {
      setIsDiscoverOpen(false);
    }
  };
  
  const toggleDiscover = () => {
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
    
    // Close any open panels
    if (isDiscoverOpen) setIsDiscoverOpen(false);
    if (isThreadsOpen) setIsThreadsOpen(false);
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

      <div 
        ref={mainContentRef}
        className={`concepts-main-area ${(isDiscoverOpen || isThreadsOpen) && !isMobile ? 'panel-open' : ''}`}
        onClick={handleMainContentClick}
      >
        <ConceptsHeader 
          onBackToHome={handleBackToHome}
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