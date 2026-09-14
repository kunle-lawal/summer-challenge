import { describe, it, expect } from 'vitest';
import type { Challenge, Entry, Member, Rule, StreakRule } from '../../types';
import { aggregateMember } from './aggregate';
import { getStreakRunAtDate } from './streakRun';
import { maxDailyPoints, qualifiesForStreak } from './kinds';

const ts = { seconds: 0, nanoseconds: 0 } as never;

const member: Member = { id: 'm1', name: 'Kunle', createdAt: ts, active: true, removedAt: null };

const steps: Rule = {
  id: 'steps', kind: 'counter', name: 'Steps', order: 0,
  target: 8000, maxPoints: 2, unit: 'steps', decimals: 0,
};

const gym: Rule = {
  id: 'gym', kind: 'binary', name: 'Gym', order: 0,
  pointsYes: 2, pointsNo: 0, pointsFree: 2, freePasses: { count: 5, lifetime: true },
};

function streakOn(ruleRef: string, qualifier?: 'positive' | 'full'): StreakRule {
  return {
    id: 'st', kind: 'streak', name: 'Streak', order: 9,
    ruleRef, daysRequired: 3, bonusPoints: 10, repeatable: true,
    ...(qualifier ? { qualifier } : {}),
  };
}

function challengeWith(rules: Rule[]): Challenge {
  return {
    id: 'c1', slug: 'abc123', name: 'T', createdAt: ts, status: 'active',
    ownerPasswordHash: '', ownerPasswordSalt: '',
    config: {
      startDate: '2026-06-01', endDate: null, weekAnchor: '2026-06-01',
      timezone: 'UTC', rules,
    },
  };
}

function days(from: string, values: Entry['values'][]): Entry[] {
  const start = new Date(`${from}T12:00:00Z`);
  return values.map((v, i) => {
    const d = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return {
      id: `e${i}`, memberId: 'm1', date: d, values: v, pts: 0,
      createdAt: ts, updatedAt: ts, createdByMemberId: 'm1',
    };
  });
}

/** Points the streak rule itself contributed. */
function streakPoints(challenge: Challenge, entries: Entry[]): number {
  return aggregateMember(challenge, member, entries).perRule['st'] ?? 0;
}

// ---------------------------------------------------------------------------

describe('maxDailyPoints', () => {
  it('counts a free pass as full credit on a binary', () => {
    expect(maxDailyPoints(gym)).toBe(2);
  });

  it('is the target payout for a counter', () => {
    expect(maxDailyPoints(steps)).toBe(2);
  });

  it('is the top of the band for a range', () => {
    expect(maxDailyPoints({
      id: 'r', kind: 'range', name: 'Sleep', order: 0,
      min: 7, max: 9, pointsAtMin: 1, pointsAtMax: 3, pointsOutside: 0, unit: 'h', decimals: 1,
    })).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The farmable-counter problem this was built to fix
// ---------------------------------------------------------------------------

describe('a streak watching a counter', () => {
  const threeTinyDays = days('2026-06-01', [{ steps: 1 }, { steps: 1 }, { steps: 1 }]);
  const threeFullDays = days('2026-06-01', [{ steps: 8000 }, { steps: 9000 }, { steps: 8000 }]);

  it('is farmable by default — one step a day keeps it alive', () => {
    const c = challengeWith([steps, streakOn('steps')]);
    expect(streakPoints(c, threeTinyDays)).toBe(10);
  });

  it("doesn't pay for token days once it requires full credit", () => {
    const c = challengeWith([steps, streakOn('steps', 'full')]);
    expect(streakPoints(c, threeTinyDays)).toBe(0);
  });

  it('pays when the target is actually hit', () => {
    const c = challengeWith([steps, streakOn('steps', 'full')]);
    expect(streakPoints(c, threeFullDays)).toBe(10);
  });

  it('counts a day that goes past the target', () => {
    const c = challengeWith([steps, streakOn('steps', 'full')]);
    const over = days('2026-06-01', [{ steps: 20000 }, { steps: 20000 }, { steps: 20000 }]);
    expect(streakPoints(c, over)).toBe(10);
  });

  it('breaks the run on a day that falls short', () => {
    const c = challengeWith([steps, streakOn('steps', 'full')]);
    const nearMiss = days('2026-06-01', [{ steps: 8000 }, { steps: 7999 }, { steps: 8000 }]);
    expect(streakPoints(c, nearMiss)).toBe(0);
  });

  // Counter scoring is a division; 7999/8000 must not round its way to a pass.
  it('does not let floating-point rounding wave a near miss through', () => {
    expect(qualifiesForStreak(streakOn('steps', 'full'), steps, 1.9999)).toBe(false);
    expect(qualifiesForStreak(streakOn('steps', 'full'), steps, 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Binary rules were never farmable — worth pinning so it stays that way
// ---------------------------------------------------------------------------

describe('a streak watching a binary', () => {
  it('breaks on a No, even on the default qualifier', () => {
    const c = challengeWith([gym, streakOn('gym')]);
    const mixed = days('2026-06-01', [{ gym: 'yes' }, { gym: 'no' }, { gym: 'yes' }]);
    expect(streakPoints(c, mixed)).toBe(0);
  });

  it('pays for three straight Yes days', () => {
    const c = challengeWith([gym, streakOn('gym')]);
    expect(streakPoints(c, days('2026-06-01', [{ gym: 'yes' }, { gym: 'yes' }, { gym: 'yes' }]))).toBe(10);
  });

  /* Holding a streak together is what a pass is for, so it counts as a full day. */
  it('lets a free pass hold the run together', () => {
    const c = challengeWith([gym, streakOn('gym', 'full')]);
    expect(streakPoints(c, days('2026-06-01', [{ gym: 'yes' }, { gym: 'free' }, { gym: 'yes' }]))).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// The log and the leaderboard have to agree
// ---------------------------------------------------------------------------

describe('the log UI and the leaderboard', () => {
  it('agree that token counter days do not count', () => {
    const rule = streakOn('steps', 'full');
    const c = challengeWith([steps, rule]);
    const entries = days('2026-06-01', [{ steps: 1 }, { steps: 1 }, { steps: 1 }]);

    // Board: no bonus. Log: no run either — not a run the board won't pay for.
    expect(streakPoints(c, entries)).toBe(0);
    expect(getStreakRunAtDate(c, member, entries, rule, '2026-06-03').count).toBe(0);
  });

  it('agree that full days do count', () => {
    const rule = streakOn('steps', 'full');
    const c = challengeWith([steps, rule]);
    const entries = days('2026-06-01', [{ steps: 8000 }, { steps: 8000 }, { steps: 8000 }]);

    expect(streakPoints(c, entries)).toBe(10);
    expect(getStreakRunAtDate(c, member, entries, rule, '2026-06-03').count).toBe(3);
  });

  it('show the run as broken when today falls short of the target', () => {
    const rule = streakOn('steps', 'full');
    const c = challengeWith([steps, rule]);
    const entries = days('2026-06-01', [{ steps: 8000 }, { steps: 8000 }, { steps: 500 }]);

    const run = getStreakRunAtDate(c, member, entries, rule, '2026-06-03');
    expect(run.brokenOnDate).toBe(true);
    expect(run.count).toBe(0);
  });
});
