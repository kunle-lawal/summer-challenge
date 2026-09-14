import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Mirrors vite.config.ts so tests can import pages by their '@/' alias.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    // Rules tests need the Firestore emulator; they run via `npm run test:rules`.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.rules.test.ts'],
  },
});
