import { defineConfig } from 'vitest/config';

/**
 * Security-rules tests. Separate from the app suite because they need the
 * Firestore emulator running — see `npm run test:rules`, which starts it.
 */
export default defineConfig({
  test: {
    include: ['firestore.rules.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
