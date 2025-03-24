// ThreadsModal.tsx
import React, { useState, useEffect } from 'react';
import { HiOutlineBookOpen } from "react-icons/hi2";
import { IoCloseOutline } from "react-icons/io5";
import './ThreadsModal.css';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../utils/firebaseConfig';

interface ThreadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectThread: (conceptId: string, conceptTitle: string) => void;
}

interface ConceptThread {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unread?: boolean;
}

const ThreadsModal: React.FC<ThreadsModalProps> = ({ isOpen, onClose, onSelectThread }) => {
  const [threads, setThreads] = useState<ConceptThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const navigateToConceptThread = (threadId: string, threadTitle: string) => {
    onSelectThread(threadId, threadTitle);
    onClose();
  };
  
  const filteredThreads = searchQuery
    ? threads.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : threads;

  if (!isOpen) return null;

  return (
    <div className="threads-modal-overlay">
      <div className="threads-modal">
        <div className="threads-modal-header">
          <h3>Your Conversations</h3>
          <button
            className="threads-modal-close"
            onClick={onClose}
            aria-label="Close threads modal"
          >
            <IoCloseOutline size={24} />
          </button>
        </div>
        
        <div className="threads-modal-search">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="threads-modal-search-input"
          />
        </div>
        
        <div className="threads-modal-content">
          {isLoading ? (
            <div className="threads-loading">Loading your discussions...</div>
          ) : threads.length > 0 ? (
            <div className="threads-list">
              {filteredThreads.map(thread => (
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
              ))}
            </div>
          ) : (
            <div className="threads-empty-state">
              <div className="empty-icon">
                <HiOutlineBookOpen size={40} />
              </div>
              <h3>No concept discussions yet</h3>
              <p>Your discussions about concepts will appear here as you explore and learn.</p>
              <button 
                className="explore-concepts-btn"
                onClick={onClose}
              >
                Explore Concepts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreadsModal;