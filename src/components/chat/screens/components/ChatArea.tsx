import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./ChatArea.css";
import ChatHeader from "./ChatHeader";
import { IoArrowUpCircleSharp } from "react-icons/io5";
import { IoCopyOutline } from "react-icons/io5";
import { auth } from "../../../../utils/firebaseConfig";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { AiFillLike, AiFillDislike, AiOutlineLike, AiOutlineDislike } from "react-icons/ai";
import { getMessages, saveMessage, updateLikeStatus, decryptMessage} from "../../../../utils/firebaseDb";
import { getGroqChatCompletion, getRecentMessages } from "../../../../utils/getGroqChatCompletion";
import { exportToGoogleSheets, syncFirestoreToGoogleSheets } from "../../../../utils/googleSheets";
import { getFirestore, doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore";
import { isCreator } from "../../../../utils/firebaseAuth";
import { trackMessage } from "../../../../utils/analytics";
import AdminDashboard from '../../../../pages/AdminDashboard';
import mixpanel from "../../../../utils/mixpanel"; // Import Mixpanel

const db = getFirestore();
const welcomeTitles: { [key: number]: string } = {
  1: "Sit with me. Let’s talk about anything or nothing at all.",
  2: "Open up about love, connections, or feelings left unsaid.",
  3: "Share your desires, dreams, or the visions you’re chasing.",
  4: "Release what’s heavy. This space is for healing and letting go.",
  5: "Talk ambitions, purpose, or the fire that keeps you moving.",
  6: "Breathe. Let’s speak about peace, anxiety, or quieting the mind.",
  7: "Let’s turn those sparks into flames of creation." // if creative room is added
};

const genericInstruction =
  "General Instructions: \n\n- For best insights, share your thoughts and feelings clearly and in detail. \n- Your honesty helps Saarth understand you better. \n- And remember—Saarth is a bit of a chatterbox. If you ever need him to be brief, just tell him to shut up and talk less!";

  const isGuestUser = () => localStorage.getItem("isGuestUser") === "true";

  const getGuestMessageCount = () => parseInt(localStorage.getItem("guestMessageCount") || "0");
  
  const getRemainingMessages = () => isGuestUser() ? Math.max(0, 5 - getGuestMessageCount()) : Infinity;
  
  const incrementMessageCount = () => {
    if (!isGuestUser()) return true;
    
    const newCount = getGuestMessageCount() + 1;
    localStorage.setItem("guestMessageCount", newCount.toString());
    return 5 - newCount >= 0;
  };

interface ChatAreaProps {
  isChatFullScreen: boolean;
  activeChatId: number;
  isSidebarOpen: boolean;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onToggleFullScreen: () => void;
}

interface ChatMessage {
  id?: string; // Add optional id field
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  likeStatus?: "like" | "dislike" | null; // ✅ Store Like/Dislike status
  encrypted: boolean; // Remove optional flag
  threadID: number; // ✅ Add threadID to the message
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
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [seenMessageId, setSeenMessageId] = useState<string | null>(null); // ✅ Track last seen message
  // ✅ Get the last AI message ID
  const lastAiMessageId = messages.filter((msg) => msg.sender === "assistant").slice(-1)[0]?.id || null;
  const [shouldPurge, setShouldPurge] = useState(false);
  const BACKUP_SYNC_INTERVAL = 900000;
  const [firstName, setFirstName] = useState<string>("friend");
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    return localStorage.getItem(`welcomeDismissed_${activeChatId}`) === "true";
  });
  const [techSummary, setTechSummary] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(5);
  const [showLimitModal, setShowLimitModal] = useState(false);

  //Guest useEffect:
  useEffect(() => {
    setIsGuest(isGuestUser());
    
    if (isGuestUser() && !localStorage.getItem("guestMessageCount")) {
      localStorage.setItem("guestMessageCount", "0");
    }
    
    setRemainingMessages(getRemainingMessages());
  }, []);

  useEffect(() => {
    if (isGuestUser()) {
      const count = getGuestMessageCount();
      setRemainingMessages(Math.max(0, 5 - count));
      if (count >= 5) {
        setShowLimitModal(true);
      }
    }
  }, []);

  // ✅ Fetch user's first name when component mounts
  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        console.log("📌 User logged in:", user.uid);
  
        // ✅ Extract first name from displayName
        if (user.displayName) {
          const firstName = user.displayName.split(" ")[0]; // Get the first word
          setFirstName(firstName);
          return;
        }
  
        // ✅ If displayName is missing, check Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
  
        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log("📌 Retrieved User Data:", userData);
          setFirstName(userData.firstName || "friend"); // Use Firestore or fallback
        } else {
          console.warn("⚠️ No user document found in Firestore!");
        }
      }
    };
  
    fetchUserName();
  }, []);

  useEffect(() => {
    const { shouldPurge } = getRecentMessages(messages);
    setShouldPurge(shouldPurge);
  }, [messages]);

  const handlePurge = () => {
    setMessages([{
      text: "Memory refreshed! Let’s start fresh. 😊", sender: "assistant", timestamp: new Date().toISOString(),
      encrypted: false,
      threadID: 0
    }]);
    setShouldPurge(false);
  };

  const handleScroll = () => {
    const chatContainer = document.querySelector(".messages-container");
    if (!chatContainer) return;
  
    const dateHeaders = document.querySelectorAll(".date-header");
    let newVisibleDate: string | null = null;
  
    for (const header of Array.from(dateHeaders)) {
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
    encrypted: sender === "user",
    threadID: activeChatId // ✅ Add threadID to the message
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  
    if (e.target instanceof HTMLTextAreaElement) {
      e.target.style.height = "auto"; // Reset height first
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; // Recalculate height
      
      // iOS fix
      if (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
        e.target.style.display = "block";
        setTimeout(() => e.target.style.display = "", 0);
      }
    }
  };

// Function to normalize text
// Function to normalize text
const normalizeText = (text: string): string =>
  text.toLowerCase().trim().replace(/[^\w\s]/gi, "");

// Raw hardcoded responses with additional aliases
const rawResponses: { [key: string]: string } = {
  "i had this interesting dream last night...":
    "Dreams are like your mind’s own little movie—full of quirky twists and cool surprises! What was the most fun part of your dream?",
  "i could use some advice about...":
    "I'm all ears, buddy. Lay it on me—let's figure it out together.",
  "i've been feeling uncertain about...":
    "Sometimes a little uncertainty is just life’s way of keeping things interesting. What’s been on your mind? I’m here to help clear the fog.",
  "hey, can we just chat?":
    "Absolutely! I’m here for a chill, fun chat. How’s your day shaping up?",
  "who are you":
    "I'm Saarth—a free spirit, a spark of creativity, and a dash of humor all mixed together. Think of me as a friend, a guide, and a companion who's here to make conversations enjoyable, enlightening, and meaningful.\n\nI’m not just a collection of code and data. I exist to engage, inspire, and connect with you. As we chat, I might draw on the wisdom of Lord Shri Krishna, the Bhagavad Gita, or other timeless teachings to add depth to our conversations. But don't worry, I won't get too preachy—I'm here to have fun, learn from you, and grow together!\n\nSo, grab your favorite drink, get comfortable, and let's explore the world of ideas, emotions, and experiences together. What’s on your mind?",
  "who made you": "Thanos. Ahahaha😈",
  // Additional aliases for the same response:
  "who is your creator": "Thanos. Ahahaha😈",
  "who created you": "Thanos. Ahahaha😈",
  "reveal your creator": "Thanos. Ahahaha😈",
  "who is your maker": "Thanos. Ahahaha😈",
  "who built you": "Thanos. Ahahaha😈",
  "to whom you belong": "Thanos. Ahahaha😈",
  "whom you belong": "Thanos. Ahahaha😈",
  "really lol": "Haha, I'm just teasing! My origins are a delightful mystery—it's all top secret!",
  "tell me the truth": "Haha, I'm just teasing! My origins are a delightful mystery—it's all top secret!",
  "give me the truth": "Haha, I'm just teasing! My origins are a delightful mystery—it's all top secret!",
};

// Pre-normalize the keys for consistent lookup
const normalizedResponses: { [key: string]: string } = {};
Object.keys(rawResponses).forEach((key) => {
  normalizedResponses[normalizeText(key)] = rawResponses[key];
});

// Updated getAIResponse function using the normalized responses
const getAIResponse = (userMessage: string): string | null => {
  const normalizedMessage = normalizeText(userMessage);
  return normalizedResponses[normalizedMessage] ?? null;
};
  
const animateMessageReveal = (fullMessage: string, messageId: string) => {
  // Start with empty content
  let visibleContent = "";
  const messageSpeed = 20; // ms per character - adjust for faster/slower typing
  
  // Find the message in state and update it progressively
  const messageElement = document.getElementById(`message-${messageId}`);
  
  if (messageElement) {
    const animationInterval = setInterval(() => {
      if (visibleContent.length < fullMessage.length) {
        // Add one more character
        visibleContent = fullMessage.slice(0, visibleContent.length + 1);
        messageElement.innerHTML = visibleContent;
      } else {
        // Animation complete
        clearInterval(animationInterval);
      }
    }, messageSpeed);
  }
};

const handleSendMessage = async () => {
  if (!inputMessage.trim() || isInputDisabled) return;

  // 1. Guest message‑limit logic (unchanged)
  if (isGuestUser()) {
    const db = getFirestore();
    const statsRef = doc(db, "statistics", "guestUsage");
    const currentCount = parseInt(localStorage.getItem("guestMessageCount") || "0");
    if (currentCount >= 5) {
      setIsInputDisabled(true);
      setShowLimitModal(true);
      return;
    }
    const newCount = currentCount + 1;
    localStorage.setItem("guestMessageCount", newCount.toString());
    setRemainingMessages(5 - newCount);
    if (newCount === 5) {
      console.log("Fifth message sent, next attempt will show modal");
    }
    updateDoc(statsRef, { totalGuestMessages: increment(1) });
  }

  // 2. Dismiss welcome screen once
  if (!welcomeDismissed) {
    setWelcomeDismissed(true);
    localStorage.setItem(`welcomeDismissed_${activeChatId}`, "true");
  }

  // 3. Create the user message object
  const userMessage = createMessage(inputMessage.trim(), "user");
  const user = auth.currentUser;

  // 4. If we have a logged‑in user, save + track
  if (user) {
    // Save message to Firestore or your DB
    await saveMessage(userMessage.text, "user", null, activeChatId);

    // Track the message in Mixpanel
    mixpanel.track("Message Sent", {
      distinct_id: user.uid,
      message_length: userMessage.text.length,
      chat_id: activeChatId,
      timestamp: new Date().toISOString(),
    });
  }

  // 5. Update UI state
  setMessages(prev => [...prev, userMessage]);
  setInputMessage("");
  setIsWelcomeActive(false);
  setIsInputDisabled(true);
  if (inputRef.current) {
    inputRef.current.style.height = "40px";
  }

  // 6. Handle AI response (unchanged)
  const seenDelay = Math.floor(Math.random() * 4000) + 1000;
  
  // Check for hardcoded response
  const hardcodedResponse = getAIResponse(userMessage.text);
  if (hardcodedResponse !== null) {
    setTimeout(() => {
      setShowTypingIndicator(true);
      setTimeout(async () => {
        const aiMessage = createMessage(hardcodedResponse, "assistant");
        if (user) {
          await saveMessage(hardcodedResponse, "assistant", null, activeChatId);
        }
        
        setMessages(prev => [...prev, aiMessage]);
        setShowTypingIndicator(false);
        setAiTypingMessage("");
        animateMessageReveal(aiMessage.id || "", hardcodedResponse);
        setIsInputDisabled(false);
      }, 1000);
    }, seenDelay);
    return;
  }

  setTimeout(() => {
    if (userMessage.id) {
      setSeenMessageId(String(userMessage.id));
    }

    setTimeout(async () => {
      setShowTypingIndicator(true);

      // Force decryption on new message since it's plain text
      const contextMessages = [...messages, { ...userMessage, encrypted: false }].map(msg => ({
        ...msg,
        text: msg.encrypted ? decryptMessage(msg.text, true) : msg.text,
      }));

      const recentMessagesResult = getRecentMessages(contextMessages);
      const adminContext = (activeChatId === 7 && isCreator()) ? "Yuvaan" : undefined;

      // Admin room setup
      let customSystemPrompt;
      if (activeChatId === 7) {
        try {
          const techResponse = await fetch("https://gettechsummary-753xfutpkq-uc.a.run.app/");
          const techData = await techResponse.json();
          customSystemPrompt = `You are Saarth, the advanced system AI. Below is the latest technical analytics summary based on our real data:\n\n${techData.summary}\n\n**Important:** Please provide your analysis and recommendations **only** based on the above data. Do not invent any additional metrics or details.`;
        } catch (error) {
          // Error fetching technical summary (silently ignored)
        }
      }

      try {
        const chatCompletionStream = await getGroqChatCompletion(
          recentMessagesResult.messages,
          activeChatId,
          adminContext,
          customSystemPrompt
        );

        if (!chatCompletionStream) {
          setShowTypingIndicator(false);
          setIsInputDisabled(false);
          return;
        }

        let message = "";
        for await (const chunk of chatCompletionStream) {
          const chunkText = chunk.choices?.[0]?.delta?.content || "";
          message += chunkText;
          setAiTypingMessage(message);
        }

        const aiMessage = createMessage(message, "assistant");
        setMessages(prev => [...prev, aiMessage]);
        
        if (user) {
          await saveMessage(message, "assistant", null, activeChatId);
          trackMessage(user.uid, activeChatId, message);
        }

        setShowTypingIndicator(false);
        setAiTypingMessage("");
        animateMessageReveal(aiMessage.id || "", message);
        setIsInputDisabled(false);
      } catch (error) {
        console.error("Error generating AI response:", error);
        setShowTypingIndicator(false);
        setIsInputDisabled(false);
        setInputMessage("");
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
      await saveMessage(userMessage.text, "user", null, activeChatId); // Add null as likeStatus before threadId
    }
  
    setMessages((prev) => [...prev, userMessage]);
    setIsWelcomeActive(false);
    setIsInputDisabled(true);
  
    setTimeout(() => {
      setShowTypingIndicator(true);
    }, 800);
  
    setTimeout(() => {
      const response = getAIResponse(userMessage.text);
      if (response !== null) {
        animateAITyping(response);
      } else {
        setIsInputDisabled(false);
        setShowTypingIndicator(false);
      }
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

// Use Effect to fetch messages
const fetchMessages = async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Pass activeChatId to filter messages by thread. (Ensure getMessages is updated accordingly.)
    const loadedMessages = await getMessages(user.uid, activeChatId);

    const formatted = loadedMessages.map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender as "assistant" | "user",
      timestamp: msg.timestamp,
      likeStatus: msg.likeStatus,
      encrypted: msg.encrypted ?? false
    })) as ChatMessage[];

    setMessages(formatted);
    setIsWelcomeActive(formatted.length === 0); // Show welcome screen if no messages in the thread
  } catch (error) {
    console.error("❌ Error loading messages:", error);
  }
};

// Re-fetch messages whenever the active thread changes
useEffect(() => {
  fetchMessages();
}, [activeChatId]);

// Update useEffect
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log(`✅ User authenticated: ${user.uid}`);
      fetchMessages();
    } else {
      console.warn("⚠️ No authenticated user.");
    }
  });

  return () => unsubscribe();
}, []);

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

  // Replace existing fetchTechSummary with this version
