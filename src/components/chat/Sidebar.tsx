import React, { useState } from "react";
import "./Sidebar.css";
import { FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import { BsPlusCircle } from "react-icons/bs";
import { Chat } from "../../utils/firebaseDb";

interface SidebarProps {
  onClose: () => void;
  isSidebarOpen: boolean;
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isLoadingChats: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  isSidebarOpen,
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isLoadingChats,
}) => {
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const handleDeleteClick = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    setDeletingChatId(chatId);
  };

  const handleConfirmDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteChat(chatId);
    setDeletingChatId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingChatId(null);
  };

  return (
    <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <button className="close-sidebar" onClick={onClose}>
          ✖
        </button>
      </div>

      <button className="new-chat-button" onClick={onNewChat}>
        <BsPlusCircle className="new-chat-icon" />
        <span>New Chat</span>
      </button>

      <hr className="chat-divider" />

      <div className="chat-list">
        {isLoadingChats ? (
          <div className="chat-loading">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="no-chats">No chats yet. Start a new conversation!</div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-item ${activeChat?.id === chat.id ? "active" : ""}`}
              onClick={() => onSelectChat(chat)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectChat(chat);
                }
              }}
              aria-label={`Select chat: ${chat.title}`}
              aria-current={activeChat?.id === chat.id ? "true" : "false"}
            >
              <div className="chat-item-content">
                <span className="chat-item-title">{chat.title}</span>
                <div className="chat-item-actions">
                  {deletingChatId === chat.id ? (
                    <>
                      <div
                        role="button"
                        tabIndex={0}
                        className="confirm-delete-btn"
                        onClick={(e) => handleConfirmDelete(chat.id, e)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleConfirmDelete(chat.id, e as any);
                          }
                        }}
                        title="Confirm delete"
                        aria-label="Confirm delete chat"
                      >
                        <FaCheck />
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        className="cancel-delete-btn"
                        onClick={handleCancelDelete}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCancelDelete(e as any);
                          }
                        }}
                        title="Cancel"
                        aria-label="Cancel delete"
                      >
                        <FaTimes />
                      </div>
                    </>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className="delete-chat-btn"
                      onClick={(e) => handleDeleteClick(chat.id, e)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleDeleteClick(chat.id, e as any);
                        }
                      }}
                      title="Delete chat"
                      aria-label={`Delete chat: ${chat.title}`}
                    >
                      <FaTrash />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
