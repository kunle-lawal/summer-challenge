/**
 * Firebase App Check — stub only.
 *
 * Real reCAPTCHA Enterprise wiring is deferred to a later task.
 * See V2_PLAN §3.6 for the security design intent.
 *
 * TODO(human-review): Wire up reCAPTCHA Enterprise before production launch.
 *   1. Enable App Check in Firebase console (reCAPTCHA Enterprise provider).
 *   2. Import initializeAppCheck + ReCaptchaEnterpriseProvider from 'firebase/app-check'.
 *   3. Call initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true }).
 *   4. Remove this stub.
 */

import type { FirebaseApp } from 'firebase/app';

/**
 * Stub. Calling this now is a no-op; it will become the real App Check
 * initialiser once the reCAPTCHA Enterprise wiring lands.
 */
export function initAppCheck(_app: FirebaseApp): void {
  // no-op until real wiring is added
}
