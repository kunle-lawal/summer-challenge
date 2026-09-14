/**
 * Kind-specific helpers for the rule engine.
 *
 * All functions here are pure — no Firestore, no side effects. They take
 * arrays of Entry and return counts used by evaluate.ts for cap checking
 * and waiver logic.
 */

import type { Rule, BinaryRule, CounterRule, RangeRule, PenaltyRule, TrackerRule } from '../../types';
import type { Entry, RawEntryValue } from '../../types';
import type { DateString } from '../../types';

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export type KindValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * Validate a raw entry value for semantic correctness beyond the structural
 * type check in `entryValueIsValidForRule`. Throws on programmer errors
 * (unknown rule kind). Returns a validation object for user-facing errors.
 */
export function validateEntryValue(rule: Rule, value: RawEntryValue): KindValidationResult {
  switch (rule.kind) {
    case 'binary':
      return validateBinary(rule, value);
    case 'counter':
      return validateCounter(rule, value);
    case 'range':
      return validateRange(rule, value);
    case 'penalty':
      return validatePenalty(rule, value);
    case 'streak':
      return { valid: false, reason: 'streak rules do not accept entry values' };
    case 'tracker':
      return validateTracker(rule, value);
  }
}

function validateBinary(_rule: BinaryRule, value: RawEntryValue): KindValidationResult {
  if (value !== 'yes' && value !== 'no' && value !== 'free') {
    return { valid: false, reason: `expected 'yes', 'no', or 'free'; got ${String(value)}` };
  }
  return { valid: true };
}

function validateCounter(rule: CounterRule, value: RawEntryValue): KindValidationResult {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { valid: false, reason: 'counter value must be a finite number' };
  }
  if (value < 0) {
    return { valid: false, reason: `${rule.name} cannot be negative` };
  }
  return { valid: true };
}

function validateRange(rule: RangeRule, value: RawEntryValue): KindValidationResult {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { valid: false, reason: 'range value must be a finite number' };
  }
  if (value < 0) {
    return { valid: false, reason: `${rule.name} cannot be negative` };
  }
  return { valid: true };
}

function validatePenalty(_rule: PenaltyRule, value: RawEntryValue): KindValidationResult {
  if (value !== 'clean' && value !== 'infraction' && value !== 'free') {
    return { valid: false, reason: `expected 'clean', 'infraction', or 'free'; got ${String(value)}` };
  }
  return { valid: true };
}

function validateTracker(rule: TrackerRule, value: RawEntryValue): KindValidationResult {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { valid: false, reason: 'tracker value must be a finite number' };
  }
  if (value < 0) {
    return { valid: false, reason: `${rule.name} cannot be negative` };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Free-pass counters
// ---------------------------------------------------------------------------

/**
 * Count how many times a member has used a free pass for a given rule across
 * ALL entries (lifetime). Binary free = 'free'; penalty free = 'free'.
 */
export function countFreePassesUsed(ruleId: string, entries: Entry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.values[ruleId] === 'free') count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Weekly cap helpers (binary rules only)
// ---------------------------------------------------------------------------

/**
 * Count the number of DISTINCT positive-scoring dates for a binary rule in
 * the range [weekStart, beforeDate). 'yes' and 'free' both count as positive.
 *
 * Used by the weekly cap check: if this count >= maxScoringDays, the current
 * entry is capped.
 *
 * "Distinct dates" matches the spec edge case: re-saving the same day must
 * not double-count toward the cap.
 */
export function countPriorBinaryPositiveDatesInWeek(
  ruleId: string,
  weekStart: DateString,
  beforeDate: DateString,
  entries: Entry[],
): number {
  const positiveDates = new Set<string>();
  for (const entry of entries) {
    if (entry.date >= weekStart && entry.date < beforeDate) {
      const val = entry.values[ruleId];
      if (val === 'yes' || val === 'free') {
        positiveDates.add(entry.date);
      }
    }
  }
  return positiveDates.size;
}

// ---------------------------------------------------------------------------
// Weekly infraction helpers (penalty rules only)
// ---------------------------------------------------------------------------

/**
 * Count infractions (value === 'infraction', NOT free passes) for a penalty
 * rule in the range [weekStart, beforeDate).
 *
 * Used by the weeklyFirstWaived check: if 0 prior infractions, the current
 * infraction is the first of the week and is waived.
 */
export function countPriorPenaltyInfractionsInWeek(
  ruleId: string,
  weekStart: DateString,
  beforeDate: DateString,
  entries: Entry[],
): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.date >= weekStart && entry.date < beforeDate) {
      if (entry.values[ruleId] === 'infraction') count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Free-pass availability (for the log UI)
// ---------------------------------------------------------------------------

/**
 * What the log screen needs to show and gate a free pass.
 *
 * `left` is what a member can still spend. When `excludeDate` is given, a pass
 * already spent on that date is not counted as used — otherwise re-opening a
 * day you spent a pass on would show one fewer remaining than you actually
 * have, and re-picking it would look like it cost you a second pass.
 */
export interface FreePassState {
  /** True when this rule offers free passes at all. */
  offered: boolean;
  /** Lifetime quota, or null when none is configured. */
  quota: number | null;
  /** Passes spent, ignoring `excludeDate`. */
  used: number;
  /** Passes still available. */
  left: number;
  /** True when the member is currently spending one on `excludeDate`. */
  spentOnDate: boolean;
}

const NO_FREE_PASSES: FreePassState = {
  offered: false,
  quota: null,
  used: 0,
  left: 0,
  spentOnDate: false,
};

export function getFreePassState(
  rule: Rule,
  memberEntries: readonly Entry[],
  excludeDate?: DateString,
): FreePassState {
  if (rule.kind !== 'binary' && rule.kind !== 'penalty') return NO_FREE_PASSES;

  const quota = rule.freePasses?.count ?? null;
  if (quota === null || quota <= 0) return NO_FREE_PASSES;

  let used = 0;
  let spentOnDate = false;
  for (const entry of memberEntries) {
    if (entry.values[rule.id] !== 'free') continue;
    if (excludeDate !== undefined && entry.date === excludeDate) {
      spentOnDate = true;
      continue;
    }
    used++;
  }

  return {
    offered: true,
    quota,
    used,
    left: Math.max(0, quota - used),
    spentOnDate,
  };
}
