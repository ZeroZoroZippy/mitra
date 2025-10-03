// src/components/Header.tsx

import React, { useState, RefObject, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";
import { signInWithGoogle, signInAsGuest, getAuth } from "../utils/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";
import mixpanel from "../utils/mixpanel";               // ← Mixpanel import
import { FcGoogle } from "react-icons/fc";

interface HeaderProps {
  featuresRef: RefObject<HTMLDivElement>;
}

const Header: React.FC<HeaderProps> = ({ featuresRef }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
        setShowAuthModal(false);
      }
    };
    if (showAuthModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAuthModal]);

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  // Sign in via Google
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

  // Sign in as guest
  const handleGuestSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInAsGuest();
      if (user) {
        mixpanel.track("Login", {
          distinct_id: user.uid,
          method: "Guest",
          location: "Header",
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

  // **Header CTA** click tracking
  const handleCTAClick = () => {
    const buttonLabel = isAuthenticated ? "Continue Chat" : "Try Saarth";
    // Firebase auth modal logic remains
    if (isAuthenticated) {
      mixpanel.track("Header CTA Clicked", { button: buttonLabel, location: "Header" });
      navigate("/chat");
    } else {
      mixpanel.track("Header CTA Clicked", { button: buttonLabel, location: "Header" });
      setShowAuthModal(true);
    }
    setIsMobileMenuOpen(false);
  };

  // Open mail client
  const handleContactClick = () => {
    mixpanel.track("Contact Clicked", { method: "Email Link" });
    window.location.href = "mailto:feedback@saarth.com?subject=Contact Saarth&body=Hi Saarth Team,";
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <div className="header-logo">
          <a href="/">Saarth</a>
        </div>

        {/* Desktop Nav */}
        <nav className="header-nav">
          <button className="cta-button" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Saarth"}
          </button>
        </nav>

        {/* Mobile Menu Icon */}
        <button
          className={`menu-icon ${isMobileMenuOpen ? "open" : ""}`}
          aria-label="Toggle Mobile Menu"
          onClick={toggleMenu}
        >
          {isMobileMenuOpen ? "✖" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <a onClick={scrollToFeatures} className="mobile-link" role="button">
            Features
          </a>
          <a onClick={handleContactClick} className="mobile-link" role="button">
            Contact
          </a>
          <button className="mobile-cta-button" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Saarth"}
          </button>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal" ref={modalRef}>
            <button className="auth-modal-close" onClick={() => setShowAuthModal(false)}>
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

            <div className="auth-divider"></div>

            <p className="auth-privacy-note">
              By continuing, you agree to our <a href="/privacy-policy">Privacy Policy</a>
            </p>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;