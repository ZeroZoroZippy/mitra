import React from 'react';
import './WelcomeScreen.css';

const welcomeTitles: { [key: number]: string } = {
  1: "Sit with me. Let’s talk about anything or nothing at all.",
  2: "Open up about love, connections, or feelings left unsaid.",
  3: "Share your desires, dreams, or the visions you’re chasing.",
  4: "Release what’s heavy. This space is for healing and letting go.",
  5: "Talk ambitions, purpose, or the fire that keeps you moving.",
  6: "Breathe. Let’s speak about peace, anxiety, or quieting the mind.",
  7: "Let’s turn those sparks into flames of creation."
};

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
        <h1>{welcomeTitles[activeChatId] || `Hey ${firstName}, welcome!`}</h1>
        <p>What’s on your mind today? You can start by typing below or pick a suggestion.</p>
      </div>

      <div className="welcome-input-bar">
        <input
          type="text"
          placeholder="Manifest a goal, relieve stress, or ask anything..."
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

      <div className="welcome-suggestions">
        <button onClick={() => onSendMessage("I want to relieve some stress")}>
          Relieve Stress
        </button>
        <button onClick={() => onSendMessage("Help me manifest a goal")}>
          Manifest a Goal
        </button>
        <button onClick={() => onSendMessage("How can I improve my focus?")}>
          Improve Focus
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;