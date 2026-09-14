/**
 * Firebase App Check.
 *
 * Security rules decide what a *signed-in account* may do. App Check is the
 * other half: it attests that a request came from this app at all, rather than
 * from a script hammering the API with a stolen config. The Firebase config in
 * a web bundle is public by design, so without App Check anyone can point their
 * own client at the project and work through whatever the rules permit.
 *
 * It stays off until `VITE_RECAPTCHA_SITE_KEY` is set, because enabling
 * enforcement without a key configured locks the real app out. To turn it on:
 *
 *   1. Firebase console → App Check → register the web app with reCAPTCHA v3.
 *   2. Put the site key in `VITE_RECAPTCHA_SITE_KEY`.
 *   3. Deploy, watch the App Check metrics until verified requests dominate.
 *   4. Only then switch enforcement on for Firestore.
 *
 * Doing step 4 before step 3 takes the app down for everyone still on an old
 * bundle.
 */

import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import { app } from './firebase';

let instance: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (instance) return instance;

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;

  instance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return instance;
}
