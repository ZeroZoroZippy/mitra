import React, { useState, useEffect, useRef } from "react";
import "./ChatArea.css";
import ChatHeader from "./ChatHeader";
import { FaPaperPlane } from "react-icons/fa6";

import { auth } from "../../../../utils/firebaseConfig";
import { getMessages, saveMessage } from "../../../../utils/firebaseDb";

interface ChatAreaProps {
  activeChatId: number;
  isChatFullScreen: boolean;
  onToggleFullScreen: () => void;
  isSidebarOpen: boolean;
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

interface ChatMessage {
  text: string;
  sender: "user" | "ai";
  timestamp: string;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeChatId,
  isChatFullScreen,
  onToggleFullScreen,
  isSidebarOpen,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWelcomeActive, setIsWelcomeActive] = useState(true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [aiTypingMessage, setAiTypingMessage] = useState("");
  const [isInputDisabled, setIsInputDisabled] = useState(false); // ✅ Prevent multiple user messages
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // ✅ New State for Floating Date Header
  const [visibleDate, setVisibleDate] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const dateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = () => {
    const chatContainer = document.querySelector(".messages-container");
    if (!chatContainer) return;
  
    const dateHeaders = document.querySelectorAll(".date-header");
    let newVisibleDate: string | null = null;
  
    for (const header of dateHeaders) {
      const rect = header.getBoundingClientRect();
      
      // ✅ Check if the date header is within the visible viewport
      if (rect.top >= 0 && rect.top <= 120) {
        newVisibleDate = header.textContent;
        break;
      }
    }
  
    // ✅ Update floating header only if a new date is detected
    if (newVisibleDate && newVisibleDate !== visibleDate) {
      setVisibleDate(newVisibleDate);
      setFadeOut(false); // ✅ Reset fade-out when a new date appears
  
      if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current);
  
      // ✅ Delay fade-out by 3 seconds
      dateTimeoutRef.current = setTimeout(() => {
        setFadeOut(true);
      }, 3000);
    }
  };

const formatMessageDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  }
};

