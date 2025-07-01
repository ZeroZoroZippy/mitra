import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { IoCopyOutline } from 'react-icons/io5';
import { AiFillLike, AiFillDislike, AiOutlineLike, AiOutlineDislike } from "react-icons/ai";
import { ChatMessage } from '../../types/chat';
import './MessageList.css';

// --- Helper functions moved from ChatArea.tsx ---

const formatMessageDate = (timestamp: string): string => {
  if (!timestamp || typeof timestamp !== 'string') return "Unknown Date";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Unknown Date";
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  const isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate();
  
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
  });
};

const groupMessagesByDate = (messages: ChatMessage[]) => {
  const groups: { [key: string]: ChatMessage[] } = {};
  messages.forEach(message => {
    if (message && message.timestamp) {
      const dateStr = formatMessageDate(message.timestamp);
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(message);
    }
  });
  return groups;
};


interface MessageListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onCopy: (text: string) => void;
  onLikeDislike: (messageId: string, action: "like" | "dislike") => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isGenerating, onCopy, onLikeDislike }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  return (
    <div className="messages-container">
      {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
        <React.Fragment key={date}>
          <div className="date-header"><span className="date-label">{date}</span></div>
          {dateMessages.map((message) => (
            <div key={message.id || message.timestamp} className="message-container">
              <div className={`message-bubble ${message.sender}-bubble`}>
                  <ReactMarkdown>{message.text.replace(/\n/g, "\n\n")}</ReactMarkdown>
              </div>
              <div className={`message-actions ${message.sender === "assistant" && message.id === messages[messages.length - 1]?.id ? "always-visible" : "hover-visible"}`}>
                  <IoCopyOutline className="action-icon" title="Copy Message" onClick={() => onCopy(message.text)} />
                  {message.sender === "assistant" && message.id && (
                    <>
                      {message.likeStatus === "like" ? <AiFillLike className="action-icon active" title="Like" onClick={() => onLikeDislike(message.id!, "like")} /> : <AiOutlineLike className="action-icon" title="Like" onClick={() => onLikeDislike(message.id!, "like")} />}
                      {message.likeStatus === "dislike" ? <AiFillDislike className="action-icon active" title="Dislike" onClick={() => onLikeDislike(message.id!, "dislike")} /> : <AiOutlineDislike className="action-icon" title="Dislike" onClick={() => onLikeDislike(message.id!, "dislike")} />}
                    </>
                  )}
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
      {isGenerating && (
        <div className="ai-typing-message">
          Saarth is typing<span className="ellipsis"><span>.</span><span>.</span><span>.</span></span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;