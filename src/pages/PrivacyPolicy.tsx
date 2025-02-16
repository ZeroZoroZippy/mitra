import React from "react";
import { useNavigate } from "react-router-dom";
import "./PrivacyPolicy.css"; // Create a CSS file for styling

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-container">
      <button onClick={() => navigate(-1)} className="back-button">← Back</button>
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> 16/02/2025</p>
      <p><strong>Last Updated:</strong> 16/02/2025</p>
      
      <h2>1. Information We Collect</h2>
      <h3>1.1 Personal Information (Encrypted & Protected)</h3>
      <p>When you sign in using Google Authentication, we securely store:</p>
      <ul>
        <li>Your Name (Encrypted before storage in Firestore)</li>
        <li>Your Email Address (Encrypted before storage in Firestore)</li>
        <li>Your Profile Picture (Stored as-is for UI display only, not encrypted)</li>
        <li>Unique User ID (UID) (Used only for authentication and data retrieval, not shared with third parties)</li>
      </ul>
      <p><strong>🔐 Your name and email are encrypted before being stored in Firestore, ensuring that even we cannot access them directly.</strong></p>

      <h3>1.2 Chat Messages (Stored in Plaintext for AI Context Awareness)</h3>
      <p>When you interact with Saarth, we store:</p>
      <ul>
        <li>Your Messages (Stored as plaintext for real-time AI context awareness & seamless conversations)</li>
        <li>AI Responses (Stored as plaintext for conversation continuity)</li>
        <li>Like/Dislike Feedback on AI Responses (Stored to improve AI interactions, but never linked to personal identity)</li>
      </ul>
      <p><strong>💬 Messages are stored in plaintext to maintain seamless AI conversation flow but are not linked to your encrypted personal details.</strong></p>

      <h2>2. How We Use Your Data</h2>
      <p>We use the collected information <strong>only to enhance your experience with Saarth</strong>:</p>
      <ul>
        <li>✔ Providing Personalized Conversations – Your message history helps Saarth understand context and offer meaningful responses.</li>
        <li>✔ Improving AI Performance – Feedback (like/dislike) helps us improve responses, but we do not analyze individual conversations linked to users.</li>
        <li>✔ Maintaining Privacy & Security – We store user details securely and ensure they remain encrypted.</li>
      </ul>

      <h2>3. How We Protect Your Data</h2>
      <ul>
        <li>✅ User details (name, email) are AES-256 encrypted before being stored in Firestore.</li>
        <li>✅ Messages remain unencrypted but are stored without being linked to personally identifiable information.</li>
        <li>✅ Firestore security rules ensure that only authenticated users can access their own chat history.</li>
        <li>✅ We do not share, sell, or expose any user data to third parties.</li>
      </ul>

      <h2>4. Data Retention & Deletion Policy</h2>
      <p>🗂️ We store your chat history indefinitely to maintain Saarth’s conversational memory. However, you <strong>control your data</strong>:</p>
      <ul>
        <li>You may delete individual messages from your chat, which removes them from your UI.</li>
        <li>Soft deletion is implemented, meaning deleted messages are hidden from UI but may be retained for system improvements.</li>
        <li>For complete account deletion, you can contact us, and we will remove your profile and messages permanently.</li>
      </ul>

      <h2>5. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at:</p>
      <p>📧 <strong>Email:</strong> yourmitra08@gmail.com</p>
    </div>
  );
};

export default PrivacyPolicy;