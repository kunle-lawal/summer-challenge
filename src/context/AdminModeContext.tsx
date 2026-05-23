/**
 * AdminModeContext — per-tab owner authentication state.
 *
 * Admin mode is intentionally weak security (see V2_PLAN §4.3): the password
 * is stored as a SHA-256 hash with salt in the challenge doc. Entering admin
 * mode stores an `AdminSessionState` in sessionStorage so it survives page
 * refreshes within the same tab but dies when the tab closes.
 *
 * Edge cases handled:
 *   - Challenge not yet loaded (challengeId undefined) → `isAdmin` is always
 *     false and `enterAdminMode` is a no-op
 *   - challengeId changes (user navigates to a different challenge) →
 *     previous admin session is cleared; re-authentication required
 *   - Tab closed / sessionStorage cleared → admin mode reset on next mount
 *   - Double-submit guard: `entering` flag prevents concurrent verify calls
 *   - Both `owner.login` and `owner.login_failed` write audit log entries so
 *     the owner can see failed attempts in the audit viewer
 *   - `lastError` cleared on a new enterAdminMode attempt so stale errors
 *     don't persist across retries
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { verifyPassword } from '../lib/ownerAuth';
import { appendAuditLog } from '../lib/audit';
import { LS_KEYS } from '../types';
import type { AdminSessionState } from '../types';

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export type AdminModeError = 'wrong_password' | 'challenge_not_loaded';

export interface AdminModeContextValue {
  /** True when the owner password has been accepted for this tab session. */
  isAdmin: boolean;
  /** True while the password hash verification is in progress. */
  entering: boolean;
  /** Set after a failed attempt; cleared at the start of the next attempt. */
  lastError: AdminModeError | null;
  /**
   * Attempt to enter admin mode by verifying the given password.
   * Writes an audit log entry regardless of success or failure.
   * Pass `currentMemberId` so the audit entry records who was selected.
   */
  enterAdminMode: (password: string, currentMemberId?: string | null) => Promise<void>;
  /** Exit admin mode and clear the session from sessionStorage. */
  exitAdminMode: () => void;
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const AdminModeContext = createContext<AdminModeContextValue | null>(null);

/**
 * Access admin mode state for the current challenge.
 * Must be called inside an `<AdminModeProvider>`.
 */
export function useAdminMode(): AdminModeContextValue {
  const ctx = useContext(AdminModeContext);
  if (!ctx) throw new Error('useAdminMode must be used inside <AdminModeProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Props {
  /**
   * Firestore document ID of the current challenge. Pass `null` or `undefined`
   * while the challenge is still loading — admin mode stays false.
   */
  challengeId: string | null | undefined;
  /** From the challenge doc — used to verify the entered password. */
  ownerPasswordHash: string | null | undefined;
  /** From the challenge doc — used to verify the entered password. */
  ownerPasswordSalt: string | null | undefined;
  children: ReactNode;
}

/**
 * Manages owner admin mode state for a single challenge.
 * Admin session lives in sessionStorage: survives page refresh, dies with tab.
 */
export function AdminModeProvider({
  challengeId,
  ownerPasswordHash,
  ownerPasswordSalt,
  children,
}: Props) {
  // Initialise from sessionStorage — admin mode survives a page refresh.
  const [isAdmin, setIsAdmin] = useState<boolean>(() =>
    challengeId ? readSession(challengeId) !== null : false,
  );
  const [entering, setEntering] = useState(false);
  const [lastError, setLastError] = useState<AdminModeError | null>(null);

  // When the challenge changes (e.g. user navigates to a different challenge),
  // clear admin mode — the new challenge requires its own password.
  useEffect(() => {
    if (!challengeId) {
      setIsAdmin(false);
      return;
    }
    // Check if there is already a valid session for this specific challenge.
    setIsAdmin(readSession(challengeId) !== null);
    setLastError(null);
  }, [challengeId]);

  const enterAdminMode = useCallback(
    async (password: string, currentMemberId: string | null | undefined = null) => {
      if (entering) return; // double-submit guard

      if (!challengeId || !ownerPasswordHash || !ownerPasswordSalt) {
        setLastError('challenge_not_loaded');
        return;
      }

      setEntering(true);
      setLastError(null);

      try {
        const correct = await verifyPassword(password, ownerPasswordHash, ownerPasswordSalt);

        // Write audit log entry — always, regardless of outcome.
        const batch = writeBatch(db);
        appendAuditLog(batch, challengeId, {
          actor: { memberId: currentMemberId ?? null, isOwner: correct },
          action: correct ? 'owner.login' : 'owner.login_failed',
          target: { kind: 'challenge', id: challengeId },
          before: null,
          after: null,
        });
        // Fire-and-forget: don't block the UI on the audit write.
        batch.commit().catch(err => {
          console.error('[AdminModeContext] Failed to write audit log:', err);
        });

        if (correct) {
          const session: AdminSessionState = {
            challengeId,
            enteredAt: Date.now(),
          };
          try {
            sessionStorage.setItem(
              LS_KEYS.adminSessionPrefix + challengeId,
              JSON.stringify(session),
            );
          } catch {
            // sessionStorage blocked (e.g. private browsing) — admin mode still
            // works in-memory for this render cycle, just won't survive refresh.
          }
          setIsAdmin(true);
        } else {
          setLastError('wrong_password');
        }
      } finally {
        setEntering(false);
      }
    },
    [challengeId, ownerPasswordHash, ownerPasswordSalt, entering],
  );

  const exitAdminMode = useCallback(() => {
    if (challengeId) {
      try {
        sessionStorage.removeItem(LS_KEYS.adminSessionPrefix + challengeId);
      } catch {
        // ignore storage errors
      }
    }
    setIsAdmin(false);
    setLastError(null);
  }, [challengeId]);

  const value: AdminModeContextValue = {
    isAdmin,
    entering,
    lastError,
    enterAdminMode,
    exitAdminMode,
  };

  return (
    <AdminModeContext.Provider value={value}>
      {children}
    </AdminModeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSession(challengeId: string): AdminSessionState | null {
  try {
    const raw = sessionStorage.getItem(LS_KEYS.adminSessionPrefix + challengeId);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSessionState;
  } catch {
    return null;
  }
}
