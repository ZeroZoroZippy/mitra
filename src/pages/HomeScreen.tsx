import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeScreen.css';

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleEmotionalCompanion = () => {
    // Navigate to the emotional companion experience
    navigate('/chat');
  };

  const handleEducationalExperience = () => {
    // Navigate to the educational experience
    navigate('/concepts');
  };

  return (
    <div className="home-screen-container">
      <div className="home-screen-header">
        <h1>Welcome to Saarth</h1>
        <p>Choose your experience</p>
      </div>

      <div className="experience-options">
        <div className="experience-card emotional" onClick={handleEmotionalCompanion}>
          <div className="card-content">
            <h2>Talk with Saarth</h2>
            <p>Share your thoughts, seek guidance, or just have a friendly chat.</p>
            <ul className="experience-features">
              <li>Emotional support</li>
              <li>Personal guidance</li>
              <li>Meaningful conversations</li>
            </ul>
            <button className="experience-button">Get Started</button>
          </div>
        </div>

        <div className="experience-card educational" onClick={handleEducationalExperience}>
          <div className="card-content">
            <h2>Learn with Saarth</h2>
            <p>Explore concepts and ideas through natural, adaptive conversations.</p>
            <ul className="experience-features">
              <li>Concept explanations</li>
              <li>Personalized learning</li>
              <li>Knowledge exploration</li>
            </ul>
            <button className="experience-button">Start Learning</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;