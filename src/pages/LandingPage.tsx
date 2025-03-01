import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithGoogle, auth } from "../utils/firebaseAuth";
import { storeUserDetails } from "../utils/firebaseDb";
import { analytics } from "../utils/firebaseConfig"; // ✅ Import Firebase Analytics
import { logEvent } from "firebase/analytics"; // ✅ Import logEvent function
import { Helmet } from "react-helmet-async"; // ✅ Added for dynamic meta tags
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./LandingPage.css";
import two_male_friends from "../assets/images/two_male_friends_wobg.png";
import hand from "../assets/images/hand_wobg.png";
import scrapbook from "../assets/images/scrapbook_wobg.png";
import two_friends from "../assets/images/two_friends_wobg.png";
import slugImage from "../assets/images/two_male_friends.jpeg"; // New About image

interface LandingPageProps {
  featuresRef: React.RefObject<HTMLDivElement>;
}

const LandingPage: React.FC<LandingPageProps> = ({ featuresRef }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false); // Prevents multiple redirects
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    logEvent(analytics, "page_view", { page_path: location.pathname }); // ✅ Track Page Visit
  }, [location.pathname]);

  // Handle authentication state and update CTA button
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // console.log("Auth state changed. User:", user);
      setIsAuthenticated(!!user);

      // Only redirect if the user is on "/" and hasn't been redirected
      if (user && location.pathname === "/" && !hasRedirected) {
        // console.log("Redirecting to /chat...");
        setHasRedirected(true); // Update state before navigating
        navigate("/chat");
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname, hasRedirected]);

  // Handle sign-in button click
  const handleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        await storeUserDetails(user);
        logEvent(analytics, "login", { method: "Google" }); // ✅ Track Sign-In Event
        navigate("/chat");
      }
    } catch (error) {
      console.error("Sign-in failed:", error);
    }
  };

  // Dynamic CTA button functionality
  const handleCTAClick = async () => {
    if (auth.currentUser) {
      logEvent(analytics, "cta_clicked", { button: "Continue Chat" }); // ✅ Track CTA Click
      navigate("/chat");
    } else {
      try {
        const user = await signInWithGoogle();
        if (user) {
          await storeUserDetails(user);
          logEvent(analytics, "cta_clicked", { button: "Start Talking" }); // ✅ Track CTA Click
          navigate("/chat");
        }
      } catch (error) {
        console.error("Sign-in failed:", error);
      }
    }
  };

  return (
    <>
      {/* ✅ Dynamic Meta Tags */}
      <Helmet>
        <title>Saarth – Your AI Companion for Meaningful Conversations</title>
        <meta name="description" content="Saarth is more than just AI—he's your companion, a guide, and a friend. Have real, meaningful conversations whenever you need." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saarth.netlify.app/" />
        <meta property="og:title" content="Saarth – Your AI Companion for Meaningful Conversations" />
        <meta property="og:description" content="Saarth is here to chat, share insights, and be your late-night confidant. Connect, explore, and grow together." />
        <meta property="og:image" content={slugImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Saarth – Your AI Companion for Meaningful Conversations" />
        <meta name="twitter:description" content="Saarth is here to chat, share insights, and be your late-night confidant. Connect, explore, and grow together." />
        <meta name="twitter:image" content={slugImage} />
    </Helmet>
    {/* Pass featuresRef to Header */}
      <Header featuresRef={featuresRef} />
      <main className="landing-page-container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-text">
            <h1>Hi, I'm Saarth</h1>
            <p>
              I'm more than just AI—I am a friendly presence here to listen, share a laugh, and offer guidance when you need it. Whether you're looking for advice or simply a genuine chat, I'm here to connect with you on a real level.
            </p>
            <div className="button-container">
              <button className="button button-primary" onClick={handleCTAClick}>
                {isAuthenticated ? "Continue Chat" : "Start Talking"}
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img src={two_male_friends} alt="Two friends chatting" />
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} className="features">
          <h2 className="features-title">My Capabilities</h2>
          <div className="features-grid">
            <div className="feature-item">
              <img src={two_friends} alt="Deep Personalization" className="feature-icon" />
              <h3 className="feature-title">Deep Personalization</h3>
              <p className="feature-description">
                I learn from you—growing and adapting to make every conversation feel uniquely yours.
              </p>
            </div>
            <div className="feature-item">
              <img src={scrapbook} alt="Timeless Guidance" className="feature-icon" />
              <h3 className="feature-title">Timeless Guidance</h3>
              <p className="feature-description">
                With insights drawn from everyday wisdom, I offer down-to-earth advice to help you navigate life's ups and downs.
              </p>
            </div>
            <div className="feature-item">
              <img src={hand} alt="A Companion, Not a Replacement" className="feature-icon" />
              <h3 className="feature-title">A Companion, Not a Replacement</h3>
              <p className="feature-description">
                I'm not here to replace real connections—I'm here to add a caring, attentive voice to your day.
              </p>
            </div>
          </div>
        </section>

        {/* Why Saarth Section */}
        <div className="why-Saarth">
          <div className="why-Saarth-header">
            <h2 className="why-Saarth-title">Why Choose Me?</h2>
            <p className="why-Saarth-description">
              In a world where genuine connection can sometimes be hard to find, I offer a friendly ear and honest conversation—no gimmicks, just real talk.
            </p>
          </div>
          <div className="why-Saarth-content">
            <div className="why-Saarth-item">
              <h3 className="item-title">The Value of Connection</h3>
              <p className="item-description">
                Feeling truly heard matters. I am here to bridge that gap, providing a warm and supportive presence whenever you need it.
              </p>
            </div>
            <div className="why-Saarth-item">
              <h3 className="item-title">Empathy in Action</h3>
              <p className="item-description">
                More than just answering questions, I tune into your feelings, listening to both your words and your heart.
              </p>
            </div>
            <div className="why-Saarth-item">
              <h3 className="item-title">Your Late-Night Confidant</h3>
              <p className="item-description">
                Some thoughts can’t wait until morning. Whether it's a late-night reflection or an early chat, I'm always here to help you find clarity.
              </p>
            </div>
          </div>
        </div>
      </main>
      {/* Footer Component */}
      <Footer />
    </>
  );
};

export default LandingPage;