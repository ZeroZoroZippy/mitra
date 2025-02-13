import React, { useState, RefObject, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";
import { signInWithGoogle, auth } from "../utils/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";

interface HeaderProps {
  featuresRef: RefObject<HTMLDivElement>;
}

const Header: React.FC<HeaderProps> = ({ featuresRef }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollToFeatures = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ✅ Handle CTA click dynamically
  const handleCTAClick = async () => {
    if (isAuthenticated) {
      navigate("/chat"); // ✅ If signed in, go to chat
    } else {
      try {
        const user = await signInWithGoogle();
        if (user) navigate("/chat");
      } catch (error) {
        console.error("Sign-in failed:", error);
      }
    }
  };

  // ✅ Function to open email app
  const handleContactClick = () => {
    window.location.href = "mailto:feedback@saarth.com?subject=Contact Saarth&body=Hi Saarth Team,";
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
          {/* ✅ Contact link opens mail app */}
          <a className="mobile-link" onClick={handleContactClick} role="button">
            Contact
          </a>
          <button className="mobile-cta-button" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Saarth"}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;