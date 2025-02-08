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

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <div className="header-logo">
          <a href="/">Mitra</a>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav">
          <a onClick={scrollToFeatures} className="nav-link" role="button">
            Features
          </a>
          <a href="#about" className="nav-link">
            About
          </a>
          <button className="cta-button" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Mitra"}
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
          <a href="#about" className="mobile-link">
            About
          </a>
          <a href="#contact" className="mobile-link">
            Contact
          </a>
          <button className="mobile-cta-button" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Mitra"}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
