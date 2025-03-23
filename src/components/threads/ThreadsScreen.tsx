// ThreadsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineBookOpen } from "react-icons/hi2";
import { IoCloseOutline } from "react-icons/io5";
import './ThreadsScreen.css';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../utils/firebaseConfig';

interface ThreadsScreenProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectThread?: (conceptId: string, conceptTitle: string) => void;
  asPanel?: boolean;
}

interface ConceptThread {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unread?: boolean;
}

const ThreadsScreen: React.FC<ThreadsScreenProps> = ({
  isOpen = true,
  onClose,
  onSelectThread,
  asPanel = false
}) => {
  const [threads, setThreads] = useState<ConceptThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Check device size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };
  
  // Fetch concept threads
  useEffect(() => {
    const fetchConceptThreads = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Use the corrected path to fetch concept messages
        const messagesRef = collection(db, `users/${user.uid}/preferences/concepts/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const conceptThreadsMap = new Map();
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.conceptId) {
            // Get timestamp as Date
            let timestamp;
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
              timestamp = data.timestamp.toDate();
            } else {
              timestamp = new Date(data.timestamp || Date.now());
            }
            
            if (!conceptThreadsMap.has(data.conceptId)) {
              conceptThreadsMap.set(data.conceptId, {
                id: data.conceptId,
                title: data.conceptTitle || data.conceptId, // Use conceptTitle if available
                lastMessage: data.text,
                timestamp: timestamp,
                messageCount: 1
              });
            } else {
              const thread = conceptThreadsMap.get(data.conceptId);
              thread.messageCount++;
              
              // Update if this message is newer
              if (timestamp > thread.timestamp) {
                thread.lastMessage = data.text;
                thread.timestamp = timestamp;
              }
            }
          }
        });
        
        // Get stored concept titles for better display names
        try {
          const userPrefsRef = doc(db, `users/${user.uid}/preferences/concepts`);
          const prefsSnapshot = await getDoc(userPrefsRef);
          
          if (prefsSnapshot.exists()) {
            const data = prefsSnapshot.data();
            
            // Process custom concepts array if it exists
            if (data.customConcepts && Array.isArray(data.customConcepts)) {
              data.customConcepts.forEach((concept: any) => {
                if (conceptThreadsMap.has(concept.id)) {
                  // Update the title with the stored one
                  conceptThreadsMap.get(concept.id).title = concept.title;
                }
              });
            }
          }
        } catch (error) {
          console.error("Error fetching concept titles:", error);
          // Continue execution even if there's an error fetching titles
        }
        
        // Convert map to array and format
        const conceptThreads = Array.from(conceptThreadsMap.values())
          .map(thread => {
            // Make title more readable if it's still just an ID
            const displayTitle = thread.title === thread.id ? 
              thread.title.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
              thread.title;
              
            return {
              id: thread.id,
              title: displayTitle,
              lastMessage: thread.lastMessage.substring(0, 60) + 
                (thread.lastMessage.length > 60 ? '...' : ''),
              timestamp: formatRelativeTime(thread.timestamp),
              messageCount: thread.messageCount
            };
          })
          .sort((a, b) => {
            // Sort by newest first using original timestamp
            return conceptThreadsMap.get(b.id).timestamp - 
                   conceptThreadsMap.get(a.id).timestamp;
          });
        
        setThreads(conceptThreads);
      } catch (error) {
        console.error("Error fetching concept threads:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      fetchConceptThreads();
    }
  }, [isOpen]);
  
  // Handle touch gestures
  useEffect(() => {
    if (!isMobile || !panelRef.current || !isOpen) return;
    
    const panel = panelRef.current;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientX; // Using clientX for horizontal swipe
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      
      const touchX = e.touches[0].clientX;
      const diff = touchX - touchStartY.current;
      
      if (diff > 0) {
        panel.style.transform = `translateX(${diff}px)`;
        e.preventDefault();
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      
      const touchX = e.changedTouches[0].clientX;
      const diff = touchX - touchStartY.current;
      
      panel.style.transform = '';
      
      if (diff > 100 && onClose) {
        onClose();
      }
      
      touchStartY.current = null;
    };
    
    panel.addEventListener('touchstart', handleTouchStart);
    panel.addEventListener('touchmove', handleTouchMove);
    panel.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, onClose, isOpen]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const navigateToConceptThread = (threadId: string, threadTitle: string) => {
    if (onSelectThread) {
      onSelectThread(threadId, threadTitle);
    }
    
    if (isMobile && onClose) {
      onClose();
    }
  };
  
  const handlePanelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };
  
  const filteredThreads = searchQuery
    ? threads.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : threads;

  if (asPanel) {
    return (
      <div 
      ref={panelRef}
      className={`threads-panel ${isOpen ? 'open' : ''}`}
      onClick={handlePanelClick}
      >
      <div className="threads-panel-header">
        <h2>Concept Discussions</h2>
        <div className="threads-header-actions">
        {onClose && (
          <button
          className="threads-close-btn"
          onClick={onClose}
          aria-label="Close threads panel"
          >
          <IoCloseOutline size={24} />
          </button>
        )}
        </div>
      </div>
        
        <div className="threads-list-container">
          {isLoading ? (
            <div className="threads-loading">Loading your discussions...</div>
          ) : threads.length > 0 ? (
            filteredThreads.map(thread => (
              <div 
                key={thread.id} 
                className="thread-card"
                onClick={() => navigateToConceptThread(thread.id, thread.title)}
              >
                <div className="thread-content">
                  <div className="thread-header">
                    <h3 className="thread-title">{thread.title}</h3>
                    <span className="thread-timestamp">{thread.timestamp}</span>
                  </div>
                  <p className="thread-message">{thread.lastMessage}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="threads-empty-state">
              <div className="empty-icon">
                <HiOutlineBookOpen size={40} />
              </div>
              <h3>No concept discussions yet</h3>
              <p>Your discussions about concepts will appear here as you explore and learn.</p>
              <button 
                className="explore-concepts-btn"
                onClick={() => {
                  onClose && onClose();
                  // Try to open the Discover panel
                  document.querySelector('.nav-button[title="Discover"]') &&
                  (document.querySelector('.nav-button[title="Discover"]') as HTMLElement)?.click();
                }}
              >
                Explore Concepts
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full screen mode (just a stub)
  return (
    <div className="threads-screen">
      {/* Full screen implementation would go here */}
    </div>
  );
};

export default ThreadsScreen;