import React from "react";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
  onStartChat: (suggestion?: string) => void; // Function to transition to the chat
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartChat }) => {
  return (
    <div className="welcome-screen">
      {/* Header */}
      <div className="welcome-header">
        <h1>Hi, I’m Saarth. Let’s chat!</h1>
        <p>What’s on your mind today?</p>
      </div>

      {/* Input Bar */}
      <div className="welcome-input-bar">
        <input
          type="text"
          placeholder="Type something to start..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
              onStartChat(e.currentTarget.value);
              e.currentTarget.value = ""; // Clear input
            }
          }}
        />
        <button onClick={() => onStartChat()}>Send</button>
      </div>

      {/* Suggestions */}
      <div className="welcome-suggestions">
        <button onClick={() => onStartChat("Relieve Stress")}>
          Relieve Stress
        </button>
        <button onClick={() => onStartChat("Manifest a Goal")}>
          Manifest a Goal
        </button>
        <button onClick={() => onStartChat("Plan My Day")}>
          Plan My Day
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;