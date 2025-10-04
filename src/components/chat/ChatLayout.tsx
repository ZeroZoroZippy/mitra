// src/pages/ChatLayout.tsx
import React, { useState, useEffect, useRef } from "react";
import "./ChatLayout.css";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import { isCreator } from "../../utils/firebaseAuth";
import { auth } from "../../utils/firebaseConfig";
import mixpanel from "../../utils/mixpanel";
import { trackSessionStart, trackSessionEnd } from "../../utils/analytics";
import { getChats, createChat, deleteChat, Chat } from "../../utils/firebaseDb";

const ChatLayout: React.FC = () => {
  /* ──────────────────────────────  User + room state  ─────────────────────────────── */
  const userIsAdmin = isCreator();

  // Always use room #1 (default companion mode)
  const activeChatId = userIsAdmin ? 7 : 1; // Admin users see dashboard, everyone else sees companion

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatFullScreen, setIsChatFullScreen] = useState(true);

  // Chat management state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  /* Map ID ⇒ title for analytics */
  const roomLabels: Record<number, string> = {
    1: "The Companion",
    7: "Admin Dashboard"
  };

  /* ──────────────────────────────  Mixpanel boot‑strap  ───────────────────────────── */
  useEffect(() => {
    // Register super‑properties once per load
    mixpanel.register({
      app_version: import.meta.env.VITE_APP_VERSION || "dev",
      device: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
    });

    // Identify or alias once Firebase tells us who the user is
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) return;
      const mpId = mixpanel.get_distinct_id();
      if (mpId && mpId !== user.uid) {
        // Visitor was anonymous, now signed in → stitch the profiles
        mixpanel.alias(user.uid);
      }
      mixpanel.identify(user.uid);
    });
    return () => unsubscribe();
  }, []);

  /* ─────────────────────  Helpers to time session + room dwell  ───────────────────── */
  const roomStartRef     = useRef<Date>(new Date());
  const previousRoomRef  = useRef<number>(activeChatId);

  const finishRoomTiming = (roomId: number) => {
    const now = new Date();
    const durationSec = (now.getTime() - roomStartRef.current.getTime()) / 1000;

    mixpanel.track("Room Duration", {
      room_id: roomId,
      room_name: roomLabels[roomId] || "Unknown Room",
      duration_sec: durationSec,
    });

    // prepare for next room
    roomStartRef.current    = now;
    previousRoomRef.current = roomId;
  };

  /* ────────────────────────────────  Session timing  ─────────────────────────────── */
  useEffect(() => {
    trackSessionStart();           // your wrapper
    mixpanel.time_event("Session");

    const onUnload = () => {
      // Close out the last room before leaving
      finishRoomTiming(previousRoomRef.current);
      trackSessionEnd();           // your wrapper
      mixpanel.track("Session");   // Mixpanel auto‑adds duration
    };

    window.addEventListener("beforeunload", onUnload);
    return () => {
      onUnload();                  // also fire when React unmounts
      window.removeEventListener("beforeunload", onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────────  Track the very first room view  ───────────────────── */
  useEffect(() => {
    mixpanel.track("Room Viewed", {
      room_id: activeChatId,
      room_name: roomLabels[activeChatId] || "Unknown Room",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);   // run exactly once on first paint

  /* ────────────────────────────────  UI helpers  ──────────────────────────────── */
  const toggleFullScreen = () => {
    setIsChatFullScreen(prev => {
      const next = !prev;
      if (!next && window.innerWidth <= 768) setIsSidebarOpen(true);
      return next;
    });
  };

  const toggleSidebar = () => setIsSidebarOpen(p => !p);

  /* ──────────────────────────────  Load chats on mount  ─────────────────────────────── */
  useEffect(() => {
    const loadChats = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoadingChats(false);
        return;
      }

      setIsLoadingChats(true);
      try {
        const userChats = await getChats(user.uid);
        setChats(userChats);

        // If no chats exist, create a new one
        if (userChats.length === 0) {
          const newChatId = await createChat(activeChatId);
          if (newChatId) {
            const newChat: Chat = {
              id: newChatId,
              title: "New Chat",
              createdAt: new Date(),
              updatedAt: new Date(),
              threadId: activeChatId,
            };
            setChats([newChat]);
            setActiveChat(newChat);
          }
        } else {
          // Set the most recent chat as active
          setActiveChat(userChats[0]);
        }
      } catch (error) {
        console.error("Error loading chats:", error);
      } finally {
        setIsLoadingChats(false);
      }
    };

    loadChats();
  }, [activeChatId]);

  const handleNewChat = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const newChatId = await createChat(activeChatId);
    if (newChatId) {
      const newChat: Chat = {
        id: newChatId,
        title: "New Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
        threadId: activeChatId,
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);

      // Close sidebar on mobile after creating new chat
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setActiveChat(chat);

    // Close sidebar on mobile after selecting chat
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const success = await deleteChat(user.uid, chatId);
      if (success) {
        const updatedChats = chats.filter((chat) => chat.id !== chatId);
        setChats(updatedChats);

        // If the deleted chat was active, switch to the most recent chat
        if (activeChat?.id === chatId) {
          if (updatedChats.length > 0) {
            setActiveChat(updatedChats[0]);
          } else {
            // No chats left, create a new one
            await handleNewChat();
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleUpdateChatTitle = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    );
  };

  /* ─────────────────────────────────  Render  ─────────────────────────────────── */
  return (
    <div
      className={`chat-layout ${isChatFullScreen ? "fullscreen" : ""} ${
        isSidebarOpen ? "sidebar-visible" : ""
      }`}
    >
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}

      <Sidebar
        onClose={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isLoadingChats={isLoadingChats}
      />

      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="chat-area-overlay" onClick={toggleSidebar} />
      )}

      <ChatArea
        activeChatId={activeChatId}
        isChatFullScreen={isChatFullScreen}
        onToggleFullScreen={toggleFullScreen}
        isSidebarOpen={isSidebarOpen}
        onNewChat={handleNewChat}
        onToggleSidebar={toggleSidebar}
        activeChat={activeChat}
        onUpdateChatTitle={handleUpdateChatTitle}
      />
    </div>
  );
};

export default ChatLayout;