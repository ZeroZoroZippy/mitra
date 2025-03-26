import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExperienceHub.css';
import { 
  FiMessageCircle, 
  FiBook, 
  FiArrowRight, 
  FiHeart, 
  FiTarget, 
  FiFeather, 
  FiZap, 
  FiLayers 
} from 'react-icons/fi';

const ExperienceHub: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Add animation class after component mounts for smooth entrance
    const timer = setTimeout(() => {
      setIsLoaded(true);
      if (containerRef.current) {
        containerRef.current.classList.add('animate-in');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleEmotionalCompanion = () => {
    // Add exit animation before navigation
    if (containerRef.current) {
      containerRef.current.classList.remove('animate-in');
      
      // Allow time for exit animation before navigation
      setTimeout(() => {
        navigate('/chat');
      }, 300);
    } else {
      navigate('/chat');
    }
  };

  const handleEducationalExperience = () => {
    // Add exit animation before navigation
    if (containerRef.current) {
      containerRef.current.classList.remove('animate-in');
      
      // Allow time for exit animation before navigation
      setTimeout(() => {
        navigate('/concepts');
      }, 300);
    } else {
      navigate('/concepts');
    }
  };

  return (
    <div 
      className={`experience-hub-container ${isLoaded ? 'animate-in' : ''}`}
      ref={containerRef}
    >
      {/* Animated background elements */}
      <div className="background-glow">
        <div className="glow-circle"></div>
        <div className="glow-circle"></div>
        <div className="glow-circle"></div>
        <div className="glow-circle"></div>
      </div>

      <div className="experience-hub-header">
        <h1>Welcome to Saarth</h1>
        <p>Choose your experience</p>
      </div>

      <div className="experience-options">
        <div className="experience-card emotional" onClick={handleEmotionalCompanion}>
          <div className="card-content">
            <div className="card-icon">
              <FiHeart />
            </div>
            <h2>Talk with Saarth</h2>
            <p>Share your thoughts, seek guidance, or just have a friendly chat in a safe, judgment-free space.</p>
            <ul className="experience-features">
              <li>Emotional support and guidance</li>
              <li>Personal reflection and growth</li>
              <li>Meaningful, thoughtful conversations</li>
            </ul>
            <button className="experience-button">
              Get Started
              <FiArrowRight className="button-icon" />
            </button>
          </div>
        </div>

        <div className="experience-card educational" onClick={handleEducationalExperience}>
          <div className="card-content">
            <div className="card-icon">
              <FiBook />
            </div>
            <h2>Learn with Saarth</h2>
            <p>Explore concepts and ideas through natural, adaptive conversations tailored to your interests.</p>
            <ul className="experience-features">
              <li>In-depth concept explanations</li>
              <li>Personalized learning journeys</li>
              <li>Knowledge exploration and discovery</li>
            </ul>
            <button className="experience-button">
              Start Learning
              <FiArrowRight className="button-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceHub;