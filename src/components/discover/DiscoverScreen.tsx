import React, { useState, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import './DiscoverScreen.css';
import { getAuth } from '../../utils/firebaseAuth';
import { getUserProfile } from '../../utils/firebaseDb';
import biology_aging from '../../assets/images/concepts/bio-aging.webp';
import joy_of_cooking from '../../assets/images/concepts/joy-of-cooking.webp';
import why_do_we_laugh from '../../assets/images/concepts/why-do-we-laugh.webp';
import understand_pet from '../../assets/images/concepts/understanding-pet.webp';
import stargazing from '../../assets/images/concepts/stargazing.webp';
import music from '../../assets/images/concepts/music.webp';
import nft from '../../assets/images/concepts/nft.webp';
import dream from '../../assets/images/concepts/dream.webp';
import habit from '../../assets/images/concepts/habit.webp';
import crypto from '../../assets/images/concepts/crypto.webp';
import quantum_entanglement from '../../assets/images/concepts/quantum-entanglement.webp';
import decision_making from '../../assets/images/concepts/decision-making.webp';
import climate_change from '../../assets/images/concepts/climate-change.webp';
import ai from '../../assets/images/concepts/ai.webp';
import universe from '../../assets/images/concepts/universe.webp';

interface DiscoverScreenProps {
    isOpen?: boolean;
    onSelectConcept?: (conceptId: string, conceptTitle: string) => void;
    onClose?: () => void;
    asPanel?: boolean;
}

interface ConceptCard {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  category?: string;
  width?: 'full' | 'half';
  height?: 'normal' | 'large' | 'small';
}

const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
    isOpen = true,
    onSelectConcept,
    onClose,
    asPanel = false
  }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [userName, setUserName] = useState('');
    const [greeting, setGreeting] = useState('Hello');
    // Add ref for the panel to handle touch gestures
    const panelRef = useRef<HTMLDivElement>(null);
    // Track touch start position for swipe gesture
    const touchStartY = useRef<number | null>(null);
    // Track if we're on mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    // Check device size when component mounts and on resize
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Get user's first name and set time-based greeting
    useEffect(() => {
      // Set greeting based on time of day
      const setTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
          setGreeting('Good morning');
        } else if (hour >= 12 && hour < 17) {
          setGreeting('Good afternoon');
        } else if (hour >= 17 && hour < 22) {
          setGreeting('Good evening');
        } else {
            const lateNightGreetings = [
                "Hello, night owl",
                "Still curious"
              ];
              // Pick a random greeting from the array
              const randomIndex = Math.floor(Math.random() * lateNightGreetings.length);
              setGreeting(lateNightGreetings[randomIndex]);
            }
        };
      
      setTimeBasedGreeting();
      
      // Get user profile
      const auth = getAuth();
      if (!auth) {
        setUserName('Explorer');
        return;
      }

      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          getUserProfile(user.uid).then((userData) => {
            if (userData && userData.displayName) {
              // Extract first name
              const firstName = userData.displayName.split(' ')[0];
              setUserName(firstName);
            } else {
              setUserName('Explorer');
            }
          });
        } else {
          setUserName('Explorer');
        }
      });
      
      return () => unsubscribe();
    }, []);

    // Handle touch events for swipe-to-dismiss on mobile
    useEffect(() => {
      if (!isMobile || !panelRef.current || !isOpen) return;
      
      const panel = panelRef.current;
      
      const handleTouchStart = (e: TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
      };
      
      const touchStartX = useRef<number | null>(null);
      const handleTouchMove = (e: TouchEvent) => {
        if (touchStartY.current === null || touchStartX.current === null) return;
        
        const touchY = e.touches[0].clientY;
        const touchX = e.touches[0].clientX;
        const diffY = touchY - touchStartY.current;
        const diffX = touchX - touchStartX.current;
        
        // Only apply transform and prevent default for horizontal swipes
        if (Math.abs(diffX) > Math.abs(diffY) && diffX > 0) {
          panel.style.transform = `translateX(${diffX}px)`;
          e.preventDefault();
        }
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        if (touchStartX.current === null) return;
        
        const touchX = e.changedTouches[0].clientX;
        const diffX = touchX - touchStartX.current;
        
        panel.style.transform = '';
        
        if (diffX > 100 && onClose) {
          onClose();
        }
        
        touchStartY.current = null;
        touchStartX.current = null; // Reset both refs
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

  // Updated concept data with AI-generated image URLs
  const conceptCards: ConceptCard[] = [
    // Light Concepts
    {
      id: 'cooking-joy',
      title: 'The joy of cooking',
      imageUrl: joy_of_cooking,
      width: 'half',
      height: 'normal',
      category: 'Lifestyle'
    },
    {
      id: 'laughter',
      title: 'Why do we laugh?',
      imageUrl: why_do_we_laugh,
      width: 'half',
      height: 'normal',
      category: 'Psychology'
    },
    {
      id: 'pet-psychology',
      title: "Understanding your pet's behavior",
      imageUrl: understand_pet,
      width: 'full',
      height: 'normal',
      category: 'Animals'
    },
    {
      id: 'stargazing',
      title: 'The magic of stargazing',
      imageUrl: stargazing,
      width: 'half',
      height: 'normal',
      category: 'Nature'
    },
    // Medium Concepts
    {
      id: 'music-brain',
      title: 'How music affects the brain',
      imageUrl: music,
      width: 'half',
      height: 'normal',
      category: 'Neuroscience'
    },
    {
        id: 'crypto-web3-basics',
        title: 'Understanding Crypto & Web3: The essentials',
        imageUrl: crypto,
        width: 'full',
        height: 'normal',
        category: 'Technology'
    },
    {
      id: 'dreams',
      title: 'Why we dream',
      imageUrl: dream,
      width: 'half',
      height: 'normal',
      category: 'Psychology'
    },
    {
      id: 'habits',
      title: 'The science of habits',
      imageUrl: habit,
      width: 'half',
      height: 'normal',
      category: 'Behavior'
    },
    {
        id: 'nft-digital-art',
        title: 'NFTs and the future of digital art',
        imageUrl: nft,
        width: 'full',
        height: 'large',
        category: 'Creativity'
    },
  
    // Heavy Concepts
    {
      id: 'quantum-entanglement',
      title: 'Quantum entanglement explained',
      imageUrl: quantum_entanglement,
      width: 'half',
      height: 'normal',
      category: 'Physics'
    },
    {
      id: 'decision-making',
      title: 'The psychology of decision-making',
      imageUrl: decision_making,
      width: 'half',
      height: 'normal',
      category: 'Psychology'
    },
    {
      id: 'climate-change',
      title: 'Climate change and its impact',
      imageUrl: climate_change,
      width: 'full',
      height: 'normal',
      category: 'Environment'
    },
    {
      id: 'ai-ethics',
      title: 'The ethics of artificial intelligence',
      imageUrl: ai,
      width: 'full',
      height: 'large',
      category: 'Technology'
    },
    {
      id: 'universe-origins',
      title: 'The origins of the universe',
      imageUrl: universe,
      width: 'half',
      height: 'normal',
      category: 'Cosmology'
    },
    {
      id: 'aging-biology',
      title: 'The biology of aging',
      imageUrl: biology_aging,
      width: 'half',
      height: 'normal',
      category: 'Biology'
    }
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectConcept = (conceptId: string, conceptTitle: string) => {
    if (onSelectConcept) {
      onSelectConcept(conceptId, conceptTitle);
      // Close panel automatically on mobile after selection
      if (isMobile && onClose) {
        onClose();
      }
    }
  };

  // Function to handle panel click - prevent bubbling to main content
  const handlePanelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const filteredConcepts = searchQuery
    ? conceptCards.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conceptCards;

    if (asPanel) {
        return (
          <div 
            ref={panelRef}
            className={`discover-panel ${isOpen ? 'open' : ''}`}
            onClick={handlePanelClick}
          >
            <div className="discover-panel-header">
              <h2>
                {greeting}, <span className="user-name-style">{userName}</span>
              </h2>
              {onClose && (
                <button
                  className="discover-close-btn"
                  onClick={onClose}
                  aria-label="Close discover panel"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="discover-bento-container">
              {filteredConcepts.map(card => (
                <div
                  key={card.id}
                  className={`bento-card ${card.width || 'full'} ${card.height || 'normal'}`}
                  onClick={() => handleSelectConcept(card.id, card.title)}
                >
                  <div
                    className="bento-image"
                    style={{ backgroundImage: `url(${card.imageUrl})` }}
                  ></div>
                  <div className="bento-content">
                    {card.category && <span className="bento-category">{card.category}</span>}
                    <h3 className="bento-title">{card.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }

  // Full screen mode (kept for completeness)
  return (
    <div className="discover-screen">
      {/* Full screen content can be added here */}
    </div>
  );
};

export default DiscoverScreen;