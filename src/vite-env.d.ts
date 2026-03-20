/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCRIPT_URL: string;
  readonly VITE_CHALLENGE_START: string;
  readonly VITE_PEOPLE: string;
  readonly VITE_GOAL_RESET_OPEN: string;
  readonly VITE_GOAL_RESET_CLOSE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
