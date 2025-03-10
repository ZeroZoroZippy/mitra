import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const APP_VERSION = '2.0.1'; // Update this with each deployment

async function checkForUpdates() {
  try {
    const db = getFirestore();
    const configDoc = await getDoc(doc(db, 'config', 'appVersion'));
    const serverVersion = configDoc.data()?.version;
    
    if (serverVersion && serverVersion !== APP_VERSION) {
      showUpdateModal();
    }
  } catch (error) {
    console.error("Failed to check for updates:", error);
  }
}

function showUpdateModal() {
  const modalStyles = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(29,29,29,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  const modal = document.createElement('div');
  modal.setAttribute('style', modalStyles);
  modal.innerHTML = `
    <div style="background: #2d2d2d; border-radius: 12px; padding: 24px; max-width: 400px; text-align: center; font-family: 'Poppins', sans-serif;">
      <h3 style="color: #fff; margin-top: 0; font-size: 1.4rem;">Saarth Has Evolved</h3>
      <p style="color: #aaa;">We've enhanced your experience with new insights and capabilities.</p>
      <button 
        onclick="window.location.reload(true)" 
        style="background: linear-gradient(45deg, #FDD844, #FFEC9F); border: none; color: #1d1d1d; padding: 12px 24px; border-radius: 24px; font-weight: 500; cursor: pointer; font-family: 'Poppins', sans-serif;">
        Update Now
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

// First, render the app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

// Then check for updates (non-blocking)
checkForUpdates();