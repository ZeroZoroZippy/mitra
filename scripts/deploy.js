import { execSync } from 'child_process';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Setup proper paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Get service account key
const serviceAccount = require('../serviceAccountKey.json');

// Extract version from App.tsx
function extractAppVersion() {
  const appPath = path.join(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  const versionMatch = appContent.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  
  if (!versionMatch) {
    console.warn('⚠️ Could not find APP_VERSION in App.tsx. Using default 1.0.0');
    return '1.0.0';
  }
  
  return versionMatch[1];
}

// Auto-increment version if --bump flag is provided
function bumpVersion() {
  const appPath = path.join(__dirname, '../src/App.tsx');
  let appContent = fs.readFileSync(appPath, 'utf8');
  const versionMatch = appContent.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  
  if (!versionMatch) {
    console.warn('⚠️ Could not find APP_VERSION in App.tsx. Cannot bump version.');
    return null;
  }
  
  const currentVersion = versionMatch[1];
  const versionParts = currentVersion.split('.');
  versionParts[2] = (parseInt(versionParts[2], 10) + 1).toString();
  const newVersion = versionParts.join('.');
  
  appContent = appContent.replace(
    /APP_VERSION\s*=\s*["'][^"']+["']/,
    `APP_VERSION = "${newVersion}"`
  );
  
  fs.writeFileSync(appPath, appContent);
  console.log(`🚀 Version bumped from ${currentVersion} to ${newVersion}`);
  return newVersion;
}

// Deploy to Firestore and update version
async function deploy() {
  try {
    // Check if we need to bump version
    const shouldBump = process.argv.includes('--bump');
    const version = shouldBump ? bumpVersion() : extractAppVersion();
    
    if (!version) {
      console.error('❌ Failed to determine version. Aborting deployment.');
      process.exit(1);
    }
    
    // Initialize Firebase Admin
    initializeApp({
      credential: cert(serviceAccount)
    });
    
    const db = getFirestore();
    
    // Update the version document in Firestore
    await db.collection('config').doc('appVersion').set({
      version,
      releaseDate: new Date(),
      environment: 'production'
    });
    
    console.log(`✅ Firestore version updated to ${version}`);
    
    // Deploy to Firebase
    console.log('🚀 Deploying to Firebase...');
    execSync('firebase deploy', { stdio: 'inherit' });
    
    console.log('✨ Deployment complete!');
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deploy();