import React, { useState, RefObject } from 'react'; // Explicitly import React
import { useNavigate } from 'react-router-dom'; // ✅ Import navigation
// import { signInWithGoogle } from '../../../shared/utils/firebaseAuth'; // ✅ Import Google Sign-In
import './Header.css';
import { signInWithGoogle } from '../../../shared/utils/firebaseAuth';

interface HeaderProps {
  featuresRef: RefObject<HTMLDivElement>;
}

const Header: React.FC<HeaderProps> = ({ featuresRef }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate(); // ✅ For redirection

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollToFeatures = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ✅ Handle Google Sign-In
  const handleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      console.log('User signed in:', user);
      navigate('/chat'); // ✅ Redirect to Chat after successful login
    } catch (error) {
      console.error('Sign-in failed:', error);
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
          <button className="cta-button" onClick={handleSignIn}> {/* ✅ Updated this */}
            Try Mitra
          </button>
        </nav>

        {/* Hamburger Icon for Mobile */}
        <button
          className={`menu-icon ${isMobileMenuOpen ? 'open' : ''}`}
          aria-label="Toggle Mobile Menu"
          onClick={toggleMenu}
        >
          {isMobileMenuOpen ? '✖' : '☰'}
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
          <button className="mobile-cta-button" onClick={handleSignIn}> {/* ✅ Also updated this */}
            Try Mitra
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;