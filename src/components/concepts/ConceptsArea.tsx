import React, { useState, useEffect, useRef } from 'react';
import { IoArrowUpCircleSharp } from "react-icons/io5";
import './ConceptsArea.css';
import Message from './Message';
import { getGroqConceptCompletion } from '../../utils/getGroqConceptCompletion';
import { 
  saveConceptMessage, 
  getConceptMessages, 
  trackConceptUsage, 
  saveCustomConcept, 
  generateCustomConceptId 
} from '../../utils/firebaseConceptDb';
import { 
  getConceptWelcomeMessage, 
  getCustomConceptFirstMessage 
} from '../../utils/conceptWelcomeMessages';
import { auth, db } from '../../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getUserProfile } from '../../utils/firebaseDb';

// Import concept images (your existing imports)
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

interface ConceptsAreaProps {
  activeConceptId: string | null;
  activeConceptTitle: string | null;
  searchQuery: string;
  isPanelOpen?: boolean;
  onSelectConcept?: (conceptId: string, conceptTitle: string) => void;
  resetTrigger?: number; // Add this prop to detect when reset is triggered
}

interface ChatMessage {
  id?: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  encrypted: boolean;
  type?: string;
  language?: string;
}

interface ConceptCard {
  id: string;
  title: string;
  imageUrl: string;
  category?: string;
}

