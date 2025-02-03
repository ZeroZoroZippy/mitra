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
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsWelcomeActive(false);
    setIsInputDisabled(true);

    if (inputRef.current) {
      inputRef.current.style.height = "40px";
    }

    const user = auth.currentUser;
    if (user) {
      // Fire-and-forget: initiate saving without waiting for it to complete
      saveMessage(user.uid, userMessage.text, userMessage.sender).catch(
        (error) => console.error("Failed to save message:", error)
      );
    }

    setTimeout(() => {
      setShowTypingIndicator(true);
    }, 800);

    setTimeout(() => {
      animateAITyping(getAIResponse(userMessage.text));
    }, 1500);
  };

  const handleWelcomeSuggestion = (suggestion: string) => {
    if (isInputDisabled) return;

    const userMessage = createMessage(suggestion, "user");
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
        // Optional fade-out: add the fade-out class before removing the indicator
        const typingElement = document.querySelector(".ai-typing-message");
        if (typingElement) {
          typingElement.classList.add("fade-out");
        }
        setTimeout(() => {
          const aiMessage = createMessage(aiText, "ai");
          setMessages((prev) => [...prev, aiMessage]);
          setShowTypingIndicator(false);
          setAiTypingMessage("");
          setIsInputDisabled(false);
        }, 500); // This should match the fade-out duration in CSS
      }
    }, 20);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="chat-area">
      <ChatHeader
        onToggleFullScreen={onToggleFullScreen}
        isChatFullScreen={isChatFullScreen}
        isSidebarOpen={isSidebarOpen}
      />

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
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message-bubble ${message.sender}-bubble`}
            >
              {message.text}
            </div>
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
