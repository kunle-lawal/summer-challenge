/**
 * Timezone-aware date math for the challenge engine.
 *
 * All "date" values in the system are YYYY-MM-DD strings scoped to the
 * challenge's IANA timezone. This module provides the primitives that the
 * rule engine and CRUD layer build on.
 *
 * Invariants:
 *  - YYYY-MM-DD arithmetic is pure calendar math (UTC midnight) and is
 *    safe across DST transitions.
 *  - "Today" / "yesterday" comparisons always use the challenge timezone,
 *    never the browser's local time.
 */

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { DateString } from '../types';

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a UTC Date as YYYY-MM-DD in the given IANA timezone.
 * This is the canonical way to get a calendar date for display or comparison.
 */
export function formatInTz(date: Date, timezone: string): DateString {
  return format(toZonedTime(date, timezone), 'yyyy-MM-dd');
}

// ---------------------------------------------------------------------------
// "Now" helpers (accept optional `now` for testing)
// ---------------------------------------------------------------------------

/**
 * Get today's calendar date (YYYY-MM-DD) in the given IANA timezone.
 * Pass `now` to override the current time — useful in unit tests.
 */
export function todayInTz(timezone: string, now: Date = new Date()): DateString {
  return formatInTz(now, timezone);
}

/**
 * Get yesterday's calendar date (YYYY-MM-DD) in the given IANA timezone.
 * Pass `now` to override the current time — useful in unit tests.
 */
export function yesterdayInTz(timezone: string, now: Date = new Date()): DateString {
  return addDays(todayInTz(timezone, now), -1);
}

// ---------------------------------------------------------------------------
// Calendar arithmetic (timezone-safe)
// ---------------------------------------------------------------------------

/**
 * Add N calendar days to a YYYY-MM-DD string. N may be negative.
 * Uses UTC midnight arithmetic, which is invariant across DST changes.
 */
export function addDays(date: DateString, n: number): DateString {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Difference in calendar days between two YYYY-MM-DD strings (a − b).
 * Positive when a is later than b.
 */
export function diffDays(a: DateString, b: DateString): number {
  const msA = new Date(a + 'T00:00:00Z').getTime();
  const msB = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((msA - msB) / 86_400_000);
}

/**
 * Lexicographic comparison of two YYYY-MM-DD strings.
 * Returns -1 if a is earlier, 0 if equal, 1 if a is later.
 */
export function compareDates(a: DateString, b: DateString): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Log date eligibility
// ---------------------------------------------------------------------------

export interface LogDateBounds {
  startDate: DateString;
  endDate: DateString | null;
}

/**
 * True when `date` can be logged or edited: on or after `startDate`, on or
 * before today (challenge timezone), and on or before `endDate` when set.
 * Ended-challenge checks are handled at the CRUD layer.
 */
export function isWithinEditWindow(
  date: DateString,
  timezone: string,
  bounds: LogDateBounds,
  now: Date = new Date(),
): boolean {
  const today = todayInTz(timezone, now);
  if (date < bounds.startDate) return false;
  if (date > today) return false;
  if (bounds.endDate !== null && date > bounds.endDate) return false;
  return true;
}

/**
 * True if `date` is today in the challenge timezone.
 */
export function isToday(date: DateString, timezone: string, now: Date = new Date()): boolean {
  return date === todayInTz(timezone, now);
}

/**
 * True if `date` is yesterday in the challenge timezone.
 */
export function isYesterday(date: DateString, timezone: string, now: Date = new Date()): boolean {
  return date === yesterdayInTz(timezone, now);
}

// ---------------------------------------------------------------------------
// Week windows (weekAnchor-based, not ISO Monday-anchored)
// ---------------------------------------------------------------------------

/**
 * Get the 1-based challenge week number for a date.
 * Week 1 starts on `weekAnchor`; each subsequent week is 7 days later.
 * Returns 0 for dates before the anchor.
 */
export function getWeekNumber(date: DateString, weekAnchor: DateString): number {
  const d = diffDays(date, weekAnchor);
  if (d < 0) return 0;
  return Math.floor(d / 7) + 1;
}

/**
 * Get the start and end YYYY-MM-DD of the challenge week that contains
 * `date`, anchored to `weekAnchor`. Dates before the anchor are treated as
 * belonging to week 1.
 */
export function getWeekWindow(
  date: DateString,
  weekAnchor: DateString,
): { start: DateString; end: DateString } {
  const weekNum = Math.max(1, getWeekNumber(date, weekAnchor));
  const start = addDays(weekAnchor, (weekNum - 1) * 7);
  return { start, end: addDays(start, 6) };
}

// ---------------------------------------------------------------------------
// Streak helpers
// ---------------------------------------------------------------------------

/**
 * Given a sorted-ascending list of YYYY-MM-DD dates, return how many
 * consecutive calendar days end on the last element in the list.
 * Returns 0 for an empty list.
 *
 * Example: ['2024-06-10', '2024-06-14', '2024-06-15'] → 2
 */
export function countConsecutiveDaysAtEnd(sortedDates: readonly DateString[]): number {
  if (sortedDates.length === 0) return 0;
  let streak = 1;
  for (let i = sortedDates.length - 1; i > 0; i--) {
    const curr = sortedDates[i];
    const prev = sortedDates[i - 1];
    if (curr === undefined || prev === undefined) break;
    if (diffDays(curr, prev) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export interface DateLabelOptions {
  /** Prefix the weekday, e.g. "Sun, Nov 15". */
  weekday?: boolean;
  /** 'auto' adds the year only when it isn't the current one. */
  year?: 'auto' | 'never' | 'always';
  /** Needed for 'auto' to know what "this year" means. Defaults to the system clock. */
  today?: DateString;
  /** 'long' spells the month out: "November 15". */
  month?: 'short' | 'long';
}

/**
 * Human-readable label for a calendar date: "Nov 15", "Sun, Nov 15",
 * "Nov 15, 2027".
 *
 * Parsed at midday UTC and formatted in UTC so the label never slips a day
 * either side of midnight — the same trick the rest of this module uses.
 */
export function formatDateLabel(date: DateString, options: DateLabelOptions = {}): string {
  const { weekday = false, year = 'auto', today, month = 'short' } = options;
  const parsed = new Date(`${date}T12:00:00Z`);

  const showYear =
    year === 'always' ||
    (year === 'auto' && date.slice(0, 4) !== (today ?? new Date().toISOString()).slice(0, 4));

  return parsed.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month,
    day: 'numeric',
    ...(weekday ? { weekday: 'short' as const } : {}),
    ...(showYear ? { year: 'numeric' as const } : {}),
  });
}

/**
 * Single-letter weekday for a calendar date, for the seven-box week grids.
 *
 * Here rather than inline so the midday-UTC parse — the thing that stops a
 * date-only string landing on the previous day west of Greenwich — lives in
 * one module.
 */
export function weekdayInitial(date: DateString): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
}
