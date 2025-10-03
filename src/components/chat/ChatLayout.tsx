// src/pages/ChatLayout.tsx
import React, { useState, useEffect, useRef } from "react";
import "./ChatLayout.css";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import { isCreator } from "../../utils/firebaseAuth";
import { auth } from "../../utils/firebaseConfig";
import mixpanel from "../../utils/mixpanel";
import { trackSessionStart, trackSessionEnd } from "../../utils/analytics";

interface Chat {
  id: number;
  title: string;
  timestamp: string;
}

const ChatLayout: React.FC = () => {
  /* ──────────────────────────────  User + room state  ─────────────────────────────── */
  const userIsAdmin = isCreator();

  // Always use room #1 (default companion mode)
  const activeChatId = userIsAdmin ? 7 : 1; // Admin users see dashboard, everyone else sees companion

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatFullScreen, setIsChatFullScreen] = useState(true);

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

  const handleNewChat = () => {
    // Refresh the page to clear chat history
    window.location.reload();
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
      />
    </div>
  );
};

export default ChatLayout;