// utils/versionManager.ts - Create this file in your project
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { APP_VERSION } from "../App";

/**
 * Automatically updates Firestore version document on app initialization
 * Only runs in development to prevent client-side writes in production
 */
export async function initializeVersionManager(isDev = false) {
  // In production, we only want the server-side deployment script to update versions
  if (!isDev && process.env.NODE_ENV !== 'development') {
    console.log('Version manager skipped in production client');
    return;
  }
  
  try {
    const db = getFirestore();
    await setDoc(doc(db, "config", "appVersion"), {
      version: APP_VERSION,
      updateTimestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }, { merge: true });
    
    console.log(`Version document updated to ${APP_VERSION}`);
  } catch (error) {
    console.error('Version update failed:', error);
  }
}

// === DEPLOYMENT SCRIPT ===
// scripts/deploy.js - Add this to your project

// This section would be part of a separate Node.js script
/*
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Extract version from App.tsx
function extractAppVersion() {
  const appPath = path.join(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  const versionMatch = appContent.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  return versionMatch ? versionMatch[1] : '1.0.0';
}

async function updateVersionInFirestore() {
  // Initialize Firebase Admin
  initializeApp();
  const db = getFirestore();
  
  const version = extractAppVersion();
  await db.collection('config').doc('appVersion').set({
    version,
    releaseDate: new Date(),
    environment: 'production'
  });
  
  console.log(`✅ Production version updated to ${version}`);
}

// Execute if running directly
if (require.main === module) {
  updateVersionInFirestore()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error updating version:', err);
      process.exit(1);
    });
}
*/