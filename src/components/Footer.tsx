import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { auth, signInWithGoogle, signInAsGuest } from "../utils/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import './Footer.css';

const Footer = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Handle click outside modal to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowAuthModal(false);
      }
    };

    if (showAuthModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAuthModal]);

  // Handle sign-in with Google
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithGoogle();
      if (user) {
        navigate("/chat");
      }
    } catch (error) {
      console.error("Sign-in failed:", error);
    } finally {
      setIsLoading(false);
      setShowAuthModal(false);
    }
  };

  // Handle sign-in as guest
  const handleGuestSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInAsGuest();
      if (user) {
        navigate("/chat");
      }
    } catch (error) {
      console.error("Guest sign-in failed:", error);
    } finally {
      setIsLoading(false);
      setShowAuthModal(false);
    }
  };

  const handleCTAClick = () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      setShowAuthModal(true);
    }
  };

  // Feedback Mailto Function
  const handleFeedbackClick = () => {
    window.location.href = "mailto:feedbackforsaarth@gmail.com?subject=Feedback for Saarth&body=Hi, I wanted to share my feedback about Saarth...";
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Left Section */}
        <div className="footer-left">
          <h3>Saarth</h3>
          <p>Your trusted 2AM friend.</p>
          <button className="cta-button-footer" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Saarth"}
          </button>

          {/* Feedback Link */}
          <div className="footer-contact" onClick={handleFeedbackClick}>
            Contact
          </div>
        </div>

        {/* Middle Section */}
        <div className="footer-middle">
          <a href="#features" className="footer-link">Features</a>
          <a onClick={() => navigate("/privacy-policy")} className="footer-link">Privacy Policy</a>
          <a href="#top" className="footer-link back-to-top">Back to top</a>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal" ref={modalRef}>
            <button className="auth-modal-close" onClick={() => setShowAuthModal(false)}>✕</button>
            <h3 className="auth-modal-title">Welcome to Saarth</h3>
            <p className="auth-modal-subtitle">Choose how you'd like to get started</p>
            
            <button 
              className={`auth-button google-button ${isLoading ? 'loading' : ''}`}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <FcGoogle size={24} />
              <span>Continue with Google</span>
            </button>
            
            <div className="auth-divider">
              <span>or</span>
            </div>
            
            <button 
              className={`auth-button guest-button ${isLoading ? 'loading' : ''}`}
              onClick={handleGuestSignIn}
              disabled={isLoading}
            >
              <span>Try as Guest</span>
              <div className="guest-limit-note">5 free messages</div>
            </button>
            
            <p className="auth-privacy-note">
              By continuing, you agree to our <a href="/privacy-policy">Privacy Policy</a>
            </p>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;