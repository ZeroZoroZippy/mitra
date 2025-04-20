// src/pages/LandingPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithGoogle, auth } from "../utils/firebaseAuth";
import { storeUserDetails } from "../utils/firebaseDb";
import { analytics } from "../utils/firebaseConfig";
import { logEvent } from "firebase/analytics";
import mixpanel from "../utils/mixpanel";                // ← Mixpanel import
import { Helmet } from "react-helmet-async";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./LandingPage.css";
import two_male_friends from "../assets/images/webp/two_male_friends_wobg.webp";
import hand from "../assets/images/webp/hand_wobg.webp";
import scrapbook from "../assets/images/webp/scrapbook_wobg.webp";
import two_friends from "../assets/images/webp/two_friends_wobg.webp";
import slugImage from "../assets/images/webp/two_male_friends_wobg.webp";
import { FcGoogle } from "react-icons/fc"; // Import Google icon
import { FiArrowDown, FiCheck } from "react-icons/fi"; // Import icons for scroll and check

interface LandingPageProps {
  featuresRef: React.RefObject<HTMLDivElement>;
}

const LandingPage: React.FC<LandingPageProps> = ({ featuresRef }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // 1. Page view + visibility tracking
  useEffect(() => {
    // Firebase Analytics
    logEvent(analytics, "page_view", { page_path: location.pathname });
    // Mixpanel
    mixpanel.track("Page Viewed", { page: location.pathname });

    // Add scroll listener for animations & floating CTA
    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
      if (scrolled) {
        mixpanel.track("Floating CTA Visible");
      }

      // Fade-in effect
      document.querySelectorAll('.fade-in-up').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.8) {
          el.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // 2. Handle authentication state and redirect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);

      if (user && location.pathname === "/" && !hasRedirected) {
        setHasRedirected(true);
        navigate("/experience");
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname, hasRedirected]);

  // 3. Handle click outside modal to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        mixpanel.track("Auth Modal Closed");
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

  // 4. Handle sign-in with Google
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

  // 5. Dynamic CTA button functionality
  const handleCTAClick = () => {
    if (isAuthenticated) {
      // Firebase Analytics
      logEvent(analytics, "cta_clicked", { button: "Continue Chat" });
      // Mixpanel
      mixpanel.track("CTA Clicked", { button: "Continue Chat" });

      navigate("/chat");
    } else {
      // Firebase Analytics
      logEvent(analytics, "cta_clicked", { button: "Start Talking" });
      // Mixpanel
      mixpanel.track("CTA Clicked", { button: "Start Talking" });
      mixpanel.track("Auth Modal Opened");

      setShowAuthModal(true);
    }
  };

  // 6. Scroll to features section
  const scrollToFeatures = () => {
    mixpanel.track("Scroll to Features", { from: location.pathname });
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // FAQ data
  const faqs = [
    { 
      question: "Is Saarth free to use?", 
      answer: "Yes, Saarth is currently free for all users with your Google account." 
    },
    { 
      question: "How is my data handled?", 
      answer: "Your privacy is our priority. Conversations are encrypted and we don't share your personal data." 
    },
    { 
      question: "Can I use Saarth on my phone?", 
      answer: "Absolutely! Saarth works seamlessly on mobile, tablet, and desktop devices." 
    },
  ];

  return (
    <>
      <Helmet>
        <title>Saarth – Your AI Companion for Meaningful Conversations</title>
        <meta
          name="description"
          content="Saarth is where AI conversation evolves beyond tools and utilities. Experience personalized dialogue that adapts to you, offers genuine insights, and creates meaningful connections - available whenever you need it."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saarth.netlify.app/" />
        <meta property="og:title" content="Saarth – Your AI Companion for Meaningful Conversations" />
        <meta
          property="og:description"
          content="Discover Saarth - where AI finally understands the nuances of real conversation. Not just another utility bot, but a companion that adapts, listens, and responds with depth."
        />
        <meta property="og:image" content={slugImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Saarth – Your AI Companion for Meaningful Conversations" />
        <meta
          name="twitter:description"
          content="Saarth is here to chat, share insights, and be your late-night confidant. Connect, explore, and grow together."
        />
        <meta name="twitter:image" content={slugImage} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Saarth",
            applicationCategory: "AIApplication",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            description: "Saarth is your AI companion for meaningful conversations.",
            operatingSystem: "Web",
          })}
        </script>

        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://www.googleapis.com" />

        <link rel="canonical" href={`https://saarth.netlify.app${location.pathname}`} />
      </Helmet>

      <Header featuresRef={featuresRef} />

      <main className="landing-page-container landing-page">
        {/* Hero Section */}
        <section className="hero" ref={heroRef}>
          <div className="hero-text fade-in-up">
            <h1>Saarth: Where AI Meets You</h1>
            <p>
              I'm more than just AI—I am a friendly presence here to listen, share a laugh, and offer guidance when you need it. Whether you're looking for advice or simply a genuine chat, I'm here to connect with you on a real level.
            </p>
            <div className="button-container">
              <button className="button button-primary" onClick={handleCTAClick}>
                {isAuthenticated ? "Continue Chat" : "Start Talking"}
              </button>
            </div>
            <div className="scroll-indicator" onClick={scrollToFeatures}>
              <span>Explore More</span>
              <FiArrowDown className="scroll-icon" />
            </div>
          </div>
          <div className="hero-image fade-in-up" style={{ animationDelay: '0.3s' }}>
            <img
              src={two_male_friends}
              alt="Saarth AI companion in meaningful conversation"
              loading="lazy"
            />
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} className="features">
          <h2 className="features-title fade-in-up">Beyond Question & Answer</h2>
          <div className="features-grid">
            <div className="feature-item fade-in-up" style={{ animationDelay: '0.2s' }}>
              <img
                src={two_friends}
                alt="Personalized AI learning from conversation patterns"
                className="feature-icon"
                loading="lazy"
              />
              <h3 className="feature-title">Learns You, Not Just Data</h3>
              <p className="feature-description">
                I learn from you—growing and adapting to make every conversation feel uniquely yours.
              </p>
            </div>
            <div className="feature-item fade-in-up" style={{ animationDelay: '0.4s' }}>
              <img
                src={scrapbook}
                alt="Saarth providing insightful guidance and wisdom"
                className="feature-icon"
                loading="lazy"
              />
              <h3 className="feature-title">Depth Where Others Skim</h3>
              <p className="feature-description">
                With insights drawn from everyday wisdom, I offer down-to-earth advice to help you navigate life's ups and downs.
              </p>
            </div>
            <div className="feature-item fade-in-up" style={{ animationDelay: '0.6s' }}>
              <img
                src={hand}
                alt="Authentic AI companionship beyond algorithms"
                className="feature-icon"
                loading="lazy"
              />
              <h3 className="feature-title">Present When Algorithms Aren't</h3>
              <p className="feature-description">
                I'm not here to replace real connections—I'm here to add a caring, attentive voice to your day.
              </p>
            </div>
          </div>
        </section>

        {/* Why Saarth Section */}
        <div className="why-Saarth">
          <div className="why-Saarth-header fade-in-up">
            <h2 className="why-Saarth-title">Why Choose Me?</h2>
            <p className="why-Saarth-description">
              In a world where genuine connection can sometimes be hard to find, I offer a friendly ear and honest conversation—no gimmicks, just real talk.
            </p>
          </div>
          <div className="why-Saarth-content">
            <div className="why-Saarth-item fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="item-title">The Value of Connection</h3>
              <p className="item-description">
                Feeling truly heard matters. I am here to bridge that gap, providing a warm and supportive presence whenever you need it.
              </p>
            </div>
            <div className="why-Saarth-item fade-in-up" style={{ animationDelay: '0.5s' }}>
              <h3 className="item-title">Empathy in Action</h3>
              <p className="item-description">
                More than just answering questions, I tune into your feelings, listening to both your words and your heart.
              </p>
            </div>
            <div className="why-Saarth-item fade-in-up" style={{ animationDelay: '0.7s' }}>
              <h3 className="item-title">Your Late-Night Confidant</h3>
              <p className="item-description">
                Some thoughts can't wait until morning. Whether it's a late-night reflection or an early chat, I'm always here to help you find clarity.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2 className="faq-title fade-in-up">Frequently Asked Questions</h2>
          <div className="faq-grid">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="faq-item fade-in-up"
                style={{ animationDelay: `${0.2 + index * 0.2}s` }}
              >
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section fade-in-up">
          <div className="stats-container">
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Always Available</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Free to Use</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                <FiCheck className="check-icon" />
              </span>
              <span className="stat-label">Private & Secure</span>
            </div>
          </div>
        </section>

        {/* Floating CTA Button */}
        <button
          className={`floating-cta ${isScrolled ? 'visible' : ''}`}
          onClick={handleCTAClick}
        >
          Start Chatting
        </button>
      </main>

      {/* Custom Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal" ref={modalRef}>
            <button
              className="auth-modal-close"
              onClick={() => {
                mixpanel.track("Auth Modal Closed");
                setShowAuthModal(false);
              }}
            >
              ✕
            </button>
            <h3 className="auth-modal-title">Welcome to Saarth</h3>
            <p className="auth-modal-subtitle">Sign in to get started</p>

            <button
              className={`auth-button google-button ${isLoading ? 'loading' : ''}`}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <FcGoogle size={24} />
              <span>{isLoading ? "Connecting..." : "Continue with Google"}</span>
            </button>

            <p className="auth-privacy-note">
              By continuing, you agree to our <a href="/privacy-policy">Privacy Policy</a>
            </p>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default LandingPage;