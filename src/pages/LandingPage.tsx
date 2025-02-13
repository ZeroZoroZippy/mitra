import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithGoogle, auth } from "../utils/firebaseAuth";
import { storeUserDetails } from "../utils/firebaseDb";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./LandingPage.css";
import two_male_friends from "../assets/images/two_male_friends_wobg.png";
import hand from "../assets/images/hand_wobg.png";
import scrapbook from "../assets/images/scrapbook_wobg.png";
import two_friends from "../assets/images/two_friends_wobg.png";


interface LandingPageProps {
  featuresRef: React.RefObject<HTMLDivElement>;
}

const LandingPage: React.FC<LandingPageProps> = ({ featuresRef }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false); // ✅ Prevents multiple redirects
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // ✅ Handle authentication state and update CTA button
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. User:", user);
      setIsAuthenticated(!!user);
  
      // ✅ Only redirect if the user is on "/" and hasn't been redirected
      if (user && location.pathname === "/" && !hasRedirected) {
        console.log("Redirecting to /chat...");
        setHasRedirected(true); // ✅ Update state before navigating
        navigate("/chat");
      }
    });
  
    return () => unsubscribe();
  }, [navigate, location.pathname, hasRedirected]); // ✅ Added dependencies

  // Handle sign-in button click
  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        await storeUserDetails(user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Dynamic CTA button functionality
  const handleCTAClick = async () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      try {
        const user = await signInWithGoogle();
        if (user) {
          await storeUserDetails(user); // ✅ Ensures user details are stored in Firestore
          navigate("/chat");
        }
      } catch (error) {
        console.error("Sign-in failed:", error);
      }
    }
  };

  return (
    <>
      {/* Pass featuresRef to Header */}
      <Header featuresRef={featuresRef} />
      <main className="landing-page-container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-text">
            <h1>Meet Saarth</h1>
            <p>
              Saarth is more than just AI—it's a friendly presence here to listen, share a laugh, or offer a bit of guidance when you need it. Whether you're looking for advice or simply a genuine chat, Saarth is here to connect with you on a real level.
            </p>
            <div className="button-container">
              <button className="button button-primary" onClick={handleCTAClick}>
                {isAuthenticated ? "Continue Chat" : "Start Talking"}
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img
              src={two_male_friends}
              alt="Two friends chatting"
            />
          </div>
        </section>
  
        {/* Features Section */}
        <section ref={featuresRef} className="features">
          <h2 className="features-title">Saarth's Capabilities</h2>
          <div className="features-grid">
            <div className="feature-item">
              <img
                src={two_friends}
                alt="Deep Personalization"
                className="feature-icon"
              />
              <h3 className="feature-title">Deep Personalization</h3>
              <p className="feature-description">
                Saarth learns from you—growing and adapting to make every conversation feel uniquely yours.
              </p>
            </div>
            <div className="feature-item">
              <img
                src={scrapbook}
                alt="Timeless Guidance"
                className="feature-icon"
              />
              <h3 className="feature-title">Timeless Guidance</h3>
              <p className="feature-description">
                With insights drawn from everyday wisdom, Saarth offers down-to-earth advice to help you navigate life's ups and downs.
              </p>
            </div>
            <div className="feature-item">
              <img
                src={hand}
                alt="A Companion, Not a Replacement"
                className="feature-icon"
              />
              <h3 className="feature-title">A Companion, Not a Replacement</h3>
              <p className="feature-description">
                Saarth isn’t here to replace real connections—it’s here to add a caring, attentive voice to your day.
              </p>
            </div>
          </div>
        </section>
  
        {/* Why Saarth Section */}
        <div className="why-saarth">
          <div className="why-saarth-header">
            <h2 className="why-saarth-title">Why Saarth?</h2>
            <p className="why-saarth-description">
              In a world where genuine connection can sometimes be hard to find, Saarth offers a friendly ear and honest conversation—no gimmicks, just real talk.
            </p>
          </div>
          <div className="why-saarth-content">
            <div className="why-saarth-item">
              <h3 className="item-title">The Value of Connection</h3>
              <p className="item-description">
                Feeling truly heard matters. Saarth is here to bridge that gap, providing a warm and supportive presence whenever you need it.
              </p>
            </div>
            <div className="why-saarth-item">
              <h3 className="item-title">Empathy in Action</h3>
              <p className="item-description">
                More than just answering questions, Saarth tunes into your feelings, listening to both your words and your heart.
              </p>
            </div>
            <div className="why-saarth-item">
              <h3 className="item-title">Your Late-Night Confidant</h3>
              <p className="item-description">
                Some thoughts can’t wait until morning. Whether it’s a late-night reflection or an early chat, Saarth is always here to help you find clarity.
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
