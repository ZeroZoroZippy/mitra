import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../utils/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";
import './Footer.css';

const Footer = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleCTAClick = async () => {
    if (isAuthenticated) {
      navigate("/chat");
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
    <footer className="footer">
      <div className="footer-container">
        {/* Left Section */}
        <div className="footer-left">
          <h3>Mitra</h3>
          <p>Your trusted 2AM friend.</p>
          <button className="cta-button-footer" onClick={handleCTAClick}>
            {isAuthenticated ? "Continue Chat" : "Try Mitra"}
          </button>
        </div>

        {/* Middle Section */}
        <div className="footer-middle">
          <a href="#features" className="footer-link">Features</a>
          <a href="#about" className="footer-link">About</a>
          <a href="#contact" className="footer-link">Contact</a>

          {/* "Back to top" link with underline */}
          <a href="#top" className="footer-link back-to-top">
            Back to top
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Mitra. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;