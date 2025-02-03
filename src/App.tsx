import React, { useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ChatLayout from "./components/chat/screens/components/ChatLayout";

const App: React.FC = () => {
  const featuresRef = useRef<HTMLDivElement>(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage featuresRef={featuresRef} />} />
        <Route
          path="/home"
          element={<LandingPage featuresRef={featuresRef} />}
        />
        <Route path="/chat" element={<ChatLayout />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
