import React, { useRef } from 'react'; // Add this line to fix the error
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Left Section */}
        <div className="footer-left">
          <h3>Mitra</h3>
          <p>Your trusted 2AM friend.</p>
          <button className="cta-button-footer">Try Mitra</button>
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

        {/* Optional Right Section */}
        {/* <div className="footer-right">
          <p>Follow us:</p>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">FB</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">TW</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">IG</a>
          </div>
        </div> */}
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Mitra. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;