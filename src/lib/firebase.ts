/**
 * Firebase app + Firestore initialisation.
 *
 * All configuration comes from VITE_FIREBASE_* environment variables —
 * never hard-code credentials. See V2_PLAN §10.2 for the full list.
 *
 * The `getApps()` guard prevents double-initialisation under Vite HMR,
 * which reloads modules on save.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

/** The initialised Firebase app instance. */
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** The Firestore database instance for all read/write operations. */
export const db = getFirestore(app);