const ConceptsArea: React.FC<ConceptsAreaProps> = ({ 
  activeConceptId, 
  activeConceptTitle,
  searchQuery, 
  isPanelOpen = false,
  onSelectConcept,
  resetTrigger = 0
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [randomConcepts, setRandomConcepts] = useState<ConceptCard[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showExampleMenu, setShowExampleMenu] = useState(false);
  const previousConceptIdRef = useRef<string | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState<string>("there");
  
  // Define concept cards (your existing code)
  const conceptCards: ConceptCard[] = [
    { id: 'cooking-joy', title: 'The joy of cooking', imageUrl: joy_of_cooking, category: 'Lifestyle' },
    { id: 'laughter', title: 'Why do we laugh?', imageUrl: why_do_we_laugh, category: 'Psychology' },
    { id: 'pet-psychology', title: "Understanding your pet's behavior", imageUrl: understand_pet, category: 'Animals' },
    { id: 'stargazing', title: 'The magic of stargazing', imageUrl: stargazing, category: 'Nature' },
    { id: 'music-brain', title: 'How music affects the brain', imageUrl: music, category: 'Neuroscience' },
    { id: 'crypto-web3', title: 'Understanding Crypto & Web3', imageUrl: crypto, category: 'Technology' },
    { id: 'dreams', title: 'Why we dream', imageUrl: dream, category: 'Psychology' },
    { id: 'habits', title: 'The science of habits', imageUrl: habit, category: 'Behavior' },
    { id: 'nft-art', title: 'NFTs and digital art', imageUrl: nft, category: 'Creativity' },
    { id: 'quantum-entanglement', title: 'Quantum entanglement explained', imageUrl: quantum_entanglement, category: 'Physics' },
    { id: 'decision-making', title: 'Psychology of decision-making', imageUrl: decision_making, category: 'Psychology' },
    { id: 'climate-change', title: 'Climate change and its impact', imageUrl: climate_change, category: 'Environment' },
    { id: 'ai-ethics', title: 'Ethics of artificial intelligence', imageUrl: ai, category: 'Technology' },
    { id: 'universe-origins', title: 'Origins of the universe', imageUrl: universe, category: 'Cosmology' },
    { id: 'aging-biology', title: 'The biology of aging', imageUrl: biology_aging, category: 'Biology' }
  ];

  // Function to fetch user's name
  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const userData = await getUserProfile(user.uid);
        if (userData && userData.displayName) {
          // Extract first name from display name (which is already decrypted)
          const firstName = userData.displayName.split(' ')[0];
          setUserName(firstName);
        } else {
          setUserName('explorer');
        }
      }
    };
    
    fetchUserName();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserName();
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Function to get random concepts (your existing code)
  const getRandomConcepts = () => {
    const shuffled = [...conceptCards].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  };
  
  // Reset messages when resetTrigger changes (your existing code)
  useEffect(() => {
    if (resetTrigger > 0) {
      setMessages([]);
      setRandomConcepts(getRandomConcepts());
    }
  }, [resetTrigger]);
  
  // Refresh random concepts when returning to welcome screen (your existing code)
  useEffect(() => {
    if (!activeConceptId) {
      setMessages([]);
      setRandomConcepts(getRandomConcepts());
    }
  }, [activeConceptId]);
  
  // Initialize random concepts on first load (your existing code)
  useEffect(() => {
    setRandomConcepts(getRandomConcepts());
  }, []);
  
  // Handle concept selection (your existing code with no changes)
  const handleConceptSelect = (conceptId: string, conceptTitle: string) => {
    if (onSelectConcept) {
      onSelectConcept(conceptId, conceptTitle);
    }
  };
  
  // Create message function (your existing code)
  const createMessage = (text: string, sender: 'user' | 'assistant', type?: string, language?: string): ChatMessage => {
    // Simple UUID generator
    const generateId = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    return {
      id: generateId(),
      text,
      sender,
      timestamp: new Date().toISOString(),
      encrypted: false,
      type,
      language
    };
  };
  
  // MODIFIED: Fetch messages for the current concept - Added welcome message
  const fetchMessages = async () => {
    if (!activeConceptId) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      setIsTyping(true);
      
      // Load existing messages for this concept
      const conceptMessages = await getConceptMessages(activeConceptId);
      
      if (conceptMessages.length > 0) {
        // Check if we already have a welcome/greeting message
        const hasWelcomeMessage = conceptMessages.some(msg => 
          msg.sender === 'assistant' && (msg.type === 'greeting' || msg.type === 'introduction')
        );
        
        // Convert to chat message format for consistency
        const chatMessages = conceptMessages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.timestamp,
          encrypted: false,
          type: msg.type,
          language: msg.language
        }));
        
        setMessages(chatMessages);
        
        // If for some reason we don't have a welcome message but have other messages
        // We don't add a welcome message to avoid confusion
        
      } else {
        // No messages at all - Add a welcome message from Saarth
        if (activeConceptTitle) {
          // Get welcome message
          const welcomeMessage = getConceptWelcomeMessage(
            activeConceptId, 
            activeConceptTitle,
            userName
          );
          
          // Create message object
          const welcomeMessageObj = createMessage(welcomeMessage, 'assistant', 'greeting');
          
          // Save to Firestore
          await saveConceptMessage(welcomeMessage, 'assistant', activeConceptId, 'greeting');
          
          // Add to UI
          setMessages([welcomeMessageObj]);
        }
      }
    } catch (error) {
      console.error("❌ Error loading concept messages:", error);
    } finally {
      setIsTyping(false);
    }
  };
  
  // Load messages when concept changes (your existing code)
  useEffect(() => {
    // Only fetch if the concept ID has actually changed to avoid unnecessary reloads
    if (activeConceptId && activeConceptId !== previousConceptIdRef.current) {
      setMessages([]);
      
      // Track concept usage for analytics
      trackConceptUsage(activeConceptId, activeConceptTitle);
      
      // Fetch messages for this concept
      fetchMessages();
      
      // Update the ref to the current concept ID
      previousConceptIdRef.current = activeConceptId;
    } else if (!activeConceptId) {
      // If there's no active concept, clear messages
      setMessages([]);
      previousConceptIdRef.current = null;
    }
  }, [activeConceptId, activeConceptTitle]);
  
  // Monitor auth state and reload messages when user authenticates (your existing code)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && activeConceptId) {
        console.log(`✅ User authenticated: ${user.uid}`);
        fetchMessages();
      } else {
        console.warn("⚠️ No authenticated user or no active concept.");
      }
    });
    
    return () => unsubscribe();
  }, [activeConceptId]);
  
  // MODIFIED: Handle sending a message - Added custom concept creation with first message
  const handleSendMessage = async () => {
    // Check if input is empty or if user is disabled
    if (!inputValue.trim() || isInputDisabled) {
      console.log("Send blocked:", {
        isEmpty: !inputValue.trim(),
        isDisabled: isInputDisabled
      });
      return;
    }
    
    try {
      // Disable input to prevent multiple sends
      setIsInputDisabled(true);
      
      // Create user message
      const userMessage = createMessage(inputValue.trim(), 'user');
      
      // If no concept selected, treat as concept selection
      if (!activeConceptId) {
        try {
          // Create a custom concept with the input text
          const conceptId = generateCustomConceptId();
          const title = inputValue.trim();
          
          // Save the custom concept to Firebase
          await saveCustomConcept(conceptId, title);
          
          // Get first message from Saarth
          const firstMessage = getCustomConceptFirstMessage(title, userName);
          
          // Save first message from Saarth
          await saveConceptMessage(firstMessage, 'assistant', conceptId, 'introduction');
          
          // Select the newly created concept - this will trigger the fetchMessages function
          if (onSelectConcept) {
            onSelectConcept(conceptId, title);
          }
          
          setInputValue('');
          setIsInputDisabled(false);
          return;
        } catch (error) {
          console.error("Error creating custom concept:", error);
          setIsInputDisabled(false);
          return;
        }
      }
      
      // Add user message to conversation
      setMessages(prev => [...prev, userMessage]);
      
      // Clear input value and reset height
      setInputValue('');
      if (inputRef.current) {
        inputRef.current.style.height = '54px';
      }
      
      // Show typing indicator
      setIsTyping(true);
      
      // Save user message to Firestore
      await saveConceptMessage(userMessage.text, 'user', activeConceptId);
      
      // Get AI response
      const contextMessages = [...messages, userMessage];
      const chatCompletionStream = await getGroqConceptCompletion(
        contextMessages,
        activeConceptTitle,
        undefined,
        messages.length <= 1 ? "concise" : "default"
      );
      
      if (!chatCompletionStream) {
        console.error("Failed to get chat completion stream");
        setIsTyping(false);
        setIsInputDisabled(false);
        return;
      }
      
      // Process streaming response
      let message = "";
      for await (const chunk of chatCompletionStream) {
        const chunkText = chunk.choices?.[0]?.delta?.content || "";
        message += chunkText;
      }
      
      // Create and add AI message
      const aiMessage = createMessage(message, 'assistant', 'explanation');
      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message to Firestore
      await saveConceptMessage(aiMessage.text, 'assistant', activeConceptId, 'explanation');
      
    } catch (error) {
      console.error("Error generating concept response:", error);
    } finally {
      // Always ensure typing indicator is removed and input is re-enabled
      setIsTyping(false);
      setIsInputDisabled(false);
      
      // Scroll to the bottom after a short delay to ensure new messages are rendered
      setTimeout(scrollToBottom, 100);
      
      // Re-focus the input after a short delay
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    }
  };
  
  // Remaining functions (your existing code)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const autoResizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height (with cap at 120px)
    const newHeight = Math.min(textarea.scrollHeight, 120);
    
    // Set the new height
    textarea.style.height = `${newHeight}px`;
    
    // Log for debugging
    console.log(`Textarea resized to ${newHeight}px`);
  };
  
  useEffect(() => {
    // Auto-resize whenever input value changes
    autoResizeTextarea(inputRef.current);
  }, [inputValue]);
  
  const handleRegenerateResponse = async () => {
    // Your existing code for regenerating responses
    // ...
  };
  
  const handleGenerateExample = async (exampleType: string) => {
    // Your existing code for generating examples
    // ...
  };
  
  const toggleExampleMenu = () => {
    setShowExampleMenu(!showExampleMenu);
  };
  
  // Automatically scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Focus the input field when component mounts or input is enabled
  useEffect(() => {
    if (!isInputDisabled && inputRef.current && activeConceptId) {
      // Delay focus slightly to ensure UI has rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isInputDisabled, activeConceptId]);

  // Check if input container is visible and adjust if needed
  useEffect(() => {
    const checkInputVisibility = () => {
      if (inputContainerRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect();
        const isVisible = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
        
        console.log("Input container visibility check:", isVisible, rect);
        
        // If not visible, try to adjust (could add more specific adjustments here)
        if (!isVisible && inputRef.current) {
          inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    };
    
    // Check visibility on mount and when relevant props change
    checkInputVisibility();
    
    // Also check visibility on window resize
    window.addEventListener('resize', checkInputVisibility);
    return () => window.removeEventListener('resize', checkInputVisibility);
  }, [activeConceptId, isPanelOpen]);

  return (
    <div className={`concepts-area ${isPanelOpen ? 'panel-open' : ''}`}>
      {activeConceptId && messages.length === 0 && !isTyping ? (
        <div className="concepts-messages">
          <div className="concept-intro">
            <h2>{activeConceptTitle}</h2>
            <p>What would you like to know about {activeConceptTitle}?</p>
          </div>
          <div ref={messagesEndRef} />
        </div>
      ) : activeConceptId && (messages.length > 0 || isTyping) ? (
        <div className="concepts-messages">
          {messages.map((message) => {
            // Determine if this is the latest AI message
            const isLatestAiMessage = 
              message.sender === 'assistant' && 
              message.id === [...messages].filter(m => m.sender === 'assistant').pop()?.id;
              
            return (
              <Message 
                key={message.id || Date.now().toString()}
                text={message.text}
                sender={message.sender}
                type={message.type}
                isLatest={isLatestAiMessage}
                onRegenerateResponse={handleRegenerateResponse}
                onGenerateExample={handleGenerateExample}
              />
            );
          })}
          
          {isTyping && (
            <div className="message assistant-message typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="concepts-welcome">
          <h2>What would you like to learn about?</h2>
          <p>Type a concept below, and I'll explain it in a way that makes sense to you.</p>
          
          <div className="concepts-suggestion-grid">
            {randomConcepts.map(concept => (
              <div 
                key={concept.id}
                className="concept-suggestion-card"
                onClick={() => handleConceptSelect(concept.id, concept.title)}
              >
                <div 
                  className="concept-suggestion-image" 
                  style={{ backgroundImage: `url(${concept.imageUrl})` }}
                ></div>
                <div className="concept-suggestion-content">
                  {concept.category && <span className="concept-suggestion-category">{concept.category}</span>}
                  <h3 className="concept-suggestion-title">{concept.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Fixed input container with improved positioning */}
      <div 
        ref={inputContainerRef}
        className={`concepts-input-container ${isPanelOpen ? 'panel-open' : ''}`}
      >
        <textarea
          ref={inputRef}
          className="concepts-input"
          placeholder={activeConceptId ? `Ask about ${activeConceptTitle}...` : "Type a concept..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isInputDisabled}
          style={{ height: '54px' }}
        />
        <button 
          className="send-button"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isInputDisabled}
          aria-label="Send message"
        >
          <IoArrowUpCircleSharp />
        </button>
      </div>
    </div>
  );
};

export default ConceptsArea;