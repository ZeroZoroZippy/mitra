import React, { useState, useEffect, useRef } from "react";
import "./ChatArea.css";
import ChatHeader from "./ChatHeader";
import { FaPaperPlane } from "react-icons/fa6";
import { IoCopyOutline } from "react-icons/io5";
import { auth } from "../../../../utils/firebaseConfig";
import { AiFillLike, AiFillDislike, AiOutlineLike, AiOutlineDislike } from "react-icons/ai";
import { getMessages, saveMessage, updateLikeStatus } from "../../../../utils/firebaseDb";
import { getGroqChatCompletion, getRecentMessages, estimateTokenUsage } from "../../../../utils/getGroqChatCompletion";
import { exportToGoogleSheets, syncFirestoreToGoogleSheets } from "../../../../utils/googleSheets";

interface ChatAreaProps {
  activeChatId: number;
  isSidebarOpen: boolean;
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

interface ChatMessage {
  id?: string; // Add optional id field
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  likeStatus?: "like" | "dislike" | null; // ✅ Store Like/Dislike status
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeChatId,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWelcomeActive, setIsWelcomeActive] = useState(true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [aiTypingMessage, setAiTypingMessage] = useState("");
  const [isInputDisabled, setIsInputDisabled] = useState(false); // ✅ Prevent multiple user messages.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // ✅ New State for Floating Date Header
  const [visibleDate, setVisibleDate] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const dateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);  // ✅ State to track copy icon fade-in effect
  const [showCopyIcon, setShowCopyIcon] = useState<{ [key: string]: boolean }>({});
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [seenMessageId, setSeenMessageId] = useState<string | null>(null); // ✅ Track last seen message
  // ✅ Get the last AI message ID
  const lastAiMessageId = messages.filter((msg) => msg.sender === "assistant").slice(-1)[0]?.id || null;
  const [shouldPurge, setShouldPurge] = useState(false);
  const BACKUP_SYNC_INTERVAL = 900000;

  useEffect(() => {
    const { shouldPurge } = getRecentMessages(messages);
    setShouldPurge(shouldPurge);
  }, [messages]);

  const handlePurge = () => {
    setMessages([{ text: "Memory refreshed! Let’s start fresh. 😊", sender: "assistant", timestamp: new Date().toISOString() }]);
    setShouldPurge(false);
  };

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
    if (!timestamp) return "Unknown Date";
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Unknown Date";
  
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

