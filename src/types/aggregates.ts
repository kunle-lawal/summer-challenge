import type { RawEntryValue } from './entry';

/**
 * Computed types — produced by `src/lib/rules/aggregate.ts` and
 * `src/lib/rules/evaluate.ts` from stored Entries. NOT persisted to
 * Firestore.
 *
 * Two layers:
 *   1. EvaluatedRule / EvaluatedEntry: per-entry breakdown, used by the
 *      Log screen and History row details.
 *   2. MemberStanding / Leaderboard: per-member rollups for the
 *      Leaderboard page.
 */

// ---------------------------------------------------------------------------
// Per-entry evaluation
// ---------------------------------------------------------------------------

/**
 * Result of scoring one rule against one entry on one day. Includes
 * provenance flags so the UI can explain WHY a value scored what it did
 * (capped, waived, etc.).
 */
export interface EvaluatedRule {
  ruleId: string;
  /** The raw value as logged, or null if the rule wasn't logged for this day. */
  rawValue: RawEntryValue | null;
  /** Points awarded after caps/waivers. */
  points: number;
  /** Set if the rule would have scored positive but hit its weekly cap. */
  cappedFromWeekly?: boolean;
  /** Set on a penalty rule's first weekly infraction when the waiver applied. */
  waivedFromPenalty?: boolean;
  /** Set on a binary/penalty rule when 'free' was used. */
  usedFreePass?: boolean;
  /** Set on a streak rule when this entry completed the streak. */
  streakCompleted?: boolean;
  /** Human-readable annotations for the UI (e.g. "5/4 days this week — capped"). */
  notes?: string[];
}

/**
 * Per-entry breakdown. `perRule` keys are rule ids; the same ids appear
 * in `Entry.values`, plus any streak rules that resolved on this date.
 */
export interface EvaluatedEntry {
  entryId: string;
  date: string;
  memberId: string;
  totalPoints: number;
  perRule: Record<string, EvaluatedRule>;
}

// ---------------------------------------------------------------------------
// Per-member rollups
// ---------------------------------------------------------------------------

/**
 * One row of the Leaderboard. `perRule` lets the UI show a per-metric
 * breakdown without recomputing entries.
 *
 * Excludes inactive members entirely (V2_PLAN §4.4). A member with no
 * entries still appears with totalPoints=0 if they're active.
 */
export interface MemberStanding {
  memberId: string;
  memberName: string;
  totalPoints: number;
  /** Number of Entries logged. Not unique calendar days unless write-path enforces 1/day. */
  daysLogged: number;
  /** Map of ruleId → total points contributed by that rule. */
  perRule: Record<string, number>;
  /** 1-based rank in the leaderboard. Ties get the same rank, next non-tie skips. */
  rank: number;
}

/**
 * A full leaderboard snapshot. Returned by the aggregator so callers don't
 * have to re-sort or re-rank.
 */
export interface Leaderboard {
  standings: MemberStanding[];
  /** Total number of entries considered across all members. Useful for empty-state checks. */
  totalEntries: number;
  /** Timestamp the leaderboard was computed at (ms epoch). Display-only. */
  computedAt: number;
}

// ---------------------------------------------------------------------------
// Weekly window summary (for log-screen sidebar)
// ---------------------------------------------------------------------------

/**
 * Per-rule weekly usage for one member, for one challenge week. Drives the
 * v1 "Week 3 · Gym: 4/4 · Clean: 5/6" indicator on the Log screen.
 */
export interface WeeklySummary {
  /** 1-based week number from challenge start. */
  weekNumber: number;
  /** Map of ruleId → { used, cap }. cap is null if the rule has no weekly cap. */
  perRule: Record<string, { used: number; cap: number | null }>;
  /** Lifetime free-pass usage by rule id. Same shape as perRule but for free passes. */
  freePassUsage: Record<string, { used: number; cap: number | null }>;
}
