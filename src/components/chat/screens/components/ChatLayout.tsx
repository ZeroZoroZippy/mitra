import React, { useState, useEffect } from "react";
import "./ChatLayout.css";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import { isCreator } from "../../../../utils/firebaseAuth";
import { trackUserActivity, trackSessionStart, trackSessionEnd } from "../../../../utils/analytics";
import { auth } from "../../../../utils/firebaseConfig";

interface Chat {
  id: number;
  title: string;
  timestamp: string;
  // Optionally, you can add fields like systemPrompt, icon, color, etc.
}

const ChatLayout: React.FC = () => {
  // Determine if the current user is the admin/creator.
  const userIsAdmin = isCreator();

  // Get the activeChatId from localStorage (default to 1)
  const [activeChatId, setActiveChatId] = useState<number>(() => {
    const savedChatId = localStorage.getItem("activeChatId");
    const chatHistory = localStorage.getItem("chats");
    // Default to thread with id 1 ("Chat with Saarth")
    return savedChatId && chatHistory ? parseInt(savedChatId, 10) : 1;
  });
  
  // Open sidebar by default for first-time sign-ins
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const chatHistory = localStorage.getItem("chats");
    return chatHistory ? false : true;
  });
  
  const [isChatFullScreen, setIsChatFullScreen] = useState(true);

  // Define the standard chat rooms.
  const baseChatList: Chat[] = [
    {
      id: 1,
      title: "The Companion",
      timestamp: new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
      }),
    },
    {
      id: 2,
      title: "Love & Connections",
      timestamp: new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
      }),
    },
    {
      id: 3,
      title: "Dreams & Manifestations",
      timestamp: new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
      }),
    },
    {
      id: 4,
      title: "Healing & Emotional Release",
      timestamp: new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
      }),
    },
    {
      id: 5,
      title: "Purpose & Ambition",
      timestamp: new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
      }),
    },
    {
      id: 6,
      title: "Mental Well-Being",
      timestamp: new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
      }),
    },
  ];

  // Room names mapping for analytics
  const roomLabels: {[key: number]: string} = {};
  baseChatList.forEach(chat => {
    roomLabels[chat.id] = chat.title;
  });

  // Conditionally add the admin-only dashboard room.
  const chatList: Chat[] = userIsAdmin
    ? [
        ...baseChatList,
        {
          id: 7, // Use a unique id that doesn't conflict with others.
          title: "Admin Dashboard",
          timestamp: new Date().toLocaleString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
            month: "short",
            day: "numeric",
          }),
        },
      ]
    : baseChatList;

  // Track room changes
  const handleRoomChange = (roomId: number) => {
    setActiveChatId(roomId);
    
    // Track the room change in analytics
    if (auth.currentUser) {
      trackUserActivity(auth.currentUser.uid, roomId, roomLabels[roomId] || "Unknown");
    }
  };

  // Session tracking
  useEffect(() => {
    // Track session start when component mounts
    trackSessionStart();
    
    // Track session end when component unmounts
    return () => {
      trackSessionEnd();
    };
  }, []);

  const toggleFullScreen = () => {
    setIsChatFullScreen((prev) => {
      const newState = !prev;
      if (!newState && window.innerWidth <= 768) {
        setIsSidebarOpen(true);
      } else if (window.innerWidth > 768) {
        setIsSidebarOpen((prev) => prev);
      }
      return newState;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleNewChat = () => {
    // Placeholder for new chat functionality; not needed for switching threads
    setActiveChatId(Date.now());
  };

  useEffect(() => {
    if (activeChatId !== 0) {
      localStorage.setItem("activeChatId", activeChatId.toString());
    }
  }, [activeChatId]);

  const [showLimitModal, setShowLimitModal] = useState(false);

  return (
    <div
      className={`chat-layout ${isChatFullScreen ? "fullscreen" : ""} ${
        isSidebarOpen ? "sidebar-visible" : ""
      }`}
    >
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

    <Sidebar
      chatList={chatList}
      activeChatId={activeChatId}
      onSelectChat={handleRoomChange}
      onClose={toggleSidebar}
      isSidebarOpen={isSidebarOpen}
      showLimitModal={() => setShowLimitModal(true)} // Add this
    />

    {/* Add this line for mobile overlay - it will cover the chat area */}
    {isSidebarOpen && window.innerWidth <= 768 && (
      <div 
        className="chat-area-overlay" 
        onClick={toggleSidebar}
      ></div>
    )}

      <ChatArea
        activeChatId={activeChatId}
        isChatFullScreen={isChatFullScreen}
        onToggleFullScreen={toggleFullScreen}
        isSidebarOpen={isSidebarOpen}
        onNewChat={handleNewChat}
        onToggleSidebar={toggleSidebar}
      />
    </div>
  );
};

export default ChatLayout;