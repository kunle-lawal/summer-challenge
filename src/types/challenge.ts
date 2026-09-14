import type { Timestamp } from 'firebase/firestore';
import type { Rule } from './rule';

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const CHALLENGE_STATUSES = ['active', 'ended'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Calendar date strings
// ---------------------------------------------------------------------------

/**
 * Calendar date in 'YYYY-MM-DD' form. Used for `startDate`, `endDate`,
 * `weekAnchor`, and `Entry.date`. v1 used the same convention.
 *
 * This is a brand for documentation only; TS doesn't enforce the format.
 * Runtime parsing/validation lives in `src/lib/dates.ts`.
 */
export type DateString = string;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * The mutable knobs of a challenge. Stored as a sub-object on the Challenge
 * doc so that editing config in one transaction is straightforward.
 */
export interface ChallengeConfig {
  /** First day the challenge accepts logs. */
  startDate: DateString;
  /**
   * Last day the challenge accepts logs. `null` = open-ended; status must
   * be flipped manually to `'ended'` to lock. When set, the client treats
   * any date past endDate as ended (and writes status='ended' on first
   * detection — or we leave it active and just disable inputs; see V2_PLAN
   * §3.5).
   */
  endDate: DateString | null;
  /**
   * Anchor for the weekly window. Week 0 starts on this date; subsequent
   * weeks are 7-day periods from it. NOT ISO Monday-anchored — v1 parity.
   * Typically equals `startDate`.
   */
  weekAnchor: DateString;
  /**
   * IANA timezone the challenge operates in. All "today" / "yesterday"
   * comparisons use this. v1 used implicit browser-local time, which
   * caused bugs for cross-timezone challenges; v2 makes it explicit.
   */
  timezone: string;
  /** The rule set. Order in this array is independent of `Rule.order`. */
  rules: Rule[];
}

// ---------------------------------------------------------------------------
// Challenge document
// ---------------------------------------------------------------------------

/**
 * Top-level document at `challenges/{id}`. The slug used in URLs is stored
 * here AND mirrored at `slugIndex/{slug}` for fast lookup.
 */
export interface Challenge {
  /** Firestore document id. Distinct from `slug`. */
  id: string;
  /**
   * URL slug — 6-char base32 by default. Auto-generated at create time,
   * immutable in v1 (no vanity rename). See V2_PLAN §3.3.
   */
  slug: string;
  /** Display name set by the creator. Editable by owner. */
  name: string;
  createdAt: Timestamp;
  status: ChallengeStatus;
  /**
   * The account that created this challenge. The only thing that grants admin.
   *
   * Replaces the v2 owner password, which was neither a secret (the hash was
   * world-readable) nor a lock (the hash was world-writable). Ownership is now
   * an identity the security rules can actually check, and it is immutable
   * after creation.
   */
  ownerUid: string;
  config: ChallengeConfig;
}

// ---------------------------------------------------------------------------
// Slug index (top-level collection, separate from challenges)
// ---------------------------------------------------------------------------

/**
 * Document at `slugIndex/{slug}` with a single `challengeId` field.
 * Resolves `/c/:slug` → challenge document id in one read.
 */
export interface SlugIndexEntry {
  challengeId: string;
}
