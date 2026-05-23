/**
 * Per-entry scoring — the core of the rule engine.
 *
 * All functions here are pure (Firestore-free). They take data in and
 * return evaluated results. Side effects belong in lib/entries.ts.
 *
 * Key design decisions:
 *  - Streak rules produce 0 pts here; streaks are computed in aggregate.ts
 *    where the full member history is available.
 *  - Tracker pts are computed from the entry's raw value every time.
 *    The aggregator is responsible for only crediting the LATEST tracker
 *    entry toward a member's total.
 *  - Weekly cap counts DISTINCT positive dates before the current entry's
 *    date in the current week, not entries. See V2_PLAN edge cases.
 */

import type {
  Challenge,
  Entry,
  Member,
  Rule,
  BinaryRule,
  CounterRule,
  RangeRule,
  PenaltyRule,
  TrackerRule,
} from '../../types';
import type { EvaluatedEntry, EvaluatedRule } from '../../types';
import type { DateString } from '../../types';
import { getWeekWindow } from '../dates';
import { scoreRangeValue } from './ruleDocs';
import {
  countFreePassesUsed,
  countPriorBinaryPositiveDatesInWeek,
  countPriorPenaltyInfractionsInWeek,
} from './kinds';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate all rules for a single entry, returning per-rule breakdowns and
 * a total points sum.
 *
 * @param challenge The challenge — provides rules and weekAnchor.
 * @param entry     The entry being evaluated.
 * @param member    The member who owns the entry — needed for tracker config.
 * @param memberEntries All entries for this member (any order). Used for
 *                  weekly cap counting, free-pass counting, and streak
 *                  reference (streak pts are still 0 here; see aggregate.ts).
 */
export function evaluateEntry(
  challenge: Challenge,
  entry: Entry,
  member: Member,
  memberEntries: Entry[],
): EvaluatedEntry {
  const { weekAnchor } = challenge.config;
  const weekWindow = getWeekWindow(entry.date, weekAnchor);
  const perRule: Record<string, EvaluatedRule> = {};
  let totalPoints = 0;

  // Evaluate non-streak rules first; streak rules are derived and skipped here.
  for (const rule of challenge.config.rules) {
    if (rule.kind === 'streak') {
      perRule[rule.id] = { ruleId: rule.id, rawValue: null, points: 0 };
      continue;
    }

    const result = evaluateRule(rule, entry, member, memberEntries, weekWindow);
    perRule[rule.id] = result;
    totalPoints += result.points;
  }

  return {
    entryId: entry.id,
    date: entry.date,
    memberId: entry.memberId,
    totalPoints,
    perRule,
  };
}

// ---------------------------------------------------------------------------
// Per-kind evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single rule for a single entry.
 * Only call this for non-streak rules.
 */
export function evaluateRule(
  rule: Exclude<Rule, { kind: 'streak' }>,
  entry: Entry,
  member: Member,
  memberEntries: Entry[],
  weekWindow: { start: DateString; end: DateString },
): EvaluatedRule {
  switch (rule.kind) {
    case 'binary':
      return evalBinary(rule, entry, memberEntries, weekWindow);
    case 'counter':
      return evalCounter(rule, entry);
    case 'range':
      return evalRange(rule, entry);
    case 'penalty':
      return evalPenalty(rule, entry, memberEntries, weekWindow);
    case 'tracker':
      return evalTracker(rule, entry, member);
  }
}

// ---------------------------------------------------------------------------
// Binary
// ---------------------------------------------------------------------------

function evalBinary(
  rule: BinaryRule,
  entry: Entry,
  memberEntries: Entry[],
  weekWindow: { start: DateString; end: DateString },
): EvaluatedRule {
  const rawValue = entry.values[rule.id];

  if (rawValue === undefined) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  if (rawValue !== 'yes' && rawValue !== 'no' && rawValue !== 'free') {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  const base =
    rawValue === 'yes' ? rule.pointsYes
    : rawValue === 'free' ? rule.pointsFree
    : rule.pointsNo;

  const notes: string[] = [];
  const usedFreePass = rawValue === 'free';

  // Weekly cap check (only applies to positive-scoring values)
  const isPositive = rawValue === 'yes' || rawValue === 'free';
  if (isPositive && rule.weeklyCap) {
    const priorDays = countPriorBinaryPositiveDatesInWeek(
      rule.id,
      weekWindow.start,
      entry.date,
      memberEntries,
    );
    if (priorDays >= rule.weeklyCap.maxScoringDays) {
      notes.push(
        `${priorDays}/${rule.weeklyCap.maxScoringDays} days this week — capped`,
      );
      return {
        ruleId: rule.id,
        rawValue,
        points: 0,
        cappedFromWeekly: true,
        usedFreePass,
        notes,
      };
    }
    notes.push(`${priorDays + 1}/${rule.weeklyCap.maxScoringDays} days this week`);
  }

  return { ruleId: rule.id, rawValue, points: base, usedFreePass: usedFreePass || undefined };
}

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

function evalCounter(rule: CounterRule, entry: Entry): EvaluatedRule {
  const rawValue = entry.values[rule.id];

  if (rawValue === undefined) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue < 0) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  const pts = Math.min(rule.maxPoints, (rawValue / rule.target) * rule.maxPoints);
  const notes: string[] = [];

  if (rawValue >= rule.target) {
    notes.push(`${rawValue} ${rule.unit} — target hit`);
  } else {
    notes.push(`${rawValue}/${rule.target} ${rule.unit}`);
  }

  return { ruleId: rule.id, rawValue, points: pts, notes };
}

