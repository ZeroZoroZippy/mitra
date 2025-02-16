import React from "react";
import { useNavigate } from "react-router-dom";
import "./PrivacyPolicy.css"; // Ensure styling is applied

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-container">
      <button onClick={() => navigate(-1)} className="back-button">← Back</button>
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> 16/02/2025</p>
      <p><strong>Last Updated:</strong> 16/02/2025</p>
      
      <h2>1. What Information We Collect</h2>
      <h3>1.1 Personal Information (Encrypted & Secure)</h3>
      <p>When you sign in with Google, we collect:</p>
      <ul>
        <li>Your Name (Encrypted before being stored in Firestore)</li>
        <li>Your Email Address (Encrypted before being stored in Firestore)</li>
        <li>Your Profile Picture (Stored as-is, not encrypted, only for UI display)</li>
        <li>A Unique User ID (UID) (Used only for authentication, never shared with anyone)</li>
      </ul>
      <p><strong>🔐 Your name and email are fully encrypted before being saved, which means even we can’t access them directly.</strong></p>

      <h3>1.2 Chat Messages (Stored for AI Context Awareness)</h3>
      <p>To make conversations with Saarth <strong>flow naturally</strong>, we store:</p>
      <ul>
        <li>Your Messages (Stored in plaintext to maintain real-time context)</li>
        <li>AI Responses (Stored to keep conversations consistent)</li>
        <li>Like/Dislike Feedback on AI Responses (Used to improve Saarth, but never linked to your identity)</li>
      </ul>
      <p><strong>💬 We don’t connect messages to your personal details, meaning even we don’t know which user sent what.</strong></p>

      <h2>2. How We Use Your Data</h2>
      <p>We collect data <strong>only to enhance your experience with Saarth</strong>—nothing else.</p>
      <ul>
        <li>✔ <strong>Making Conversations Better</strong> – Storing chat history helps Saarth <strong>remember context and respond more naturally</strong>.</li>
        <li>✔ <strong>Improving AI Responses</strong> – Your <strong>feedback</strong> (like/dislike) helps us <strong>refine how Saarth interacts</strong>.</li>
        <li>✔ <strong>Keeping Things Secure</strong> – We encrypt your <strong>name & email</strong>, ensuring that <strong>your identity stays private</strong>.</li>
      </ul>

      <h2>3. How We Keep Your Data Secure</h2>
      <ul>
        <li>✅ Your name & email are encrypted before storage—so even we can’t read them.</li>
        <li>✅ Messages are stored separately and are never linked to personal data.</li>
        <li>✅ Even we cannot determine which user sent a specific message, ensuring full privacy and anonymity.</li>
        <li>✅ Saarth follows strict Firestore security rules—only you can access your chat history.</li>
        <li>✅ We don’t sell, share, or expose any user data—ever.</li>
      </ul>

      <h2>4. How Long We Keep Your Data</h2>
      <p>🗂️ <strong>We store your chat history indefinitely</strong> to keep Saarth’s conversational memory intact.</p>
      <ul>
        <li>Messages remain stored in plaintext (so Saarth can keep up with the conversation).</li>
        <li>Your name & email stay encrypted for your security.</li>
      </ul>

      <h2>5. Got Questions? Need Help?</h2>
      <p>If you have any concerns about privacy, feel free to reach out to us. We’re here to help.</p>
      <p>📧 <strong>Email:</strong> feedbackforsaarth@gmail.com</p>
    </div>
  );
};

export default PrivacyPolicy;