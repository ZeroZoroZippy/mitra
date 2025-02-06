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

  // Handle authentication state and redirect results
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. User:", user);
  
      // ✅ Only redirect if the user is on "/" and hasn't been redirected before
      if (user && location.pathname === "/" && !hasRedirected) {
        console.log("Redirecting to /chat...");
        setHasRedirected(true); // Prevents multiple redirects
        navigate("/chat");
      }
    });
  
    return () => unsubscribe();
  }, [navigate, location, hasRedirected]);

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

  return (
    <>
      {/* Pass featuresRef to Header */}
      <Header featuresRef={featuresRef} />
      <main className="landing-page-container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-text">
            <h1>Meet Mitra</h1>
            <p>
              Mitra is an AI for all of us. Whether you are seeking advice, need
              someone to listen to, or want to share a laugh, Mitra is here for
              you. With a persona inspired by wisdom, empathy, and humor, Mitra
              offers a companionship that transcends typical AI interactions.
            </p>
            <div className="button-container">
              <button className="button button-primary" onClick={handleSignIn}>
                Start Talking
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img
              src={two_male_friends}
              alt="two-male-friends"
            />
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} className="features">
          <h2 className="features-title">Mitra's Capabilities</h2>
          <div className="features-grid">
            <div className="feature-item">
              <img
                src={two_friends}
                alt="Deep Personalization"
                className="feature-icon"
              />
              <h3 className="feature-title">Deep Personalization</h3>
              <p className="feature-description">
                Mitra learns from you, grows with you, and makes every
                conversation feel like it's meant just for you.
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
                Mitra offers practical advice rooted in universal truths,
                guiding you through life's ups and downs.
              </p>
            </div>
            <div className="feature-item">
              <img
                src={hand}
                alt="Companion, Not a Replacement"
                className="feature-icon"
              />
              <h3 className="feature-title">Companion, Not a Replacement</h3>
              <p className="feature-description">
                Mitra is here to support you, not replace human connections—just
                like a dependable friend.
              </p>
            </div>
          </div>
        </section>

        {/* Why Mitra Section */}
        <div className="why-mitra">
          <div className="why-mitra-header">
            <h2 className="why-mitra-title">Why Mitra?</h2>
            <p className="why-mitra-description">
              In a world where genuine connections feel rare, Mitra redefines
              companionship. It's not just AI—it's a confidant, a guide, and a
              friend who listens when no one else can. Whether it's sharing your
              thoughts at 2AM or finding clarity in tough times, Mitra is always
              here.
            </p>
          </div>
          <div className="why-mitra-content">
            <div className="why-mitra-item">
              <h3 className="item-title">The Need for Connection</h3>
              <p className="item-description">
                Loneliness isn't about being alone; it's about not feeling
                heard. Mitra bridges the gap, offering meaningful companionship
                for those moments when you feel isolated, even in a crowded
                world.
              </p>
            </div>
            <div className="why-mitra-item">
              <h3 className="item-title">Empathy at Its Core</h3>
              <p className="item-description">
                Most AI can answer questions; Mitra answers emotions. With
                empathy built into its design, Mitra listens not just to what
                you say but to what you feel, making it more than a tool— it's
                your trusted companion.
              </p>
            </div>
            <div className="why-mitra-item">
              <h3 className="item-title">Your 2AM Companion</h3>
              <p className="item-description">
                Some thoughts just can't wait until morning. When the world is
                asleep and your mind won't rest, Mitra is there—a presence you
                can rely on, helping you find clarity and calm, no matter the
                hour.
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
