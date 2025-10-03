/// <reference types="vite/client" />

import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth as initAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore as initFirestore,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
  type Firestore,
} from "firebase/firestore";
import { getAnalytics as initAnalytics, isSupported, type Analytics } from "firebase/analytics";

const PLACEHOLDER_PATTERN = /your_.+_here/i;

const ENV_VAR_MAP = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
  measurementId: "VITE_FIREBASE_MEASUREMENT_ID",
} as const;

const REQUIRED_KEYS: Array<keyof typeof ENV_VAR_MAP> = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const sanitizeEnvValue = (value?: string): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) {
    return undefined;
  }
  return trimmed.replace(/,+$/, "");
};

const buildEmulatorConfig = (projectIdHint?: string, measurementId?: string): FirebaseOptions => {
  const projectId = projectIdHint ?? "mitra-local";
  return {
    apiKey: "demo-api-key",
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: "demo-sender-id",
    appId: `demo-app-${projectId}`,
    ...(measurementId ? { measurementId } : {}),
  };
};

const resolveFirebaseConfig = (): { config: FirebaseOptions; useEmulator: boolean } => {
  const resolvedEntries = Object.entries(ENV_VAR_MAP).reduce((acc, [configKey, envKey]) => {
    const sanitized = sanitizeEnvValue(import.meta.env[envKey as keyof ImportMetaEnv]);
    if (sanitized) {
      acc[configKey as keyof typeof ENV_VAR_MAP] = sanitized;
    }
    return acc;
  }, {} as Partial<Record<keyof typeof ENV_VAR_MAP, string>>);

  const missingKeys = REQUIRED_KEYS.filter((key) => !resolvedEntries[key]);
  const shouldUseEmulator = missingKeys.length > 0 && import.meta.env.DEV;

  // Log configuration status (only in development)
  if (import.meta.env.DEV && (missingKeys.length > 0 || !resolvedEntries.projectId)) {
    console.warn("[Firebase Config] Configuration check:", {
      missingKeys: missingKeys.length > 0 ? missingKeys : "none",
      useEmulator: shouldUseEmulator,
      projectId: resolvedEntries.projectId || "NOT SET"
    });
  }

  if (missingKeys.length > 0 && !shouldUseEmulator) {
    const missingEnvVars = missingKeys.map((key) => ENV_VAR_MAP[key]).join(", ");
    console.error("Missing Firebase environment variables:", missingEnvVars);
    throw new Error(`Missing Firebase configuration: ${missingEnvVars}`);
  }

  if (shouldUseEmulator) {
    const missingEnvVars = missingKeys.map((key) => ENV_VAR_MAP[key]).join(", ");
    console.warn(
      `[Firebase] Missing configuration values (${missingEnvVars}). Falling back to Firebase emulators. ` +
        "Provide real config via environment variables to connect to a live project."
    );

    return {
      config: buildEmulatorConfig(resolvedEntries.projectId, resolvedEntries.measurementId),
      useEmulator: true,
    };
  }

  return {
    config: {
      apiKey: resolvedEntries.apiKey!,
      authDomain: resolvedEntries.authDomain!,
      projectId: resolvedEntries.projectId!,
      storageBucket: resolvedEntries.storageBucket!,
      messagingSenderId: resolvedEntries.messagingSenderId!,
      appId: resolvedEntries.appId!,
      ...(resolvedEntries.measurementId ? { measurementId: resolvedEntries.measurementId } : {}),
    },
    useEmulator: false,
  };
};

const { config: firebaseConfig, useEmulator } = resolveFirebaseConfig();

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;
let isFirestoreInitialized = false;

