// src/components/Footer.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithGoogle, signInAsGuest } from "../utils/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";
import mixpanel from "../utils/mixpanel";       // ← Mixpanel import
import { FcGoogle } from "react-icons/fc";
import './Footer.css';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Track auth state
  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      console.error("Firebase Auth not initialized");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        mixpanel.track("Footer Auth Modal Closed");
        setShowAuthModal(false);
      }
    };
    if (showAuthModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAuthModal]);

  // Google Sign‑In
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithGoogle();
      if (user) {
        // 1. Tie future events to this user
        mixpanel.identify(user.uid);
  
        // 2. Populate their Mixpanel profile
        mixpanel.people.set({
          distinct_id: user.uid,
          $email: user.email || "",
          $name: user.displayName || "",
        });
  
        // 3. Fire the login event
        mixpanel.track("Login", {
          distinct_id: user.uid,
          method: "Google",
          location: "Header",
        });
  
        navigate("/chat");
      }
    } catch (error) {
      console.error("Sign‑in failed:", error);
    } finally {
      setIsLoading(false);
      setShowAuthModal(false);
    }
  };

  // Guest Sign‑In
  const handleGuestSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInAsGuest();
      if (user) {
        mixpanel.track("Footer Login", {
          distinct_id: user.uid,
          method: "Guest",
          location: "Footer",
        });
        navigate("/chat");
      }
    } catch (error) {
      console.error("Guest sign‑in failed:", error);
    } finally {
      setIsLoading(false);
      setShowAuthModal(false);
    }
  };

  // Footer CTA click
  const handleCTAClick = () => {
    const label = isAuthenticated ? "Continue Chat" : "Try Saarth";
    mixpanel.track("Footer CTA Clicked", {
      button: label,
      location: "Footer",
    });
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      setShowAuthModal(true);
    }
  };

  // Feedback link click
  const handleFeedbackClick = () => {
    mixpanel.track("Footer Feedback Clicked", {
      method: "Email Link",
      location: "Footer",
    });
    window.location.href =
      "mailto:feedbackforsaarth@gmail.com?subject=Feedback for Saarth&body=Hi, I wanted to share my feedback about Saarth...";
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
          <a href="#features" className="footer-link">
            Features
          </a>
          <a onClick={() => navigate("/privacy-policy")} className="footer-link">
            Privacy Policy
          </a>
          <a href="#top" className="footer-link back-to-top">
            Back to top
          </a>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal" ref={modalRef}>
            <button
              className="auth-modal-close"
              onClick={() => {
                mixpanel.track("Footer Auth Modal Closed");
                setShowAuthModal(false);
              }}
            >
              ✕
            </button>
            <h3 className="auth-modal-title">Welcome to Saarth</h3>
            <p className="auth-modal-subtitle">Choose how you'd like to get started</p>

            <button
              className={`auth-button google-button ${isLoading ? "loading" : ""}`}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <FcGoogle size={24} />
              <span>Continue with Google</span>
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <p className="auth-privacy-note">
              By continuing, you agree to our{" "}
              <a href="/privacy-policy">Privacy Policy</a>
            </p>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;