const groupMessagesByDate = (messages: ChatMessage[]) => {
  const groups: { [key: string]: ChatMessage[] } = {};
  
  messages.forEach(message => {
    const dateStr = formatMessageDate(message.timestamp);
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(message);
  });

  return groups;
};

  const createMessage = (text: string, sender: "user" | "ai"): ChatMessage => ({
    text,
    sender,
    timestamp: new Date().toISOString(),
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInputMessage(e.target.value);

    // ✅ If it's a textarea, adjust height dynamically
    if (e.target instanceof HTMLTextAreaElement) {
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
    }
  };

  const getAIResponse = (userMessage: string) => {
    const responses: { [key: string]: string } = {
      "I had this interesting dream last night...":
        "Dreams can be fascinating! Please tell me more about what happened in your dream.",
      "I could use some advice about...":
        "I'm here to help. What's on your mind?",
      "I've been feeling uncertain about...":
        "It's normal to feel uncertain sometimes. Would you like to talk about what's causing these feelings?",
      "Hey, can we just chat?":
        "Of course! I'm always here to chat. How has your day been?",
    };
    return (
      responses[userMessage] ||
      "I'm here to listen and chat. Can you tell me more about that?"
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isInputDisabled) return;
  
    const userMessage = createMessage(inputMessage.trim(), "user");
    const user = auth.currentUser;
  
    console.log("Attempting to save user message:", userMessage); // ✅ Debug log
  
    if (user) {
      console.log("User ID before saving:", user.uid); // ✅ Debug log to confirm user authentication
      await saveMessage(userMessage.text, "user"); // ✅ FIXED: Now correctly calls saveMessage()
    }
  
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsWelcomeActive(false);
    setIsInputDisabled(true);
  
    if (inputRef.current) {
      inputRef.current.style.height = "40px";
    }
  
    setTimeout(() => {
      setShowTypingIndicator(true);
    }, 800);
  
    setTimeout(() => {
      animateAITyping(getAIResponse(userMessage.text));
    }, 1500);
  };

  const handleWelcomeSuggestion = async (suggestion: string) => {
    if (isInputDisabled) return;
  
    const userMessage = createMessage(suggestion, "user");
    const user = auth.currentUser;
  
    console.log("Saving suggested message:", userMessage); // ✅ Debugging log
  
    if (user) {
      console.log("User ID before saving:", user.uid); // ✅ Debug log to confirm user authentication
      await saveMessage(userMessage.text, "user"); // ✅ FIXED: Now correctly saves suggested messages
    }
  
    setMessages((prev) => [...prev, userMessage]);
    setIsWelcomeActive(false);
    setIsInputDisabled(true);
  
    setTimeout(() => {
      setShowTypingIndicator(true);
    }, 800);
  
    setTimeout(() => {
      animateAITyping(getAIResponse(userMessage.text));
    }, 1500);
  };

  const animateAITyping = (aiText: string) => {
    if (!aiText || aiText.length === 0) return;
  
    setAiTypingMessage("");
    setShowTypingIndicator(true);
  
    let index = 0;
    const interval = setInterval(() => {
      if (index < aiText.length) {
        setAiTypingMessage((prev) => prev + aiText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
  
        setTimeout(() => {
          const aiMessage = createMessage(aiText, "ai");
          setMessages((prev) => [...prev, aiMessage]);
  
          const user = auth.currentUser;
          if (user) {
            console.log("Saving AI Message:", aiMessage);
            saveMessage(aiText, "ai"); // ✅ FIXED!
          }
  
          setShowTypingIndicator(false);
          setAiTypingMessage("");
          setIsInputDisabled(false);
        }, 500);
      }
    }, 20);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  //Use Effect to fetch messages//
  useEffect(() => {
    const fetchMessages = async () => {
      const user = auth.currentUser;
      if (user) {
        const loadedMessages = await getMessages(user.uid);
        const formattedMessages: ChatMessage[] = loadedMessages.map(
          (doc: any) => ({
            text: doc.text,
            sender: doc.sender,
            timestamp: doc.timestamp,
          })
        );
        setMessages(formattedMessages);
        setIsWelcomeActive(loadedMessages.length === 0);
      }
    };
    fetchMessages();
  }, [activeChatId]); // ✅ Triggers when chat ID changes

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isInputDisabled && inputRef.current) {
      inputRef.current.focus(); // ✅ Restores focus after AI finishes typing
    }
  }, [isInputDisabled]);

  useEffect(() => {
    const chatContainer = document.querySelector(".messages-container");
    
    if (chatContainer) {
      chatContainer.addEventListener("scroll", handleScroll);
    }
  
    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener("scroll", handleScroll);
      }
      if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current);
    };
  }, []);


  return (
    <div className="chat-area">
      <ChatHeader
        onToggleFullScreen={onToggleFullScreen}
        isChatFullScreen={isChatFullScreen}
        isSidebarOpen={isSidebarOpen}
      />
  
      {/* ✅ Floating Date Header - Updates on Scroll */}
      {visibleDate && (
        <div className={`floating-date ${fadeOut ? "fade-out" : ""}`}>
          {visibleDate}
        </div>
      )}
  
      {isWelcomeActive ? (
        <div className="welcome-container">
          <h1 className="welcome-heading">What can I help with?</h1>
          <div className="input-send-container">
            <input
              type="text"
              className="centered-input"
              placeholder="Hey Mitra, what's up?"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
            />
            <button className="send-icon-button" onClick={handleSendMessage}>
              <FaPaperPlane />
            </button>
          </div>
          <div className="suggestion-buttons">
            <button
              className="suggestion-button"
              onClick={() =>
                handleWelcomeSuggestion(
                  "I had this interesting dream last night..."
                )
              }
            >
              Talk about a dream
            </button>
            <button
              className="suggestion-button"
              onClick={() =>
                handleWelcomeSuggestion("I could use some advice about...")
              }
            >
              I need advice
            </button>
            <button
              className="suggestion-button"
              onClick={() =>
                handleWelcomeSuggestion("I've been feeling uncertain about...")
              }
            >
              Self-doubt
            </button>
            <button
              className="suggestion-button"
              onClick={() => handleWelcomeSuggestion("Hey, can we just chat?")}
            >
              Just talk...
            </button>
          </div>
        </div>
      ) : (
        <div className="messages-container">
          {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
            <React.Fragment key={date}>
              <div className="date-header">
                <span className="date-label">{date}</span>
              </div>
              {dateMessages.map((message, index) => (
                <div
                  key={`${date}-${index}`}
                  className={`message-bubble ${message.sender}-bubble`}
                >
                  {message.text}
                </div>
              ))}
            </React.Fragment>
          ))}
          {showTypingIndicator && (
            <div className="ai-typing-message">
              Mitra is typing
              <span className="ellipsis">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
  
      {!isWelcomeActive && (
        <div>
          <div className="input-bar">
            <div className="input-send-container">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isInputDisabled}
              />
              <button
                className="send-icon-button"
                onClick={handleSendMessage}
                disabled={isInputDisabled}
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
          <div className="chat-footer">
            <p className="precaution-message">
              Your Mitra apologizes for any mistakes made.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
