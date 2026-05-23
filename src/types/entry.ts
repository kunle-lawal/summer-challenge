import type { Timestamp } from 'firebase/firestore';
import type { DateString } from './challenge';
import type { Rule } from './rule';

// ---------------------------------------------------------------------------
// Per-kind value types
// ---------------------------------------------------------------------------

/**
 * Binary rule value. 'free' uses a free pass from the rule's quota.
 *
 * Maps to v1's gym field: 'went' | 'skip' | 'free-gym'.
 */
export type BinaryEntryValue = 'yes' | 'no' | 'free';

/**
 * Penalty rule value. 'clean' = good day, 'infraction' = bad thing happened,
 * 'free' = used a free pass to avoid the penalty.
 *
 * Maps to v1's junk field: 'clean' | 'ate' | 'free-junk'.
 */
export type PenaltyEntryValue = 'clean' | 'infraction' | 'free';

/**
 * Counter, range, and tracker rules all store a raw number.
 *
 * Negative values are NOT auto-rejected here — validation belongs in
 * `src/lib/rules/validate.ts`. A counter shouldn't accept negatives, but a
 * tracker measuring "change since yesterday" theoretically could.
 */
export type NumericEntryValue = number;

/**
 * The raw value stored against a rule id inside `Entry.values`.
 * Streak rules never appear here — they are derived during aggregation.
 *
 * Interpretation is positional: the code reading an entry must look up the
 * corresponding rule's `kind` to know whether 'yes' or 7.5 makes sense.
 * See `entryValueIsValidForRule` below for runtime checking.
 */
export type RawEntryValue =
  | BinaryEntryValue
  | PenaltyEntryValue
  | NumericEntryValue;

// ---------------------------------------------------------------------------
// Entry document
// ---------------------------------------------------------------------------

/**
 * Document at `challenges/{cid}/entries/{eid}`. One entry per
 * (member, date) — uniqueness enforced by the write path, not by id.
 *
 * `pts` is a snapshot, recomputed and rewritten on every save/edit. It
 * exists so the leaderboard can sort without re-evaluating every entry.
 * If scoring logic changes, old entries can become stale until re-saved —
 * see V2_PLAN §9.1.
 */
export interface Entry {
  /** Firestore document id. */
  id: string;
  /** Member this entry belongs to. */
  memberId: string;
  /** Calendar date in challenge timezone, 'YYYY-MM-DD'. */
  date: DateString;
  /**
   * Map of ruleId → raw value. Rules not present here were not logged for
   * this day. Streak rules never appear (derived). A missing rule does not
   * award negative points — it's treated as "no data."
   */
  values: Record<string, RawEntryValue>;
  /** Computed total points for this entry, snapshot at last save. */
  pts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /**
   * The memberId that was cached as "logged in" on the device performing
   * the action. May not equal `memberId` since anyone with the URL can
   * edit anyone's data — this is the audit trail. Null on owner-admin
   * edits where no member is selected. See V2_PLAN §8.2.
   */
  createdByMemberId: string | null;
}

// ---------------------------------------------------------------------------
// Runtime validation
// ---------------------------------------------------------------------------

/**
 * True iff `value` is a plausible RawEntryValue for the given rule's kind.
 * Does NOT check semantic validity (e.g. counter value in range) — only
 * structural shape. Use alongside semantic validators in lib/rules/.
 */
export const entryValueIsValidForRule = (
  rule: Rule,
  value: unknown,
): value is RawEntryValue => {
  switch (rule.kind) {
    case 'binary':
      return value === 'yes' || value === 'no' || value === 'free';
    case 'penalty':
      return value === 'clean' || value === 'infraction' || value === 'free';
    case 'counter':
    case 'range':
    case 'tracker':
      return typeof value === 'number' && Number.isFinite(value);
    case 'streak':
      // Streak rules should never have entry values.
      return false;
  }
};
