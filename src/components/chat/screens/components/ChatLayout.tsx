import React, { useState, useEffect } from "react";
import "./ChatLayout.css";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";

interface Chat {
  id: number;
  title: string;
  timestamp: string;
}

const ChatLayout: React.FC = () => {
  const [activeChatId, setActiveChatId] = useState<number>(() => {
    const savedChatId = localStorage.getItem("activeChatId");
    const chatHistory = localStorage.getItem("chats");
    return savedChatId && chatHistory ? parseInt(savedChatId, 10) : 0;
  });
  const [isChatFullScreen, setIsChatFullScreen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const chatList: Chat[] = [
    {
      id: 1,
      title: "Chat with Mitra",
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
        setIsSidebarOpen(true); // Force sidebar open on exit
      }
      if (newState) {
        setIsSidebarOpen(false);
      }
      return newState;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleNewChat = () => {
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
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* ✅ Always render Sidebar (let CSS handle visibility) */}
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
