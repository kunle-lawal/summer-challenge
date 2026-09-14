import { describe, it, expect } from 'vitest';
import {
  addDays,
  compareDates,
  countConsecutiveDaysAtEnd,
  diffDays,
  formatDateLabel,
  formatInTz,
  getWeekNumber,
  getWeekWindow,
  isToday,
  isWithinEditWindow,
  isYesterday,
  todayInTz,
  yesterdayInTz,
} from './dates';

// ---------------------------------------------------------------------------
// formatInTz
// ---------------------------------------------------------------------------

describe('formatInTz', () => {
  it('formats a UTC date in the correct local date for US Eastern', () => {
    // 2024-06-15T04:00:00Z = 2024-06-15 00:00 EDT (UTC-4)
    expect(formatInTz(new Date('2024-06-15T04:00:00Z'), 'America/New_York')).toBe('2024-06-15');
  });

  it('returns the previous calendar day when UTC is ahead of local time', () => {
    // 2024-06-15T02:00:00Z = 2024-06-14 22:00 EDT
    expect(formatInTz(new Date('2024-06-15T02:00:00Z'), 'America/New_York')).toBe('2024-06-14');
  });

  it('handles a timezone ahead of UTC (Asia/Tokyo, UTC+9)', () => {
    // 2024-01-15T16:00:00Z = 2024-01-16 01:00 JST
    expect(formatInTz(new Date('2024-01-15T16:00:00Z'), 'Asia/Tokyo')).toBe('2024-01-16');
  });
});

// ---------------------------------------------------------------------------
// todayInTz / yesterdayInTz
// ---------------------------------------------------------------------------

describe('todayInTz', () => {
  it('returns the correct calendar date in UTC', () => {
    expect(todayInTz('UTC', new Date('2024-06-15T12:00:00Z'))).toBe('2024-06-15');
  });

  it('returns the next-day date for a timezone ahead of UTC', () => {
    // 2024-01-15T23:00:00Z = 2024-01-16 in Asia/Tokyo (UTC+9)
    const now = new Date('2024-01-15T23:00:00Z');
    expect(todayInTz('Asia/Tokyo', now)).toBe('2024-01-16');
    expect(todayInTz('America/New_York', now)).toBe('2024-01-15');
  });

  it('handles DST spring-forward (America/Chicago 2024-03-10)', () => {
    // Clocks spring forward at 2:00am CST → 3:00am CDT on 2024-03-10
    // 2024-03-10T08:00:00Z = 3:00am CDT (just after spring forward)
    const now = new Date('2024-03-10T08:00:00Z');
    expect(todayInTz('America/Chicago', now)).toBe('2024-03-10');
  });

  it('handles DST fall-back (America/Chicago 2024-11-03)', () => {
    // Clocks fall back at 2:00am CDT → 1:00am CST on 2024-11-03
    // 2024-11-03T06:30:00Z = 1:30am CST (just after fall-back)
    const now = new Date('2024-11-03T06:30:00Z');
    expect(todayInTz('America/Chicago', now)).toBe('2024-11-03');
  });
});

describe('yesterdayInTz', () => {
  it('returns the day before today', () => {
    expect(yesterdayInTz('UTC', new Date('2024-06-15T12:00:00Z'))).toBe('2024-06-14');
  });

  it('crosses a month boundary correctly', () => {
    expect(yesterdayInTz('UTC', new Date('2024-06-01T12:00:00Z'))).toBe('2024-05-31');
  });

  it('handles DST spring-forward: yesterday is the day before', () => {
    const now = new Date('2024-03-10T08:00:00Z');
    expect(yesterdayInTz('America/Chicago', now)).toBe('2024-03-09');
  });

  it('handles DST fall-back: yesterday is the day before', () => {
    const now = new Date('2024-11-03T06:30:00Z');
    expect(yesterdayInTz('America/Chicago', now)).toBe('2024-11-02');
  });
});

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2024-01-15', 3)).toBe('2024-01-18');
  });

  it('subtracts days with a negative argument', () => {
    expect(addDays('2024-01-15', -3)).toBe('2024-01-12');
  });

  it('crosses a month boundary', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01');
  });

  it('crosses a year boundary', () => {
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01');
  });

  it('handles leap-year February correctly', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
  });

  it('returns the same date for 0 days', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15');
  });
});