const initializeFirebaseServices = () => {
  if (isFirestoreInitialized) {
    console.warn("Firebase services already initialized");
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
    auth = initAuth(app);

    // Use modern initializeFirestore with cache settings
    if (useEmulator && typeof window !== "undefined") {
      // For emulator, use regular initFirestore to avoid cache conflicts
      db = initFirestore(app);
    } else {
      // For production, use initializeFirestore with cache settings
      try {
        db = initializeFirestore(app, {
          cache: {
            sizeBytes: 100 * 1024 * 1024, // 100MB cache
            tabManager: {
              kind: 'IndexedDB'
            }
          }
        });
      } catch (error) {
        // Fallback to regular initFirestore if initializeFirestore fails
        console.warn("Failed to initialize Firestore with cache, falling back to default:", error);
        db = initFirestore(app);
      }
    }

    isFirestoreInitialized = true;
    console.log("Firebase services initialized successfully");
  } catch (error) {
    console.error("Firebase services initialization failed:", error);
    throw error;
  }
};

try {
  initializeFirebaseServices();

  if (useEmulator && typeof window !== "undefined") {
    const authEmulatorHost = sanitizeEnvValue(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) ?? "http://127.0.0.1:9099";
    const firestoreEmulatorHost = sanitizeEnvValue(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) ?? "127.0.0.1";
    const firestoreEmulatorPort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? 8080);

    try {
      connectAuthEmulator(auth, authEmulatorHost, { disableWarnings: true });
      connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
      console.info(
        `[Firebase] Connected to local emulators (auth: ${authEmulatorHost}, firestore: ${firestoreEmulatorHost}:${firestoreEmulatorPort}).`
      );
    } catch (error) {
      console.warn("Failed to connect to Firebase emulators:", error);
    }
  }

  if (!useEmulator) {
    isSupported()
      .then((supported) => {
        if (supported) {
          analytics = initAnalytics(app);
        } else {
          console.warn("Firebase Analytics not supported in this environment");
        }
      })
      .catch((err) => {
        console.warn("Firebase Analytics initialization failed:", err);
      });
  } else {
    console.info("Firebase Analytics disabled while using emulators");
  }

} catch (error) {
  console.error("Firebase initialization failed:", error);
  // Don't throw error to prevent app from crashing
  // Instead, set up minimal fallback state
  isFirestoreInitialized = false;
}

export const isFirebaseConnected = async (): Promise<boolean> => {
  try {
    if (!isFirestoreInitialized || !db) {
      console.warn("Firebase not properly initialized");
      return false;
    }
    await enableNetwork(db);
    return true;
  } catch (error) {
    console.warn("Firebase connection check failed:", error);
    return false;
  }
};

export const handleFirebaseOffline = async () => {
  try {
    if (!isFirestoreInitialized || !db) {
      console.warn("Firebase not properly initialized, cannot set offline mode");
      return;
    }
    await disableNetwork(db);
    console.log("Firebase set to offline mode");
  } catch (error) {
    console.warn("Failed to set Firebase offline mode:", error);
  }
};

export const handleFirebaseOnline = async () => {
  try {
    if (!isFirestoreInitialized || !db) {
      console.warn("Firebase not properly initialized, cannot set online mode");
      return;
    }
    await enableNetwork(db);
    console.log("Firebase set to online mode");
  } catch (error) {
    console.warn("Failed to set Firebase online mode:", error);
  }
};

// Getter functions to ensure safe access to Firebase services
export const getFirebaseApp = (): FirebaseApp | null => {
  if (!isFirestoreInitialized) {
    console.warn("Firebase app not initialized");
    return null;
  }
  return app;
};

export const getFirebaseAuth = (): Auth | null => {
  if (!isFirestoreInitialized) {
    console.warn("Firebase auth not initialized");
    return null;
  }
  return auth;
};

export const getFirebaseDb = (): Firestore | null => {
  if (!isFirestoreInitialized) {
    console.warn("Firebase database not initialized");
    return null;
  }
  return db;
};

export const getFirebaseAnalytics = (): Analytics | null => {
  return analytics;
};

// Legacy exports for backward compatibility (with safety checks)
export const getApp = () => getFirebaseApp();
export const getAuth = () => getFirebaseAuth();
export const getDb = () => getFirebaseDb();

// Direct exports for cases where we know Firebase is initialized
export { app, auth, analytics, db, useEmulator as isUsingFirebaseEmulator, isFirestoreInitialized };
