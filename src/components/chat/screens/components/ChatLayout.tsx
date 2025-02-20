import React, { useState, useEffect } from "react";
import "./ChatLayout.css";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";

interface Chat {
  id: number;
  title: string;
  timestamp: string;
  // Optionally, you can add fields like systemPrompt, icon, color, etc.
}

const ChatLayout: React.FC = () => {
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

  // Updated chatList including all threads
  const chatList: Chat[] = [
    {
      id: 1,
      title: "Companion",
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
        onSelectChat={setActiveChatId}
        onClose={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

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