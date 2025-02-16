import React, { useEffect, useState } from 'react';
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

  // ✅ Feedback Mailto Function
  const handleFeedbackClick = () => {
    window.location.href = "mailto:yourmitra08@gmeil.com?subject=Feedback for Saarth&body=Hi, I wanted to share my feedback about Saarth...";
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

          {/* ✅ Feedback Link */}
          <div className="footer-contact" onClick={handleFeedbackClick}>
            Contact
          </div>
        </div>

        {/* Middle Section */}
        <div className="footer-middle">
          <a href="#features" className="footer-link">Features</a>
          <a onClick={() => navigate("/privacy-policy")} className="footer-link">Privacy Policy</a> {/* ✅ Only this link added */}
          <a href="#top" className="footer-link back-to-top">Back to top</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;