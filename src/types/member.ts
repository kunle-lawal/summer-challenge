import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Tracker direction
// ---------------------------------------------------------------------------

export const TRACKER_DIRECTIONS = ['up', 'down'] as const;
export type TrackerDirection = (typeof TRACKER_DIRECTIONS)[number];

// ---------------------------------------------------------------------------
// Per-member tracker setup
// ---------------------------------------------------------------------------

/**
 * A member's personalized start, goal, and direction for the challenge's
 * tracker rule. Optional because:
 *   - the challenge may not have a tracker rule at all
 *   - the member may not have set their goal yet (they exist but tracker
 *     pts are 0 until they configure this)
 *
 * v1 used a separate `profile` collection for this. In v2 it's a sub-field
 * on the member doc, since we cap trackers at one per challenge (V2_PLAN
 * §3.4). If we ever lift that cap, this becomes
 * `trackerConfigs: Record<ruleId, MemberTrackerConfig>`.
 */
export interface MemberTrackerConfig {
  /** ID of the tracker rule this config applies to. Sanity check on read. */
  ruleId: string;
  /** Member-defined label, e.g. "Weight loss", "Squat 1RM", "Waist". */
  label?: string;
  /** Display unit for this member's metric (falls back to rule default). */
  unit?: string;
  /** Starting baseline value (e.g. starting weight). */
  startVal: number;
  /** Target value (e.g. goal weight). */
  goalVal: number;
  /**
   * 'down' = improvement is decreasing (weight loss, mile time).
   * 'up' = improvement is increasing (pushup count, miles run).
   */
  direction: TrackerDirection;
  /**
   * When the member locked in their start/goal. After this, the member
   * can log daily values; the goal itself is locked from further edits
   * by the member. Owner can still change it via admin (audit-logged).
   */
  lockedAt: Timestamp;
}

/** Resolve label/unit on configs saved before those fields existed. */
export function resolveTrackerConfig(
  config: MemberTrackerConfig,
  ruleDefaultUnit: string,
  ruleName: string,
): Required<Pick<MemberTrackerConfig, 'label' | 'unit'>> & MemberTrackerConfig {
  return {
    ...config,
    label: config.label?.trim() || ruleName,
    unit: config.unit?.trim() || ruleDefaultUnit,
  };
}

// ---------------------------------------------------------------------------
// Member document
// ---------------------------------------------------------------------------

/**
 * Document at `challenges/{cid}/members/{mid}`. Represents one participant.
 *
 * IMPORTANT: There is no global "user" concept. A real human is a different
 * Member record in every challenge they join. The `name` is unique within
 * one challenge but means nothing across challenges.
 */
export interface Member {
  /** Firestore document id within the members subcollection. */
  id: string;
  /**
   * Display name. Unique within the parent challenge (case-insensitive
   * comparison enforced at write time). Renaming to a taken name is
   * blocked — see V2_PLAN §3.6.
   */
  name: string;
  createdAt: Timestamp;
  /**
   * False after owner-initiated removal. Entries are NOT deleted, but
   * the member is hidden from the picker and excluded from the
   * leaderboard. See V2_PLAN §4.4.
   */
  active: boolean;
  /** Set when `active` flipped to false. Null while active. */
  removedAt: Timestamp | null;
  /** Optional tracker setup. Required to earn tracker pts but otherwise OK to omit. */
  trackerConfig?: MemberTrackerConfig | null;
}
