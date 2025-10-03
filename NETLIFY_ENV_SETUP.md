# Netlify Environment Variables Setup Guide

## ⚠️ Important Issues Found

Your Netlify build log shows **duplicate environment variables** with incorrect naming:
- `VITE_FIREBASE_FIREBASE_STORAGE_BUCKET` ❌ (REMOVE THIS - has duplicate "FIREBASE")
- `VITE_FIREBASE_STORAGE_BUCKET` ✅ (KEEP THIS)

## 📋 Required Environment Variables for Netlify

Go to your Netlify dashboard → Site settings → Environment variables

### Firebase Configuration (PUBLIC - Safe to expose)

```
VITE_FIREBASE_API_KEY=AIzaSyAag0C_xzFpylDSv89eIo3e9B1r_5rwfFs
VITE_FIREBASE_AUTH_DOMAIN=mitra-a531e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mitra-a531e
VITE_FIREBASE_STORAGE_BUCKET=mitra-a531e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=375657398776
VITE_FIREBASE_APP_ID=1:375657398776:web:05f9d4813a60fd518b560d
VITE_FIREBASE_MEASUREMENT_ID=G-1TN0BWWHD8
```

### Application Secrets (PRIVATE - Keep secure)

```
VITE_ENCRYPTION_KEY=ASDFGHJKL:QWERTYUIOP:ZXCVBNM
VITE_OPENAI_API_KEY=sk-proj-[YOUR_NEW_API_KEY_HERE]
VITE_GROQ_API_KEY=[YOUR_GROQ_KEY_IF_USING]
VITE_GROQ_CONCEPT_API_KEY=[YOUR_GROQ_CONCEPT_KEY_IF_USING]
```

### Analytics (PUBLIC)

```
VITE_MIXPANEL_TOKEN=57870ea7389a7ac2304130f5b8a15b83
```

## 🔧 Steps to Fix Netlify Deployment

### 1. Clean Up Duplicate Environment Variables

In Netlify Dashboard:
1. Go to: **Site settings** → **Environment variables**
2. **Delete** `VITE_FIREBASE_FIREBASE_STORAGE_BUCKET` (the one with double "FIREBASE")
3. **Keep** `VITE_FIREBASE_STORAGE_BUCKET`

### 2. Verify All Environment Variables

Make sure you have ALL the variables listed above set in Netlify. Missing variables will cause the build to fail.

### 3. Check OAuth Client ID (Optional)

The build log shows `VITE_FIREBASE_OAUTH_CLIENT_ID` but this is not in your current config. You can either:
- Remove it from Netlify if not needed
- Add it to your `.env.production` if required for Google Sign-In

### 4. Trigger Redeploy

After fixing the environment variables:
1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Clear cache and deploy site**

## 📖 Why Firebase Config is Public

Firebase client configuration values are **designed to be public**:
- They identify your Firebase project
- Security is handled by Firebase Security Rules, not by hiding config
- Reference: https://firebase.google.com/docs/projects/api-keys

Only keep these as **secrets**:
- `VITE_ENCRYPTION_KEY` (for encrypting user messages)
- `VITE_OPENAI_API_KEY` (costs money if exposed)
- `VITE_GROQ_API_KEY` (if using Groq as backup)

## ✅ After Deployment Succeeds

1. Test your production site at your Netlify URL
2. Verify Firebase authentication works
3. Test sending messages with OpenAI
4. Check browser console for any errors

## 🚨 Security Reminders

1. **NEVER commit** `.env.production` to git (it's in .gitignore)
2. **Revoke old OpenAI keys** that were accidentally exposed
3. **Rotate encryption key** if it was ever committed to git
4. Use Netlify's environment variables UI for all production secrets