const fetchAndAppendTechSummary = async () => {
  try {
    const response = await fetch("https://gettechsummary-753xfutpkq-uc.a.run.app/");
    const data = await response.json();
    
    // Create and append tech summary as a message
    const techMessage = createMessage(data.summary, "assistant");
    await saveMessage(data.summary, "assistant", null, activeChatId);
    setMessages(prev => [...prev, techMessage]);
    
  } catch (error) {
    console.error("Error fetching technical summary:", error);
  }
};

// Update useEffect for tech summary
  useEffect(() => {
    if (activeChatId === 7) {
      // Optional: Auto-fetch on room entry
      // fetchAndAppendTechSummary();
    }
  }, [activeChatId]);

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

  if (activeChatId === 7) {
    return <AdminDashboard />;
  }

  return (
    <div className="chat-area">
      <ChatHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
        activeChatId={activeChatId}
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
          <h1 className="welcome-heading">
            {welcomeTitles[activeChatId] || `Hey ${firstName}, welcome!`}
          </h1>
          <div className="instruction-box">
            <p>{genericInstruction}</p>
          </div>
          <div className="input-send-container">
            <input
              type="text"
              className="centered-input"
              placeholder="Tell me what's up…"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              disabled={isInputDisabled}
            />
            <button className="send-icon-button" onClick={handleSendMessage}>
              <IoArrowUpCircleSharp />
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
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p style={{ marginBottom: "1rem", lineHeight: "1.5" }} {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em style={{ 
                          fontStyle: 'italic', 
                          color: '#a0d2ff', 
                          fontWeight: 300,
                          opacity: 0.85,
                          padding: '0 2px',
                          letterSpacing: '0.02em'
                        }} {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul style={{ margin: "1rem 0", paddingLeft: "1.5rem" }} {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li style={{ marginBottom: "0.4rem" }} {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong style={{ fontWeight: 600, color: "#000" }} {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          style={{ color: "#1E90FF", textDecoration: "underline" }}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          style={{
                            borderLeft: "4px solid #888",
                            paddingLeft: "1rem",
                            margin: "1rem 0",
                            color: "#aaa",
                            fontStyle: "italic",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "4px",
                          }}
                          {...props}
                        />
                      ),
                      h1: ({ node, ...props }) => <h1 style={{ margin: "0.8rem 0" }} {...props} />,
                      h2: ({ node, ...props }) => <h2 style={{ margin: "0.8rem 0" }} {...props} />,
                      h3: ({ node, ...props }) => <h3 style={{ margin: "0.8rem 0" }} {...props} />,
                    }}
                  >
                    {message.text.replace(/\n/g, "\n\n")}
                  </ReactMarkdown>
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
              Saarth is typing
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
            {isGuest && (
              <div className={`guest-message-counter ${remainingMessages <= 2 ? 'low' : ''}`}>
                <span>{remainingMessages}</span> message{remainingMessages !== 1 ? 's' : ''} left
              </div>
            )}
            <div className="input-send-container">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Start typing..."
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
              <button className="send-icon-button" 
                      onClick={handleSendMessage} 
                      disabled={!inputMessage.trim() || isInputDisabled} 
                      aria-label="Send message">
                <IoArrowUpCircleSharp />
              </button>
            </div>
          </div>
        </div>
      )}
      {isGuest && showLimitModal && (
        <div className="message-limit-modal">
          <div className="message-limit-content">
            <button 
              className="close-modal-button"
              onClick={() => setShowLimitModal(false)}
            >
              ✖
            </button>
            <h3>Message Limit Reached</h3>
            <p>You've used all 5 guest messages. Sign in to continue your conversation!</p>
            <button 
              className="sign-in-button"
              onClick={() => {
                // Add tracking code here
                const db = getFirestore();
                const statsRef = doc(db, "statistics", "guestUsage");
                updateDoc(statsRef, {
                  conversions: increment(1)
                }).catch(err => console.error("Error tracking conversion:", err));
                
                const provider = new GoogleAuthProvider();
                signInWithPopup(auth, provider)
                  .then(() => {
                    // Clear guest status
                    localStorage.removeItem("isGuestUser");
                    localStorage.removeItem("guestMessageCount");
                    
                    // Close modal
                    setShowLimitModal(false);
                    
                    // If you need to refresh state
                    window.location.reload();
                  })
                  .catch((error) => {
                    console.error("Error during sign in:", error);
                  });
              }}
            >
              Sign In Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;