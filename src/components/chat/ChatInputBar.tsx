import React, { useState, useRef } from 'react';
import { IoArrowUpCircleSharp } from 'react-icons/io5';
import './ChatInputBar.css';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  isSending: boolean;
  isGuest: boolean;
  remainingMessages: number;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({ 
  onSendMessage, 
  isSending,
  isGuest,
  remainingMessages 
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize the textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${e.target.scrollHeight}px`;
    }
  };

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText && !isSending) {
      onSendMessage(trimmedText);
      setText(''); // Clear input after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-bar">
      {isGuest && (
        <div className={`guest-message-counter ${remainingMessages <= 2 ? 'low' : ''}`}>
          <span>{remainingMessages}</span> message{remainingMessages !== 1 ? 's' : ''} left
        </div>
      )}
      <div className="input-send-container">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Start typing..."
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          rows={1}
        />
        <button
          className="send-icon-button"
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          aria-label="Send message"
        >
          <IoArrowUpCircleSharp />
        </button>
      </div>
    </div>
  );
};

export default ChatInputBar;