import { describe, it, expect } from 'vitest';
import type { Entry } from '../../types';
import {
  validateEntryValue,
  countFreePassesUsed,
  countPriorBinaryPositiveDatesInWeek,
  countPriorPenaltyInfractionsInWeek,
} from './kinds';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeEntry(id: string, date: string, values: Entry['values']): Entry {
  return {
    id,
    memberId: 'm1',
    date,
    values,
    pts: 0,
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    updatedAt: { seconds: 0, nanoseconds: 0 } as never,
    createdByMemberId: 'm1',
  };
}

// ---------------------------------------------------------------------------
// validateEntryValue — binary
// ---------------------------------------------------------------------------

describe('validateEntryValue — binary', () => {
  const rule = { id: 'gym', kind: 'binary' as const, name: 'Gym', order: 0, pointsYes: 1, pointsNo: 0, pointsFree: 1 };

  it('accepts yes', () => expect(validateEntryValue(rule, 'yes')).toEqual({ valid: true }));
  it('accepts no', () => expect(validateEntryValue(rule, 'no')).toEqual({ valid: true }));
  it('accepts free', () => expect(validateEntryValue(rule, 'free')).toEqual({ valid: true }));
  it('rejects a numeric value', () => expect(validateEntryValue(rule, 42 as never)).toMatchObject({ valid: false }));
});

// ---------------------------------------------------------------------------
// validateEntryValue — counter
// ---------------------------------------------------------------------------

describe('validateEntryValue — counter', () => {
  const rule = { id: 'steps', kind: 'counter' as const, name: 'Steps', order: 0, target: 10_000, maxPoints: 5, unit: 'steps', decimals: 0 };

  it('accepts a positive integer', () => expect(validateEntryValue(rule, 5_000)).toEqual({ valid: true }));
  it('accepts zero', () => expect(validateEntryValue(rule, 0)).toEqual({ valid: true }));
  it('rejects a negative value', () => expect(validateEntryValue(rule, -1)).toMatchObject({ valid: false }));
  it('rejects a string', () => expect(validateEntryValue(rule, 'yes' as never)).toMatchObject({ valid: false }));
  it('rejects Infinity', () => expect(validateEntryValue(rule, Infinity)).toMatchObject({ valid: false }));
});

// ---------------------------------------------------------------------------
// validateEntryValue — range
// ---------------------------------------------------------------------------

describe('validateEntryValue — range', () => {
  const rule = { id: 'sleep', kind: 'range' as const, name: 'Sleep', order: 0, min: 7, max: 9, pointsInside: 2, pointsOutside: -1, unit: 'hrs', decimals: 1 };

  it('accepts a value inside the range', () => expect(validateEntryValue(rule, 8)).toEqual({ valid: true }));
  it('accepts a value outside the range (range is not semantic validation)', () => expect(validateEntryValue(rule, 3)).toEqual({ valid: true }));
  it('rejects a negative value', () => expect(validateEntryValue(rule, -1)).toMatchObject({ valid: false }));
  it('rejects a non-finite number', () => expect(validateEntryValue(rule, NaN)).toMatchObject({ valid: false }));
});

// ---------------------------------------------------------------------------
// validateEntryValue — penalty
// ---------------------------------------------------------------------------

describe('validateEntryValue — penalty', () => {
  const rule = { id: 'junk', kind: 'penalty' as const, name: 'Junk', order: 0, pointsClean: 1, pointsPerInfraction: -1, pointsFree: 1, weeklyFirstWaived: true };

  it('accepts clean', () => expect(validateEntryValue(rule, 'clean')).toEqual({ valid: true }));
  it('accepts infraction', () => expect(validateEntryValue(rule, 'infraction')).toEqual({ valid: true }));
  it('accepts free', () => expect(validateEntryValue(rule, 'free')).toEqual({ valid: true }));
  it('rejects yes (wrong kind value)', () => expect(validateEntryValue(rule, 'yes' as never)).toMatchObject({ valid: false }));
  it('rejects a number', () => expect(validateEntryValue(rule, 5 as never)).toMatchObject({ valid: false }));
});

// ---------------------------------------------------------------------------
// validateEntryValue — streak
// ---------------------------------------------------------------------------

describe('validateEntryValue — streak', () => {
  const rule = { id: 's1', kind: 'streak' as const, name: 'Streak', order: 0, ruleRef: 'gym', daysRequired: 7, bonusPoints: 5, repeatable: false };

  it('always returns invalid (streak has no entry value)', () => {
    expect(validateEntryValue(rule, 'yes' as never)).toMatchObject({ valid: false });
  });
});

// ---------------------------------------------------------------------------
// validateEntryValue — tracker
// ---------------------------------------------------------------------------

