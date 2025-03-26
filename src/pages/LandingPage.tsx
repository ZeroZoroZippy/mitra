import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithGoogle, auth } from "../utils/firebaseAuth";
import { storeUserDetails } from "../utils/firebaseDb";
import { analytics } from "../utils/firebaseConfig";
import { logEvent } from "firebase/analytics";
import { Helmet } from "react-helmet-async";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./LandingPage.css";
import { FcGoogle } from "react-icons/fc";
import { 
  FiHeart, FiBook, FiZap, FiMoon, FiArrowRight, 
  FiMessageCircle, FiStar, FiAward, FiCoffee, FiLayers,
  FiX, FiChevronsDown
} from "react-icons/fi";

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
  const [activeMode, setActiveMode] = useState<"companion" | "learn">("companion");
  const [isScrolled, setIsScrolled] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresContainerRef = useRef<HTMLDivElement>(null);
  const modesContainerRef = useRef<HTMLDivElement>(null);
  const demoContainerRef = useRef<HTMLDivElement>(null);
  const ctaSectionRef = useRef<HTMLDivElement>(null);

  // For animated elements
  const featureCards = useRef<(HTMLDivElement | null)[]>([]);
  const modeCards = useRef<(HTMLDivElement | null)[]>([]);
  const topicCards = useRef<(HTMLDivElement | null)[]>([]);

  // Intersection Observer for revealing animations
  const createObserver = useCallback(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, options);

    // Observe all elements with fade-in class
    document.querySelectorAll('.fade-in').forEach(el => {
      observer.observe(el);
    });

    // Observe staggered elements
    document.querySelectorAll('.stagger-fade-in').forEach((el, index) => {
      el.setAttribute('style', `--delay: ${index}`);
      observer.observe(el);
    });

    return observer;
  }, []);

  useEffect(() => {
    // Track page view
    logEvent(analytics, "page_view", { page_path: location.pathname });
    
    // Initialize particles background
    initParticles();
    
    // Create and apply intersection observer for animations
    const observer = createObserver();
    
    // Handle scroll events for header
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [location.pathname, createObserver]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (user && location.pathname === "/" && !hasRedirected) {
        setHasRedirected(true);
        navigate("/home");
      }
    });
    return () => unsubscribe();
  }, [navigate, location.pathname, hasRedirected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithGoogle();
      if (user) {
        await storeUserDetails(user);
        logEvent(analytics, "login", { method: "Google" });
        navigate("/home");
      }
    } catch (error) {
      console.error("Sign-in failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCTAClick = () => {
    if (isAuthenticated) {
      logEvent(analytics, "cta_clicked", { button: "Continue Chat" });
      navigate("/chat");
    } else {
      logEvent(analytics, "cta_clicked", { button: "Start Talking" });
      setShowAuthModal(true);
    }
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize particles background
  const initParticles = () => {
    const canvas = document.createElement('canvas');
    canvas.className = 'particles-background';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Create particles
    const particles: {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
    }[] = [];
    
    const createParticles = () => {
      const particleCount = Math.floor(window.innerWidth / 20); // Responsive particle count
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          color: `rgba(${110 + Math.random() * 145}, ${72 + Math.random() * 146}, ${170 + Math.random() * 85}, ${0.2 + Math.random() * 0.3})`,
          speedX: Math.random() * 0.3 - 0.15,
          speedY: Math.random() * 0.3 - 0.15
        });
      }
    };
    
    createParticles();
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Boundary check
        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  };

  const testimonials = [
    {
      text: "Saarth helped me through a really tough time. The conversations felt genuinely understanding, not just scripted responses.",
      author: "Jamie M.",
      role: "Graphic Designer",
      rating: 5
    },
    {
      text: "As a lifelong learner, I'm blown away by how Saarth explains complex topics. It's like having a patient tutor available 24/7.",
      author: "Dr. Raj P.",
      role: "University Professor",
      rating: 5
    },
    {
      text: "What sets Saarth apart is how it weaves wisdom into everyday conversations. I'll start talking about my day and end up with profound insights.",
      author: "Tasha L.",
      role: "Social Worker",
      rating: 5
    },
    {
      text: "I've tried several AI companions, but Saarth truly feels like talking to a thoughtful friend who remembers our past conversations.",
      author: "Michael K.",
      role: "Software Engineer",
      rating: 5
    }
  ];

  const topics = [
    { icon: <FiZap />, title: "Quantum Physics", description: "Understand the strange world of particles and waves" },
    { icon: <FiHeart />, title: "Psychology", description: "Explore human behavior and mental health concepts" },
    { icon: <FiBook />, title: "Literature", description: "Analyze literary works and writing techniques" },
    { icon: <FiMoon />, title: "Philosophy", description: "Engage with existential questions and ethics" },
    { icon: <FiCoffee />, title: "Personal Growth", description: "Discover strategies for self-improvement" },
    { icon: <FiLayers />, title: "Technology", description: "Learn about AI, blockchain, and emerging tech" }
  ];

  const features = [
    {
      icon: <FiHeart />,
      title: "Emotional Support",
      description: "Genuine, empathetic responses that make you feel heard and understood, available whenever you need someone."
    },
    {
      icon: <FiBook />,
      title: "Adaptive Learning",
      description: "Explains complex concepts through natural conversation, adjusting to your knowledge level and learning style."
    },
    {
      icon: <FiZap />,
      title: "Dual Modes",
      description: "Switch seamlessly between companion mode for emotional support and learn mode for educational exploration."
    },
    {
      icon: <FiMoon />,
      title: "Philosophical Depth",
      description: "Engages in meaningful conversations about life, purpose, and human experience with genuine insight."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Saarth – Your AI Companion for Emotional Support & Learning</title>
        <meta name="description" content="Saarth combines emotional intelligence with educational depth, offering natural conversations that adapt to your needs." />
      </Helmet>

      <header className={isScrolled ? "scrolled" : ""}>
        <a href="/" className="logo">
          <span>Saarth</span>
        </a>
        <nav>
          <ul>
            <li><a href="#" onClick={() => scrollToFeatures()}>Features</a></li>
            <li><a href="#">About</a></li>
            <li><a href="/privacy-policy">Privacy</a></li>
          </ul>
        </nav>
        <button className="cta-button" onClick={handleCTAClick}>
          {isAuthenticated ? "Open App" : "Get Started"}
        </button>
      </header>
      
      <main className="landing-page-container">
        {/* Hero Section */}
        <section className="hero" ref={heroRef}>
          <div className="hero-content">
            <h1>Your 2AM friend and knowledge companion</h1>
            <p>
              Saarth combines emotional intelligence with educational depth, offering natural conversations that adapt to your needs—whether you're exploring concepts or sharing your thoughts.
            </p>
            <div className="hero-buttons">
              <button className="cta-button" onClick={handleCTAClick}>
                {isAuthenticated ? "Continue Chat" : "Start Talking"} <FiArrowRight style={{ marginLeft: '8px' }} />
              </button>
            </div>
            <div className="scroll-indicator" onClick={() => scrollToFeatures()}>
              <FiChevronsDown />
              <span>Explore Features</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="mode-toggle">
              <button 
                className={`toggle-button ${activeMode === "companion" ? "active" : ""}`}
                onClick={() => setActiveMode("companion")}
              >
                Companion Mode
              </button>
              <button 
                className={`toggle-button ${activeMode === "learn" ? "active" : ""}`}
                onClick={() => setActiveMode("learn")}
              >
                Learn Mode
              </button>
            </div>
            <div className="chat-container">
              {activeMode === "companion" ? (
                <>
                  <div className="chat-bubble ai-bubble">
                    Hi there! I'm Saarth. Whether you need someone to talk to or want to explore new ideas, I'm here for you.
                  </div>
                  <div className="chat-bubble user-bubble">
                    I've been feeling a bit overwhelmed lately...
                  </div>
                  <div className="chat-bubble ai-bubble">
                    I hear you. It's completely normal to feel that way sometimes. Would you like to talk about what's been weighing on you?
                  </div>
                </>
              ) : (
                <>
                  <div className="chat-bubble ai-bubble">
                    Hello! What topic would you like to explore today? I can explain concepts from physics to philosophy.
                  </div>
                  <div className="chat-bubble user-bubble">
                    Can you explain quantum entanglement?
                  </div>
                  <div className="chat-bubble ai-bubble">
                    Quantum entanglement is when particles become interconnected—what happens to one immediately affects the other, no matter how far apart they are.
                  </div>
                </>
              )}
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section" ref={featuresRef}>
          <div className="section-title fade-in">
            <h2>Why Choose Saarth?</h2>
            <p>Philosophical wisdom woven naturally into every interaction, with the depth to explore any topic.</p>
          </div>
          <div className="features-container" ref={featuresContainerRef}>
            {features.map((feature, index) => (
              <div 
                className="feature-card stagger-fade-in" 
                key={index}
                ref={el => featureCards.current[index] = el}
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Modes Section */}
        <section className="section">
          <div className="section-title fade-in">
            <h2>Two Ways to Connect</h2>
            <p>Saarth adapts to your needs in the moment, whether you're seeking comfort or knowledge.</p>
          </div>
          <div className="modes-container" ref={modesContainerRef}>
            <div 
              className="mode-card stagger-fade-in" 
              ref={el => modeCards.current[0] = el}
              style={{ '--index': 0 } as React.CSSProperties}
            >
              <div className="mode-header">
                <h3>Talk with Saarth</h3>
                <p>Companion Mode</p>
              </div>
              <div className="mode-content">
                <p>When you need someone to listen, offer perspective, or just be present with you through life's ups and downs.</p>
                <ul>
                  <li>Empathetic, judgment-free conversations</li>
                  <li>Emotional validation and support</li>
                  <li>Thought-provoking questions</li>
                  <li>Available anytime you need to talk</li>
                </ul>
              </div>
            </div>
            <div 
              className="mode-card stagger-fade-in" 
              ref={el => modeCards.current[1] = el}
              style={{ '--index': 1 } as React.CSSProperties}
            >
              <div className="mode-header">
                <h3>Learn with Saarth</h3>
                <p>Education Mode</p>
              </div>
              <div className="mode-content">
                <p>When you're curious about the world and want to explore ideas, concepts, and knowledge in a natural way.</p>
                <ul>
                  <li>Explains complex topics simply</li>
                  <li>Adapts to your knowledge level</li>
                  <li>Connects concepts to real-world</li>
                  <li>Presents balanced viewpoints</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="section">
          <div className="section-title fade-in">
            <h2>Experience Saarth</h2>
            <p>See how Saarth responds differently in each mode to the same prompt.</p>
          </div>
          <div className="demo-container" ref={demoContainerRef}>
            <div className="demo-header">
              <div className="demo-title">
                <FiMessageCircle />
                <span>Conversation Examples</span>
              </div>
              <div className="demo-switch">
                <button 
                  className={`demo-switch-button ${activeMode === "companion" ? "active" : ""}`}
                  onClick={() => setActiveMode("companion")}
                >
                  <span>Companion</span>
                </button>
                <button 
                  className={`demo-switch-button ${activeMode === "learn" ? "active" : ""}`}
                  onClick={() => setActiveMode("learn")}
                >
                  <span>Learn</span>
                </button>
              </div>
            </div>
            <div className="demo-content">
              {activeMode === "companion" ? (
                <div className="conversation active">
                  <div className="chat-bubble user-bubble">
                    I've been thinking a lot about the meaning of life lately...
                  </div>
                  <div className="chat-bubble ai-bubble">
                    That's a profound and important thing to contemplate. Many people find themselves at this crossroads. Would you like to share what specifically has you thinking about this?
                  </div>
                  <div className="chat-bubble user-bubble">
                    I just feel like I'm going through the motions sometimes.
                  </div>
                  <div className="chat-bubble ai-bubble">
                    That feeling of going through the motions is something we all experience at times. It often signals that we're ready for deeper meaning or connection. What activities or moments have felt most fulfilling to you in the past?
                  </div>
                </div>
              ) : (
                <div className="conversation active">
                  <div className="chat-bubble user-bubble">
                    I've been thinking a lot about the meaning of life lately...
                  </div>
                  <div className="chat-bubble ai-bubble">
                    That's a fascinating topic that intersects philosophy, psychology, and neuroscience. Would you like to explore historical perspectives or scientific views on meaning?
                  </div>
                  <div className="chat-bubble user-bubble">
                    Maybe the scientific perspective?
                  </div>
                  <div className="chat-bubble ai-bubble">
                    From a scientific perspective, meaning is often understood through evolutionary psychology and neuroscience. Our brains appear wired to seek meaning as an adaptive trait, with studies showing that meaning-making activates our reward pathways and correlates with improved health outcomes.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Topics Section */}
        <section className="section">
          <div className="section-title fade-in">
            <h2>Explore Endless Topics</h2>
            <p>From quantum physics to culinary arts, Saarth can discuss virtually any subject.</p>
          </div>
          <div className="topics-container">
            {topics.map((topic, index) => (
              <div 
                className="topic-card stagger-fade-in" 
                key={index}
                ref={el => topicCards.current[index] = el}
                style={{ '--index': index } as React.CSSProperties}
              >
                <h4><span className="topic-icon">{topic.icon}</span>{topic.title}</h4>
                <p>{topic.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        {/* <section className="section">
          <div className="section-title fade-in">
            <h2>What People Are Saying</h2>
            <p>Hear from users who've experienced Saarth's unique combination of support and learning.</p>
          </div>
          <div className="testimonials-container">
            {testimonials.map((testimonial, index) => (
              <div className="testimonial-card fade-in" key={index}>
                <div className="testimonial-text">{testimonial.text}</div>
                <div className="testimonial-rating">
                  {[...Array(5)].map((_, i) => (
                    <FiStar 
                      key={i} 
                      fill={i < testimonial.rating ? "#FDD844" : "none"} 
                      color={i < testimonial.rating ? "#FDD844" : "#888"}
                    />
                  ))}
                </div>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="author-info">
                    <h4>{testimonial.author}</h4>
                    <p>{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section> */}

        {/* CTA Section */}
        <section className="cta-section fade-in" ref={ctaSectionRef}>
          <div className="cta-content">
            <h2>Ready to Meet Saarth?</h2>
            <p>Join those who've found emotional support, intellectual stimulation, and meaningful conversations with their AI companion.</p>
            <button className="cta-button" onClick={handleCTAClick}>
              Start Your Journey
              <FiArrowRight style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </section>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal" ref={modalRef}>
            <button className="auth-modal-close" onClick={() => setShowAuthModal(false)}>
              <FiX />
            </button>
            <h3 className="auth-modal-title">Welcome to Saarth</h3>
            <p className="auth-modal-subtitle">Sign in to start your journey</p>
            <button 
              className="auth-button google-button" 
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