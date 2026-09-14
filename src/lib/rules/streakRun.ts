/**
 * Current streak-run state for log UI — mirrors aggregate streak logic
 * (positive scoring days only) but scoped to a reference date.
 */

import type { Challenge, DateString, Entry, Member, StreakRule } from '../../types';
import { addDays, diffDays } from '../dates';
import { evaluateEntry } from './evaluate';
import { qualifiesForStreak } from './kinds';

export interface StreakRunState {
  /** Dates in the active run segment (ascending). */
  runDates: DateString[];
  count: number;
  complete: boolean;
  /** Reference rule logged on asOfDate but scored ≤ 0 (slip, no, capped, etc.). */
  brokenOnDate: boolean;
}

export interface StreakSlot {
  date: DateString | null;
  filled: boolean;
  /** Empty slot showing the next calendar day needed in this run. */
  projected: boolean;
}

/** Short label for a streak dot, e.g. "Fri 21". */
export function formatStreakDayLabel(date: DateString): string {
  const d = new Date(date + 'T12:00:00Z');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/**
 * Consecutive positive-scoring days for `streakRule.ruleRef` ending on or before
 * `asOfDate`. Used by streak bands on Log day.
 */
export function getStreakRunAtDate(
  challenge: Challenge,
  member: Member,
  memberEntries: Entry[],
  streakRule: StreakRule,
  asOfDate: DateString,
): StreakRunState {
  const entriesUpTo = memberEntries
    .filter(e => e.date <= asOfDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  const watched = challenge.config.rules.find(r => r.id === streakRule.ruleRef);
  const positiveDates: DateString[] = [];
  let asOfQualifies = false;
  let refLoggedOnAsOf = false;

  for (const entry of entriesUpTo) {
    const ev = evaluateEntry(challenge, entry, member, memberEntries);
    const pts = ev.perRule[streakRule.ruleRef]?.points ?? 0;
    const qualifies = qualifiesForStreak(streakRule, watched, pts);
    if (entry.date === asOfDate) {
      asOfQualifies = qualifies;
      refLoggedOnAsOf = entry.values[streakRule.ruleRef] !== undefined;
    }
    if (qualifies) positiveDates.push(entry.date);
  }

  // Logged the watched rule today but fell short: the run is broken, not paused.
  if (refLoggedOnAsOf && !asOfQualifies) {
    return { runDates: [], count: 0, complete: false, brokenOnDate: true };
  }

  let endDate: DateString | null = null;
  if (asOfQualifies) {
    endDate = asOfDate;
  } else if (positiveDates.length > 0) {
    endDate = positiveDates[positiveDates.length - 1] ?? null;
  }

  if (!endDate) {
    return { runDates: [], count: 0, complete: false, brokenOnDate: false };
  }

  const positiveSet = new Set(positiveDates);
  const fullRun: DateString[] = [endDate];
  while (true) {
    const prev = addDays(fullRun[0]!, -1);
    if (positiveSet.has(prev)) fullRun.unshift(prev);
    else break;
  }

  const { runDates, complete } = segmentRunForDisplay(
    fullRun,
    streakRule.daysRequired,
    streakRule.repeatable,
  );

  return {
    runDates,
    count: runDates.length,
    complete,
    brokenOnDate: false,
  };
}

/** Map a run into N UI slots with optional projected next days. */
export function getStreakSlots(
  run: StreakRunState,
  daysRequired: number,
): StreakSlot[] {
  const slots: StreakSlot[] = [];
  const lastFilled = run.runDates[run.runDates.length - 1];

  for (let i = 0; i < daysRequired; i++) {
    if (i < run.runDates.length) {
      slots.push({ date: run.runDates[i]!, filled: true, projected: false });
    } else if (lastFilled) {
      slots.push({
        date: addDays(lastFilled, i - run.runDates.length + 1),
        filled: false,
        projected: true,
      });
    } else {
      slots.push({ date: null, filled: false, projected: false });
    }
  }
  return slots;
}

function segmentRunForDisplay(
  fullRun: DateString[],
  daysRequired: number,
  repeatable: boolean,
): { runDates: DateString[]; complete: boolean } {
  if (fullRun.length === 0) {
    return { runDates: [], complete: false };
  }

  if (!repeatable) {
    if (fullRun.length >= daysRequired) {
      return {
        runDates: fullRun.slice(0, daysRequired),
        complete: true,
      };
    }
    return { runDates: fullRun, complete: false };
  }

  const cycleLen = fullRun.length % daysRequired;
  if (cycleLen === 0) {
    return {
      runDates: fullRun.slice(-daysRequired),
      complete: true,
    };
  }
  return {
    runDates: fullRun.slice(-cycleLen),
    complete: false,
  };
}

/** True when two streak dates are consecutive calendar days. */
export function areConsecutiveStreakDays(a: DateString, b: DateString): boolean {
  return diffDays(b, a) === 1;
}
