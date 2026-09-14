/**
 * Sign-in.
 *
 * Every Firestore rule requires `request.auth`, so an account is a hard
 * precondition for using the app at all — not a feature layered on top.
 *
 * Google works as soon as it's enabled in the Firebase console. Apple needs an
 * Apple Developer account, a Services ID and a signing key configured there
 * first; until that's done `APPLE_ENABLED` stays false and the button is
 * hidden rather than shown and broken. Apple only *requires* Sign in with
 * Apple once the iOS app offers another social login, so this can wait for the
 * native build.
 */

import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

export type Provider = 'google' | 'apple';

/** Flip once Apple is configured in the Firebase console. */
export const APPLE_ENABLED = false;

export type SignInResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'cancelled' | 'popup_blocked' | 'unavailable' | 'failed'; message: string };

function providerFor(provider: Provider) {
  if (provider === 'google') return new GoogleAuthProvider();
  const apple = new OAuthProvider('apple.com');
  apple.addScope('name');
  apple.addScope('email');
  return apple;
}

/**
 * A popup keeps the user on the page, which matters because they usually
 * arrive on a challenge link and we want to land them back on it. Popups get
 * blocked often enough that the redirect fallback is not optional.
 */
export async function signIn(provider: Provider): Promise<SignInResult> {
  try {
    const credential: UserCredential = await signInWithPopup(auth, providerFor(provider));
    return { ok: true, user: credential.user };
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { ok: false, reason: 'cancelled', message: 'Sign-in was cancelled.' };
    }

    if (code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, providerFor(provider));
        return { ok: false, reason: 'popup_blocked', message: 'Redirecting you to sign in…' };
      } catch {
        return { ok: false, reason: 'failed', message: 'Couldn’t open the sign-in window.' };
      }
    }

    if (code === 'auth/operation-not-allowed') {
      return {
        ok: false,
        reason: 'unavailable',
        message: 'That sign-in method isn’t switched on for this app yet.',
      };
    }

    return {
      ok: false,
      reason: 'failed',
      message: 'Sign-in didn’t go through. Check your connection and try again.',
    };
  }
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}