// ---------------------------------------------------------------------------
// diffDays
// ---------------------------------------------------------------------------

describe('diffDays', () => {
  it('returns positive for a later first argument', () => {
    expect(diffDays('2024-01-18', '2024-01-15')).toBe(3);
  });

  it('returns negative for an earlier first argument', () => {
    expect(diffDays('2024-01-12', '2024-01-15')).toBe(-3);
  });

  it('returns 0 for the same date', () => {
    expect(diffDays('2024-06-15', '2024-06-15')).toBe(0);
  });

  it('works across month boundaries', () => {
    expect(diffDays('2024-02-01', '2024-01-31')).toBe(1);
  });

  it('works across year boundaries', () => {
    expect(diffDays('2024-01-01', '2023-12-31')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// compareDates
// ---------------------------------------------------------------------------

describe('compareDates', () => {
  it('returns -1 for an earlier first date', () => {
    expect(compareDates('2024-01-01', '2024-06-15')).toBe(-1);
  });

  it('returns 1 for a later first date', () => {
    expect(compareDates('2024-12-31', '2024-01-01')).toBe(1);
  });

  it('returns 0 for equal dates', () => {
    expect(compareDates('2024-06-15', '2024-06-15')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getWeekNumber
// ---------------------------------------------------------------------------

describe('getWeekNumber', () => {
  const anchor = '2024-06-01';

  it('returns 1 for the anchor date', () => {
    expect(getWeekNumber('2024-06-01', anchor)).toBe(1);
  });

  it('returns 1 for the last day of week 1', () => {
    expect(getWeekNumber('2024-06-07', anchor)).toBe(1);
  });

  it('returns 2 for the first day of week 2', () => {
    expect(getWeekNumber('2024-06-08', anchor)).toBe(2);
  });

  it('returns 2 for the last day of week 2', () => {
    expect(getWeekNumber('2024-06-14', anchor)).toBe(2);
  });

  it('returns 3 for a date in week 3', () => {
    // June 15 = diff 14 → floor(14/7)+1 = 3
    expect(getWeekNumber('2024-06-15', anchor)).toBe(3);
  });

  it('returns 0 for a date before the anchor', () => {
    expect(getWeekNumber('2024-05-31', anchor)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getWeekWindow
// ---------------------------------------------------------------------------

describe('getWeekWindow', () => {
  const anchor = '2024-06-01';

  it('returns the correct window for the anchor date (week 1)', () => {
    expect(getWeekWindow('2024-06-01', anchor)).toEqual({
      start: '2024-06-01',
      end: '2024-06-07',
    });
  });

  it('returns the correct window for the last day of week 1', () => {
    expect(getWeekWindow('2024-06-07', anchor)).toEqual({
      start: '2024-06-01',
      end: '2024-06-07',
    });
  });

  it('returns the correct window for a day in week 2', () => {
    expect(getWeekWindow('2024-06-10', anchor)).toEqual({
      start: '2024-06-08',
      end: '2024-06-14',
    });
  });

  it('treats dates before the anchor as week 1', () => {
    expect(getWeekWindow('2024-05-30', anchor)).toEqual({
      start: '2024-06-01',
      end: '2024-06-07',
    });
  });
});

// ---------------------------------------------------------------------------
// isWithinEditWindow / isToday / isYesterday
// ---------------------------------------------------------------------------

describe('isWithinEditWindow', () => {
  const now = new Date('2024-06-15T12:00:00Z'); // today = 2024-06-15 UTC
  const bounds = { startDate: '2024-06-01' as const, endDate: '2024-06-30' as const };

  it('returns true for today', () => {
    expect(isWithinEditWindow('2024-06-15', 'UTC', bounds, now)).toBe(true);
  });

  it('returns true for any past date within the challenge range', () => {
    expect(isWithinEditWindow('2024-06-01', 'UTC', bounds, now)).toBe(true);
    expect(isWithinEditWindow('2024-06-13', 'UTC', bounds, now)).toBe(true);
  });

  it('returns false for dates before startDate', () => {
    expect(isWithinEditWindow('2024-05-31', 'UTC', bounds, now)).toBe(false);
  });

  it('returns false for a future date', () => {
    expect(isWithinEditWindow('2024-06-16', 'UTC', bounds, now)).toBe(false);
  });

  it('returns false for dates after endDate', () => {
    expect(isWithinEditWindow('2024-07-01', 'UTC', bounds, now)).toBe(false);
  });

  it('respects the challenge timezone (timezone edge case)', () => {
    // 2024-06-15T02:00:00Z is still 2024-06-14 in America/New_York (EDT = UTC-4)
    const edgeNow = new Date('2024-06-15T02:00:00Z');
    const edgeBounds = { startDate: '2024-06-01' as const, endDate: null };
    expect(isWithinEditWindow('2024-06-14', 'America/New_York', edgeBounds, edgeNow)).toBe(true);
    expect(isWithinEditWindow('2024-06-13', 'America/New_York', edgeBounds, edgeNow)).toBe(true);
    expect(isWithinEditWindow('2024-06-15', 'America/New_York', edgeBounds, edgeNow)).toBe(false);
  });
});

describe('isToday', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  it('returns true for today', () => {
    expect(isToday('2024-06-15', 'UTC', now)).toBe(true);
  });

  it('returns false for yesterday', () => {
    expect(isToday('2024-06-14', 'UTC', now)).toBe(false);
  });
});

describe('isYesterday', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  it('returns true for yesterday', () => {
    expect(isYesterday('2024-06-14', 'UTC', now)).toBe(true);
  });

  it('returns false for today', () => {
    expect(isYesterday('2024-06-15', 'UTC', now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// countConsecutiveDaysAtEnd
// ---------------------------------------------------------------------------

describe('countConsecutiveDaysAtEnd', () => {
  it('returns 0 for an empty array', () => {
    expect(countConsecutiveDaysAtEnd([])).toBe(0);
  });

  it('returns 1 for a single date', () => {
    expect(countConsecutiveDaysAtEnd(['2024-06-15'])).toBe(1);
  });

  it('counts all dates if they are all consecutive', () => {
    expect(
      countConsecutiveDaysAtEnd(['2024-06-13', '2024-06-14', '2024-06-15']),
    ).toBe(3);
  });

  it('resets the count at a gap', () => {
    // Gap between June 10 and June 14: streak at end is 2
    expect(
      countConsecutiveDaysAtEnd(['2024-06-10', '2024-06-14', '2024-06-15']),
    ).toBe(2);
  });

  it('returns 1 when the last two dates are not consecutive', () => {
    expect(countConsecutiveDaysAtEnd(['2024-06-13', '2024-06-15'])).toBe(1);
  });

  it('handles a gap in the middle correctly', () => {
    // Streak is 3 for the tail
    expect(
      countConsecutiveDaysAtEnd(['2024-06-01', '2024-06-05', '2024-06-06', '2024-06-07']),
    ).toBe(3);
  });

  it('works across a month boundary', () => {
    expect(
      countConsecutiveDaysAtEnd(['2024-05-30', '2024-05-31', '2024-06-01']),
    ).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// formatDateLabel
// ---------------------------------------------------------------------------

describe('formatDateLabel', () => {
  it('gives a short month and day by default', () => {
    expect(formatDateLabel('2026-11-15', { today: '2026-09-14' })).toBe('Nov 15');
  });

  it('adds the weekday when asked', () => {
    expect(formatDateLabel('2026-11-15', { weekday: true, today: '2026-09-14' })).toBe('Sun, Nov 15');
  });

  it('adds the year only when it is not the current one', () => {
    expect(formatDateLabel('2027-01-04', { today: '2026-09-14' })).toBe('Jan 4, 2027');
    expect(formatDateLabel('2026-01-04', { today: '2026-09-14' })).toBe('Jan 4');
  });

  it('can be told to always or never show the year', () => {
    expect(formatDateLabel('2026-11-15', { year: 'always', today: '2026-09-14' })).toBe('Nov 15, 2026');
    expect(formatDateLabel('2027-11-15', { year: 'never', today: '2026-09-14' })).toBe('Nov 15');
  });

  /*
   * The whole reason dates are parsed at midday UTC: a date-only string parsed
   * as local midnight lands on the previous day for anyone west of Greenwich,
   * so the label would disagree with the date it came from.
   */
  it('names the same day the string does, either side of midnight', () => {
    expect(formatDateLabel('2026-01-01', { today: '2026-06-01' })).toBe('Jan 1');
    expect(formatDateLabel('2026-12-31', { today: '2026-06-01' })).toBe('Dec 31');
  });
});
