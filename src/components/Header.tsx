import React, { useState, RefObject, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";
import { signInWithGoogle, signInAsGuest, auth } from "../utils/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";
import { FcGoogle } from "react-icons/fc"; // Import Google icon

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

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollToFeatures = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

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

  // Handle CTA click
  const handleCTAClick = () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      setShowAuthModal(true);
    }
  };

  // Function to open email app
  const handleContactClick = () => {
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

        {/* Desktop Navigation */}
        <nav className="header-nav">
          <a onClick={scrollToFeatures} className="nav-link" role="button">
            Features
          </a>
          <button className="cta-button" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Saarth"}
          </button>
        </nav>

        {/* Hamburger Icon for Mobile */}
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
          <a className="mobile-link" onClick={handleContactClick} role="button">
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
    </header>
  );
};

export default Header;