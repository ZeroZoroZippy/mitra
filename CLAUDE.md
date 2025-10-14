# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mitra (branded as "Saarth") is a React + TypeScript chat application with Firebase backend that provides an AI companion experience. The AI persona ("Saarth") is inspired by Lord Krishna's wisdom and adapts its personality across different conversation contexts (threads). User messages are encrypted client-side before storage.

## Key Commands

### Development
```bash
npm run dev              # Start Vite dev server (force refresh enabled)
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
```

### Version Management
```bash
npm run bump             # Bump version number
npm run update-version   # Update version without bumping
```

### Firebase Functions (in functions/ directory)
```bash
npm run build            # Compile TypeScript to lib/
npm run build:watch      # Watch mode compilation
npm run serve            # Run local emulators
npm run deploy           # Deploy functions to Firebase
npm run logs             # View function logs
```

## Architecture

### Frontend Structure

**Core Pages:**
- `LandingPage` - Public landing with auth
- `ChatLayout` - Main chat interface with threads
- `ConceptsLayout` - Concept exploration mode
- `AdminDashboard` - Analytics dashboard

**Chat System:**
- Thread-based conversations (threadID 1-7, each with different AI personas)
- Messages stored per-user in Firestore: `users/{userId}/messages`
- Real-time streaming responses from Groq (llama-3.3-70b-versatile model)
- Client-side encryption for user messages using `crypto-js`
- Hook-based architecture: `useChat`, `useMessages`, `useChatAI`, `useGuestUser`

**Authentication Flow:**
- Firebase Auth with Google Sign-In
- Guest mode supported (temporary accounts tracked in `statistics/guestUsage`)
- Protected routes require authentication
- Creator detection via `isCreator()` in `firebaseAuth.ts`

### Backend (Firebase Functions)

**Cloud Functions:**
- `hourlyDataIngestion` - Scheduled aggregation every 60 minutes
- `analyzeMessageSentiment` - Firestore trigger on message creation
- `getTechSummary` - HTTP endpoint for analytics summary
- `testAggregation` - Manual aggregation testing endpoint

**Data Aggregation:**
- Collects from all `messages` subcollections across users
- Stores in `aggregatedAnalytics` collection
- Tracks: message counts, sentiment, peak hours, response times
- Uses simple keyword-based sentiment analysis

### Key Utilities

**Firebase Integration:**
- `firebaseConfig.ts` - Firebase app initialization
- `firebaseAuth.ts` - Auth helpers, creator detection
- `firebaseDb.ts` - Message CRUD, encryption/decryption
- `firebaseConceptDb.ts` - Concept-specific storage

**AI Integration:**
- `getOpenAIChatCompletion.ts` - Groq API client with streaming
- `getOpenAIConceptCompletion.ts` - Groq API client for concept explanations
- System prompts mapped to threadID (1-7 personas)
- Token management: MAX_TOKENS=7500, MAX_MESSAGES=5
- Dynamic token limits per conversation type
- Models: llama-3.3-70b-versatile (chat), llama-3.1-8b-instant (concepts)

**Analytics:**
- `analytics.ts` - Google Analytics 4 + Mixpanel tracking
- `mixpanel.ts` - Mixpanel-specific events

### Environment Variables

Required in `.env`:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_GROQ_API_KEY
VITE_ENCRYPTION_KEY
VITE_MIXPANEL_TOKEN
```

### Version Management

Current version defined in `App.tsx` as `APP_VERSION` constant. Version checking:
- Polls Firestore `config/appVersion` document every 15 minutes
- Shows banner for minor updates, modal for major updates
- Clears service workers on update

### Encryption

- User messages encrypted with AES (CryptoJS)
- Key stored in `VITE_ENCRYPTION_KEY`
- Encrypted messages identified by "U2FsdGVkX1" prefix
- Decryption happens on read

## Important Notes

- The app is deployed via Firebase Hosting (public/ directory)
- Firestore rules in `firestore.rules`, indexes in `firestore.indexes.json`
- Functions use Node.js 22 runtime
- Guest users have message limits tracked in Firestore
- Thread personas (1-7) have distinct tones from "Wise Friend" to "Creative Catalyst"
- Hardcoded responses exist for specific queries in `useChat.ts`
