import React from 'react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  activeChatId: number;
  firstName: string;
  onSendMessage: (text: string) => void;
  isSending: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  activeChatId,
  firstName,
  onSendMessage,
  isSending
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const text = e.currentTarget.value.trim();
      if (text) {
        onSendMessage(text);
        e.currentTarget.value = ''; // Clear input
      }
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-header">
        <h1>Hey {firstName}, sit with me. Let's talk about anything.</h1>
        <p>What's on your mind today?</p>
      </div>

      <div className="welcome-input-bar">
        <input
          type="text"
          placeholder="Ask, and let’s see where the question leads."
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <button 
          onClick={() => {
            const input = document.querySelector('.welcome-input-bar input') as HTMLInputElement;
            if (input && input.value.trim()) {
              onSendMessage(input.value.trim());
              input.value = '';
            }
          }}
          disabled={isSending}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;