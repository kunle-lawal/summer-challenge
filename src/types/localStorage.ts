/**
 * Shapes for browser-cached state. None of this is in Firestore.
 *
 * Keying convention:
 *   localStorage  → durable across sessions
 *   sessionStorage → per-tab admin mode only
 *
 * The `LS_KEYS` map below is the single source of truth for storage keys.
 * Importing the constant rather than typing keys inline keeps us safe from
 * typos when keys appear in multiple modules.
 */

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export const LS_KEYS = {
  /**
   * Selected member per challenge. Full key is `selected:${slug}`.
   * Value: memberId string.
   */
  selectedMemberPrefix: 'sc:selected:',
  /** Recent challenges list — array of RecentChallenge. */
  recentChallenges: 'sc:recent',
  /** Create cooldown — CreateCooldownState. */
  createCooldown: 'sc:create-cooldown',
  /**
   * Admin mode (sessionStorage, NOT localStorage). Full key is
   * `admin:${challengeId}`. Value: AdminSessionState.
   */
  adminSessionPrefix: 'sc:admin:',
} as const;

// ---------------------------------------------------------------------------
// Recent challenges
// ---------------------------------------------------------------------------

/**
 * One entry in the recent-challenges list. Used by:
 *   - `/` root redirect (most-recent wins)
 *   - the challenge switcher dropdown in the top bar
 *
 * The list is capped (e.g. 10) to keep localStorage small. Trim policy
 * lives in `src/lib/recentChallenges.ts`.
 */
export interface RecentChallenge {
  slug: string;
  /** Name at last visit. May be stale if the owner has since renamed. */
  name: string;
  /** Epoch ms of last visit. */
  lastVisitedAt: number;
}

// ---------------------------------------------------------------------------
// Create cooldown
// ---------------------------------------------------------------------------

/**
 * Anti-spam state. The Create wizard checks this on mount; if
 * `lastCreatedAt` is within the cooldown window (1 hour per V2_PLAN §3.6),
 * the form shows a "try again in N minutes" notice. Bypassable by clearing
 * storage — real enforcement is Firebase App Check.
 */
export interface CreateCooldownState {
  /** Epoch ms of last successful challenge creation on this device. */
  lastCreatedAt: number;
}

// ---------------------------------------------------------------------------
// Admin session (sessionStorage)
// ---------------------------------------------------------------------------

/**
 * Owner admin mode state — kept in sessionStorage so it dies with the
 * tab. NOT localStorage: we want admin to require re-authentication
 * after closing the browser, even on a trusted device.
 */
export interface AdminSessionState {
  /** Challenge this admin session belongs to. */
  challengeId: string;
  /** Epoch ms when the password was successfully entered. */
  enteredAt: number;
}
