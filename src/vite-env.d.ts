/// <reference types="vite/client" />

interface ImportMetaEnv {
  // v2 Firebase config
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  // v1 vars — kept until cutover
  readonly VITE_SCRIPT_URL: string;
  readonly VITE_CHALLENGE_START: string;
  readonly VITE_CHALLENGE_END?: string;
  readonly VITE_PEOPLE: string;
  readonly VITE_GOAL_RESET_OPEN: string;
  readonly VITE_GOAL_RESET_CLOSE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