// ---------------------------------------------------------------------------
// Range
// ---------------------------------------------------------------------------

function evalRange(rule: RangeRule, entry: Entry): EvaluatedRule {
  const rawValue = entry.values[rule.id];

  if (rawValue === undefined) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  const inside = rawValue >= rule.min && rawValue <= rule.max;
  let pts: number;
  if (inside) {
    const scaled = scoreRangeValue(rule, rawValue);
    pts = scaled ?? 0;
  } else {
    pts = rule.pointsOutside;
  }
  const notes = inside
    ? [`${rawValue} ${rule.unit} — in band [${rule.min}–${rule.max}]`]
    : [`${rawValue} ${rule.unit} — outside band [${rule.min}–${rule.max}]`];

  return { ruleId: rule.id, rawValue, points: pts, notes };
}

// ---------------------------------------------------------------------------
// Penalty
// ---------------------------------------------------------------------------

function evalPenalty(
  rule: PenaltyRule,
  entry: Entry,
  memberEntries: Entry[],
  weekWindow: { start: DateString; end: DateString },
): EvaluatedRule {
  const rawValue = entry.values[rule.id];

  if (rawValue === undefined) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  if (rawValue !== 'clean' && rawValue !== 'infraction' && rawValue !== 'free') {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  if (rawValue === 'clean') {
    return { ruleId: rule.id, rawValue, points: rule.pointsClean };
  }

  if (rawValue === 'free') {
    return {
      ruleId: rule.id,
      rawValue,
      points: rule.pointsFree,
      usedFreePass: true,
    };
  }

  // rawValue === 'infraction'
  if (rule.weeklyFirstWaived) {
    const priorInfractions = countPriorPenaltyInfractionsInWeek(
      rule.id,
      weekWindow.start,
      entry.date,
      memberEntries,
    );
    if (priorInfractions === 0) {
      return {
        ruleId: rule.id,
        rawValue,
        points: 0,
        waivedFromPenalty: true,
        notes: ['first infraction of the week — waived'],
      };
    }
  }

  return {
    ruleId: rule.id,
    rawValue,
    points: rule.pointsPerInfraction,
    notes: [`${rule.pointsPerInfraction} pts`],
  };
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

function evalTracker(rule: TrackerRule, entry: Entry, member: Member): EvaluatedRule {
  const rawValue = entry.values[rule.id];

  if (rawValue === undefined) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return { ruleId: rule.id, rawValue: null, points: 0 };
  }

  const config = member.trackerConfig;
  if (!config || config.ruleId !== rule.id) {
    // Member has not configured their tracker goal yet.
    return { ruleId: rule.id, rawValue, points: 0, notes: ['tracker goal not set'] };
  }

  const totalChange = Math.abs(config.goalVal - config.startVal);
  if (totalChange === 0) {
    return { ruleId: rule.id, rawValue, points: 0, notes: ['start and goal are equal'] };
  }

  const progress =
    config.direction === 'down'
      ? config.startVal - rawValue    // decreasing: progress = reduction from start
      : rawValue - config.startVal;  // increasing: progress = gain from start

  const pct = Math.min(1, Math.max(0, progress / totalChange));
  const pts = pct * rule.maxPoints;

  const notes = [
    `${Math.round(pct * 100)}% of goal (${rawValue} ${rule.unit})`,
  ];

  return { ruleId: rule.id, rawValue, points: pts, notes };
}

// ---------------------------------------------------------------------------
// Free-pass quota check (for UI display — not scoring)
// ---------------------------------------------------------------------------

/**
 * True if a member has exhausted their lifetime free passes for a binary
 * or penalty rule. Used by the Log UI to disable the free-pass button.
 */
export function isFreePassExhausted(
  rule: BinaryRule | PenaltyRule,
  memberEntries: Entry[],
): boolean {
  if (!rule.freePasses) return true; // no free passes configured → always "exhausted"
  const used = countFreePassesUsed(rule.id, memberEntries);
  return used >= rule.freePasses.count;
}
