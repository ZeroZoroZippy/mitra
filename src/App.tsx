import React, { useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ChatLayout from './components/chat/screens/components/ChatLayout';
// import ChatApp from '../../chat_app/src/App'; // ✅ Import Chat App

const App: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage featuresRef={featuresRef} />} />
        
        {/* ✅ Apply a wrapper to prevent layout conflicts
        <Route path="/chat" element={
          <div className="chat-page-wrapper">
            
            <ChatLayout/>
          </div>
        } /> */}

        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;