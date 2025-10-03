// src/pages/ExperienceHub.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExperienceHub.css';
import {
  FiArrowRight,
  FiHeart
} from 'react-icons/fi';
import mixpanel from '../utils/mixpanel';          // ← Mixpanel import
import { getAuth } from '../utils/firebaseAuth';      // ← to get current user

const ExperienceHub: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Track page view when component mounts
  useEffect(() => {
    const auth = getAuth();
    mixpanel.track('Experience Hub Viewed', {
      distinct_id: auth?.currentUser?.uid || 'anonymous',
      timestamp: new Date().toISOString()
    });

    // Add animation class after mount
    const timer = setTimeout(() => {
      setIsLoaded(true);
      containerRef.current?.classList.add('animate-in');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 2. Handle Emotional Companion selection
  const handleEmotionalCompanion = () => {
    const auth = getAuth();
    mixpanel.track('Experience Selected', {
      distinct_id: auth?.currentUser?.uid || 'anonymous',
      experience: 'Emotional Companion',
      timestamp: new Date().toISOString()
    });

    // Exit animation then navigate
    if (containerRef.current) {
      containerRef.current.classList.remove('animate-in');
      setTimeout(() => {
        navigate('/chat');
      }, 300);
    } else {
      navigate('/chat');
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
        {/* Emotional Companion Card */}
        <div 
          className="experience-card emotional" 
          onClick={handleEmotionalCompanion}
        >
          <div className="card-content">
            <div className="card-icon"><FiHeart /></div>
            <h2>Talk with Saarth</h2>
            <p>Share your thoughts, seek guidance, or just have a friendly chat in a safe, judgment-free space.</p>
            <ul className="experience-features">
              <li>Emotional support and guidance</li>
              <li>Personal reflection and growth</li>
              <li>Meaningful, thoughtful conversations</li>
            </ul>
            <button className="experience-button">
              Get Started <FiArrowRight className="button-icon" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExperienceHub;