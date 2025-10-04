import React, { useState, useEffect } from "react";
import "./ChatArea.css";
import ChatHeader from "./ChatHeader";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig";
import mixpanel from "../../utils/mixpanel";
import AdminDashboard from '../../pages/AdminDashboard';
import { useChat } from "./hooks/useChat";
import { useGuestUser } from "./hooks/useGuestUser";
import ChatInputBar from "./ChatInputBar";
import WelcomeScreen from "./WelcomeScreen";
import MessageList from "./MessageList"; // Import the final component

import { Chat } from "../../utils/firebaseDb";

interface ChatAreaProps {
  activeChatId: number;
  isChatFullScreen: boolean;
  onToggleFullScreen: () => void;
  isSidebarOpen: boolean;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  activeChat: Chat | null;
  onUpdateChatTitle: (chatId: string, newTitle: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeChatId,
  isSidebarOpen,
  onToggleSidebar,
  activeChat,
  onUpdateChatTitle
}) => {
  const [isWelcomeActive, setIsWelcomeActive] = useState(true);
  const [firstName, setFirstName] = useState<string>("friend");
  const [user, setUser] = useState<User | null>(auth.currentUser);

  const { messages, isLoading, isGenerating, sendUserMessage, likeDislikeMessage } = useChat(activeChatId, user, activeChat, onUpdateChatTitle);
  const { isGuest, remainingMessages, showLimitModal, setShowLimitModal, handleGuestMessageSend, handleSignIn } = useGuestUser();
  
  const isInputDisabled = isGenerating || (isGuest && remainingMessages <= 0);

  useEffect(() => {
    if (!isLoading) {
      setIsWelcomeActive(messages.length === 0);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchUserName = async () => {
      const currentUser = auth.currentUser;
      if (currentUser?.displayName) {
        setFirstName(currentUser.displayName.split(" ")[0]);
      }
    };
    fetchUserName();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setUser(user));
    return () => unsubscribe();
  }, []);
  
  const handleSendMessage = async (text: string) => { 
    if (!text || isInputDisabled) return;
    if (isGuest && !handleGuestMessageSend()) return;
    if (isWelcomeActive) setIsWelcomeActive(false);

    // Track event
    if (user) mixpanel.track("Message Sent", { /* ... */ });

    // Delegate everything to the hook
    sendUserMessage(text);
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  if (activeChatId === 7) {
    return <AdminDashboard />;
  }
  
  return (
    <div className="chat-area">
      <ChatHeader isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} activeChatId={activeChatId} />
      
      {isLoading ? (
        <div style={{textAlign: 'center', padding: '20px', color: 'white'}}>Loading Messages...</div>
      ) : isWelcomeActive ? (
        <WelcomeScreen
          activeChatId={activeChatId}
          firstName={firstName}
          onSendMessage={handleSendMessage}
          isSending={isInputDisabled}
        />
      ) : (
        <>
          <MessageList
            messages={messages}
            isGenerating={isGenerating}
            onCopy={handleCopyMessage}
            onLikeDislike={likeDislikeMessage}
          />
          <ChatInputBar 
              onSendMessage={handleSendMessage}
              isSending={isInputDisabled}
              isGuest={isGuest}
              remainingMessages={remainingMessages}
          />
        </>
      )}

      {showLimitModal && (
        <div className="message-limit-modal">
          <div className="message-limit-content">
            <button className="close-modal-button" onClick={() => setShowLimitModal(false)}>✖</button>
            <h3>Message Limit Reached</h3>
            <p>You've used all 5 guest messages. Sign in to continue your conversation!</p>
            <button className="sign-in-button" onClick={handleSignIn}>Sign In Now</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;