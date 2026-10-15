/**
 * Single Firebase entry point for the whole app (native, web, and re-exports).
 *
 * Configuration is read from EXPO_PUBLIC_FIREBASE_* environment variables
 * (see `.env.example`). During local development without a `.env` file the
 * fallback values below keep the app bootable, and a console warning lists
 * any missing variables.
 *
 * IMPORTANT: Firebase Console → Project settings → General → "Your apps"
 * → Web app → SDK setup and configuration contains the authoritative values.
 * Never invent or hand-edit credentials; always copy them from the console.
 *
 * Env access MUST stay as static `process.env.EXPO_PUBLIC_*` property reads —
 * Expo's Metro config inlines these at build time; dynamic access (e.g.
 * `process.env[key]`) would be undefined in production bundles.
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const env = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Fallback values (the previously hard-coded configuration). They keep the
 * app working if EXPO_PUBLIC_ vars are absent, but `.env` should always be
 * the source of truth. Verify these match your Firebase project.
 */
const FALLBACK = {
  apiKey: 
  authDomain: 'unitrack-15d9a.firebaseapp.com',
  projectId: 'unitrack-15d9a',
  storageBucket: 'unitrack-15d9a.appspot.com',
  messagingSenderId: '825646961275',
  appId: '1:825646961275:web:616ed548894c9fccc7c8de',
};

const projectId = env.projectId || FALLBACK.projectId;

const firebaseConfig = {
  apiKey: env.apiKey || FALLBACK.apiKey,
  authDomain: env.authDomain || `${projectId}.firebaseapp.com`,
  projectId,
  // Firebase Storage bucket is the GCS bucket, typically "<project-id>.appspot.com".
  storageBucket: env.storageBucket || `${projectId}.appspot.com`,
  messagingSenderId: env.messagingSenderId || FALLBACK.messagingSenderId,
  appId: env.appId || FALLBACK.appId,
};

if (__DEV__) {
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`);
  if (missing.length > 0) {
    console.warn(
      `[firebaseConfig] Missing env vars: ${missing.join(', ')}. ` +
        'Using fallback values — copy .env.example to .env and fill in your Firebase project values.',
    );
  }
}

// Reuse the existing app on Fast Refresh / double module evaluation.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  // Web build: Firebase manages persistence (localStorage) itself.
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  // Native: persist the session in AsyncStorage.
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws "auth/already-initialized" on Fast Refresh;
    // fall back to the existing instance (which already has persistence).
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