  const createMessage = (text: string, sender: "user" | "assistant"): ChatMessage => ({
    id: crypto.randomUUID(), 
    text,
    sender,
    timestamp: new Date().toISOString(),
    likeStatus: null,
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
  
    console.log("📩 User Message Sent:", userMessage);
    console.log("📩 Current Messages Before AI Response:", messages);
  
    if (user) {
      console.log("📌 User ID before saving:", user.uid);
      await saveMessage(userMessage.text, "user");
    }
  
    // ✅ Add user message to state BEFORE AI processes
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsWelcomeActive(false);
    setIsInputDisabled(true);
  
    if (inputRef.current) {
      inputRef.current.style.height = "40px";
    }
  
    // ✅ Step 1: Random delay before showing "Seen just now" (Between 1-7 sec)
    const seenDelay = Math.floor(Math.random() * 7000) + 1000;
  
    setTimeout(() => {
      if (userMessage.id) {
        setSeenMessageId(String(userMessage.id));
      }
  
      // ✅ Step 2: Delay before AI starts typing (1 sec after "Seen")
      setTimeout(async () => {
        setShowTypingIndicator(true);
  
        // ✅ Get the last N messages while staying within token limits
        const recentMessagesResult = getRecentMessages([...messages, userMessage]);
  
        console.log("🛠️ Selected Recent Messages for Context:", recentMessagesResult);
        console.log("🛠️ Estimated Token Usage:", estimateTokenUsage(recentMessagesResult.messages));
        console.log("🛠️ Tokens Left for Completion:", 8000 - estimateTokenUsage(recentMessagesResult.messages));
  
        try {
          const chatCompletionStream = await getGroqChatCompletion(recentMessagesResult.messages);
  
          if (!chatCompletionStream) {
            console.error("❌ AI Response Stream is null! Possibly token limit issue.");
            setShowTypingIndicator(false);
            setIsInputDisabled(false);
            return;
          }
  
          let message = "";
  
          // ✅ Log AI stream chunks
          for await (const chunk of chatCompletionStream) {
            const chunkText = chunk.choices?.[0]?.delta?.content || "";
            message += chunkText;
            setAiTypingMessage(message);
          }
  
          console.log("✅ Full AI response received:", message);
  
          // ✅ AI message should be "assistant"
          const aiMessage = createMessage(message, "assistant");
          console.log("📝 AI Message Object Before Saving:", aiMessage);
  
          await saveMessage(message, "assistant");
  
          setShowTypingIndicator(false);
          setAiTypingMessage("");
          setIsInputDisabled(false);
          setMessages((prev) => [...prev, aiMessage]);
  
          // ✅ Step 3: Remove "Seen just now" after AI response
          setSeenMessageId(null);
  
        } catch (error) {
          console.error("❌ Error during AI response:", error);
          setShowTypingIndicator(false);
          setIsInputDisabled(false);
        }
  
      }, 1000);
  
    }, seenDelay);
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

  const animateAITyping = async (aiText: string) => {
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
          const aiMessage = createMessage(aiText, "assistant");
          setMessages((prev) => [...prev, aiMessage]);
  
          const user = auth.currentUser;
          if (user) {
            console.log("Saving AI Message:", aiMessage);
            saveMessage(aiText, aiMessage.sender); // ✅ FIXED!
          }
  
          setShowTypingIndicator(false);
          setAiTypingMessage("");
          setIsInputDisabled(false);
        }, 500);
      }
    }, 20);
  
    // Add cleanup
    return () => clearInterval(interval);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Copy message to clipboard
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ✅ Function to toggle Like/Dislike
  const handleLikeDislike = async (messageId: string, currentStatus: "like" | "dislike" | null, action: "like" | "dislike") => {
    try {
      const newStatus = currentStatus === action ? null : action;
      await updateLikeStatus(messageId, newStatus);
      
      setMessages(messages.map(msg => 
        msg.id === messageId ? {...msg, likeStatus: newStatus} : msg
      ));
    } catch (error) {
      console.error("Error updating like status:", error);
    }
  };

  useEffect(() => {
    syncFirestoreToGoogleSheets(); // ✅ Only one real-time listener will be created now
    
    const interval = setInterval(() => {
      console.log("⏳ Running scheduled backup sync...");
      exportToGoogleSheets(); // ✅ Backup sync ensures no messages are lost
    }, BACKUP_SYNC_INTERVAL);
  
    return () => clearInterval(interval);
  }, []);

  // ✅ Delay before showing the copy icon
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  //Use Effect to fetch messages//
  useEffect(() => {
    const fetchMessages = async () => {
      const user = auth.currentUser;
      if (user) {
        const loadedMessages = await getMessages(user.uid);
        const formattedMessages: ChatMessage[] = loadedMessages.map(
          (doc: any) => ({
            id: doc.id,
            text: doc.text,
            sender: doc.sender,
            timestamp: doc.timestamp,
            likeStatus: doc.likeStatus
          })
        );
        setMessages(formattedMessages);
        setIsWelcomeActive(loadedMessages.length === 0);
      }
    };
    fetchMessages();
  }, [activeChatId]); // ✅ Triggers when chat ID changes

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


  /* Fix Safari Bottom URL Bar Overlapping Input Bar */
  const isIOS = () => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  };
  
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  
  useEffect(() => {
    if (isIOS()) {
      setIsIOSDevice(true);
      document.body.classList.add("ios-fix");
  
      // ✅ Dynamically update viewport height to prevent input bar overlap
      const updateViewportHeight = () => {
        document.documentElement.style.setProperty(
          "--vh",
          `${window.innerHeight * 0.01}px`
        );
      };
  
      window.addEventListener("resize", updateViewportHeight);
      updateViewportHeight(); // ✅ Set on first render
  
      return () => {
        window.removeEventListener("resize", updateViewportHeight);
        document.body.classList.remove("ios-fix"); // ✅ Remove class when component unmounts
      };
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      document.body.classList.add("keyboard-open");
    };
  
    const handleBlur = () => {
      document.body.classList.remove("keyboard-open");
    };
  
    const inputs = document.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      input.addEventListener("focus", handleFocus);
      input.addEventListener("blur", handleBlur);
    });
  
    return () => {
      inputs.forEach((input) => {
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("blur", handleBlur);
      });
    };
  }, []);


  return (
    <div className="chat-area">
      <ChatHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
  
      {/* ✅ Floating Date Header - Updates on Scroll */}
      {visibleDate && (
        <div className={`floating-date ${fadeOut ? "fade-out" : ""}`}>
          {visibleDate}
        </div>
      )}
      {/* ✅ Auto-Purge UI - Only shows if needed */}
      {shouldPurge && (
        <div className="purge-warning">
          <p>⚠️ Our chat history is getting long. Want to refresh memory?</p>
          <button className="purge-btn" onClick={handlePurge}>Yes</button>
          <button className="continue-btn" onClick={() => setShouldPurge(false)}>No</button>
        </div>
      )}
  
      {isWelcomeActive ? (
        <div className="welcome-container">
          <h1 className="welcome-heading">Lost? Or just discovering the path?</h1>
          <div className="input-send-container">
            <input
              type="text"
              className="centered-input"
              placeholder="Hey Mitra, what's up?"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePurge(); } }}
              disabled={isInputDisabled}
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
                <div key={`${date}-${index}`} className="message-container">
                  <div className={`message-bubble ${message.sender}-bubble`}>
                    {message.text}
                  </div>
                  {/* ✅ Show "Seen just now" for the last sent user message */}
                  {message.sender === "user" && message.id === seenMessageId && (
                    <p className="seen-text">Seen just now</p>
                  )}
                  <div
                    className={`message-actions ${
                      message.sender === "assistant" && message.id === messages[messages.length - 1]?.id
                        ? "always-visible"
                        : "hover-visible"
                    }`}
                  >
                    {/* ✅ Copy icon - stays hover-only */}
                    <IoCopyOutline
                      className={`action-icon copy-icon ${activeMessageId === message.id ? "hide-copy" : ""}`}
                      title="Copy Message"
                      onClick={() => handleCopyMessage(message.text)}
                    />
                    {message.sender === "assistant" && message.id && (
                      <>
                        {message.likeStatus === "like" ? (
                          <AiFillLike
                            className="action-icon active"
                            title="Like"
                            onClick={() => {
                              if (!message.id) return;
                              setActiveMessageId(message.id);
                              handleLikeDislike(message.id, "like", "like");
                            }}
                          />
                        ) : (
                          <AiOutlineLike
                            className="action-icon"
                            title="Like"
                            onClick={() => {
                              if (!message.id) return;
                              setActiveMessageId(message.id);
                              handleLikeDislike(message.id, message.likeStatus ?? null, "like");
                            }}
                          />
                        )}

                        {message.likeStatus === "dislike" ? (
                          <AiFillDislike
                            className="action-icon active"
                            title="Dislike"
                            onClick={() => {
                              if (!message.id) return;
                              setActiveMessageId(message.id);
                              handleLikeDislike(message.id, "dislike", "dislike");
                            }}
                          />
                        ) : (
                          <AiOutlineDislike
                            className="action-icon"
                            title="Dislike"
                            onClick={() => {
                              if (!message.id) return;
                              setActiveMessageId(message.id);
                              handleLikeDislike(message.id, message.likeStatus ?? null, "dislike");
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
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
            {/* ✅ Precaution message moved inside input-bar above input-send-container */}
            {!isWelcomeActive && (
              <div className="precaution-message-container">
                <p className="precaution-message">
                  Your Mitra apologizes for any mistakes made.
                </p>
              </div>
            )}
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
        </div>
      )}
    </div>
  );
};

export default ChatArea;