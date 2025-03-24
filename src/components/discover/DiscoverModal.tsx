import React, { useState, useEffect } from 'react';
import { IoCloseOutline } from "react-icons/io5";
import './DiscoverModal.css';
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
import { auth } from '../../utils/firebaseAuth';
import { getUserProfile } from '../../utils/firebaseDb';

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConcept: (conceptId: string, conceptTitle: string) => void;
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

const DiscoverModal: React.FC<DiscoverModalProps> = ({ isOpen, onClose, onSelectConcept }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('Hello');
  
  // Set greeting based on time of day and get user profile
  useEffect(() => {
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
        const randomIndex = Math.floor(Math.random() * lateNightGreetings.length);
        setGreeting(lateNightGreetings[randomIndex]);
      }
    };
    
    setTimeBasedGreeting();
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        getUserProfile(user.uid).then((userData) => {
          if (userData && userData.displayName) {
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

  // Concept cards data
  const conceptCards: ConceptCard[] = [
    { id: 'cooking-joy', title: 'The joy of cooking', imageUrl: joy_of_cooking, width: 'half', height: 'normal', category: 'Lifestyle' },
    { id: 'laughter', title: 'Why do we laugh?', imageUrl: why_do_we_laugh, width: 'half', height: 'normal', category: 'Psychology' },
    { id: 'pet-psychology', title: "Understanding your pet's behavior", imageUrl: understand_pet, width: 'full', height: 'normal', category: 'Animals' },
    { id: 'stargazing', title: 'The magic of stargazing', imageUrl: stargazing, width: 'half', height: 'normal', category: 'Nature' },
    { id: 'music-brain', title: 'How music affects the brain', imageUrl: music, width: 'half', height: 'normal', category: 'Neuroscience' },
    { id: 'crypto-web3-basics', title: 'Understanding Crypto & Web3: The essentials', imageUrl: crypto, width: 'full', height: 'normal', category: 'Technology' },
    { id: 'dreams', title: 'Why we dream', imageUrl: dream, width: 'half', height: 'normal', category: 'Psychology' },
    { id: 'habits', title: 'The science of habits', imageUrl: habit, width: 'half', height: 'normal', category: 'Behavior' },
    { id: 'nft-digital-art', title: 'NFTs and the future of digital art', imageUrl: nft, width: 'full', height: 'large', category: 'Creativity' },
    { id: 'quantum-entanglement', title: 'Quantum entanglement explained', imageUrl: quantum_entanglement, width: 'half', height: 'normal', category: 'Physics' },
    { id: 'decision-making', title: 'The psychology of decision-making', imageUrl: decision_making, width: 'half', height: 'normal', category: 'Psychology' },
    { id: 'climate-change', title: 'Climate change and its impact', imageUrl: climate_change, width: 'full', height: 'normal', category: 'Environment' },
    { id: 'ai-ethics', title: 'The ethics of artificial intelligence', imageUrl: ai, width: 'full', height: 'large', category: 'Technology' },
    { id: 'universe-origins', title: 'The origins of the universe', imageUrl: universe, width: 'half', height: 'normal', category: 'Cosmology' },
    { id: 'aging-biology', title: 'The biology of aging', imageUrl: biology_aging, width: 'half', height: 'normal', category: 'Biology' }
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectConcept = (conceptId: string, conceptTitle: string) => {
    onSelectConcept(conceptId, conceptTitle);
    onClose();
  };

  const filteredConcepts = searchQuery
    ? conceptCards.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conceptCards;

  if (!isOpen) return null;

  return (
    <div className="discover-modal-overlay">
      <div className="discover-modal">
        <div className="discover-modal-header">
          <div className="discover-modal-greeting">
            <h3>
              {greeting}, <span className="user-name-style">{userName}</span>
            </h3>
            <p className="discover-modal-description">
                You bring the curiosity, Saarth will hold the space.
            </p>
          </div>
          <button
            className="discover-modal-close"
            onClick={onClose}
            aria-label="Close discover modal"
          >
            <IoCloseOutline size={24} />
          </button>
        </div>
        
        <div className="discover-modal-content">
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
      </div>
    </div>
  );
};

export default DiscoverModal;