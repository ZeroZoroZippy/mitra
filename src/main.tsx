import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";  // ✅ Correct usage
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>  {/* ✅ BrowserRouter should only be here */}
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);