describe('validateEntryValue — tracker', () => {
  const rule = { id: 'weight', kind: 'tracker' as const, name: 'Weight', order: 0, maxPoints: 30, unit: 'lb', decimals: 1 };

  it('accepts a positive number', () => expect(validateEntryValue(rule, 185)).toEqual({ valid: true }));
  it('accepts zero', () => expect(validateEntryValue(rule, 0)).toEqual({ valid: true }));
  it('rejects a negative value', () => expect(validateEntryValue(rule, -5)).toMatchObject({ valid: false }));
  it('rejects a non-number', () => expect(validateEntryValue(rule, 'clean' as never)).toMatchObject({ valid: false }));
});

// ---------------------------------------------------------------------------
// countFreePassesUsed
// ---------------------------------------------------------------------------

describe('countFreePassesUsed', () => {
  it('returns 0 when no entries logged', () => {
    expect(countFreePassesUsed('gym', [])).toBe(0);
  });

  it('counts only entries where value is "free"', () => {
    const entries = [
      makeEntry('e1', '2024-06-01', { gym: 'yes' }),
      makeEntry('e2', '2024-06-02', { gym: 'free' }),
      makeEntry('e3', '2024-06-03', { gym: 'no' }),
      makeEntry('e4', '2024-06-04', { gym: 'free' }),
    ];
    expect(countFreePassesUsed('gym', entries)).toBe(2);
  });

  it('ignores entries for other rule IDs', () => {
    const entries = [
      makeEntry('e1', '2024-06-01', { junk: 'free', gym: 'yes' }),
    ];
    expect(countFreePassesUsed('gym', entries)).toBe(0);
    expect(countFreePassesUsed('junk', entries)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// countPriorBinaryPositiveDatesInWeek
// ---------------------------------------------------------------------------

describe('countPriorBinaryPositiveDatesInWeek', () => {
  it('returns 0 when no entries', () => {
    expect(countPriorBinaryPositiveDatesInWeek('gym', '2024-06-01', '2024-06-07', [])).toBe(0);
  });

  it('counts yes and free entries before the given date', () => {
    const entries = [
      makeEntry('e1', '2024-06-01', { gym: 'yes' }),
      makeEntry('e2', '2024-06-02', { gym: 'free' }),
      makeEntry('e3', '2024-06-03', { gym: 'no' }),
    ];
    expect(countPriorBinaryPositiveDatesInWeek('gym', '2024-06-01', '2024-06-04', entries)).toBe(2);
  });

  it('excludes the beforeDate itself (exclusive upper bound)', () => {
    const entries = [makeEntry('e1', '2024-06-04', { gym: 'yes' })];
    expect(countPriorBinaryPositiveDatesInWeek('gym', '2024-06-01', '2024-06-04', entries)).toBe(0);
  });

  it('excludes entries before weekStart', () => {
    const entries = [
      makeEntry('e1', '2024-05-31', { gym: 'yes' }), // before weekStart
      makeEntry('e2', '2024-06-01', { gym: 'yes' }),
    ];
    expect(countPriorBinaryPositiveDatesInWeek('gym', '2024-06-01', '2024-06-07', entries)).toBe(1);
  });

  it('counts distinct dates — same-day duplicate entries count as one', () => {
    const entries = [
      makeEntry('e1', '2024-06-01', { gym: 'yes' }),
      makeEntry('e2', '2024-06-01', { gym: 'yes' }), // same date
    ];
    expect(countPriorBinaryPositiveDatesInWeek('gym', '2024-06-01', '2024-06-07', entries)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// countPriorPenaltyInfractionsInWeek
// ---------------------------------------------------------------------------

describe('countPriorPenaltyInfractionsInWeek', () => {
  it('returns 0 when no infractions', () => {
    const entries = [makeEntry('e1', '2024-06-01', { junk: 'clean' })];
    expect(countPriorPenaltyInfractionsInWeek('junk', '2024-06-01', '2024-06-07', entries)).toBe(0);
  });

  it('counts infractions before the given date', () => {
    const entries = [
      makeEntry('e1', '2024-06-01', { junk: 'infraction' }),
      makeEntry('e2', '2024-06-02', { junk: 'infraction' }),
    ];
    expect(countPriorPenaltyInfractionsInWeek('junk', '2024-06-01', '2024-06-05', entries)).toBe(2);
  });

  it('does not count free-pass entries as infractions', () => {
    const entries = [makeEntry('e1', '2024-06-01', { junk: 'free' })];
    expect(countPriorPenaltyInfractionsInWeek('junk', '2024-06-01', '2024-06-07', entries)).toBe(0);
  });

  it('excludes the beforeDate (exclusive upper bound)', () => {
    const entries = [makeEntry('e1', '2024-06-04', { junk: 'infraction' })];
    expect(countPriorPenaltyInfractionsInWeek('junk', '2024-06-01', '2024-06-04', entries)).toBe(0);
  });
});
