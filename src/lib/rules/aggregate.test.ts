import { describe, it, expect } from 'vitest';
import type { Challenge, Entry, Member } from '../../types';
import { aggregateMember, buildLeaderboard, buildWeeklySummary } from './aggregate';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeChallenge(overrides: Partial<Challenge['config']> = {}): Challenge {
  return {
    id: 'ch1',
    slug: 'abc123',
    name: 'Test',
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    status: 'active',
    ownerPasswordHash: '',
    ownerPasswordSalt: '',
    config: {
      startDate: '2024-06-01',
      endDate: null,
      weekAnchor: '2024-06-01',
      timezone: 'UTC',
      rules: [],
      ...overrides,
    },
  };
}

function makeMember(id: string, name: string, active = true): Member {
  return {
    id,
    name,
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    active,
    removedAt: null,
  };
}

function makeEntry(id: string, memberId: string, date: string, values: Entry['values'], pts = 0): Entry {
  return {
    id,
    memberId,
    date,
    values,
    pts,
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    updatedAt: { seconds: 0, nanoseconds: 0 } as never,
    createdByMemberId: memberId,
  };
}

// ---------------------------------------------------------------------------
// aggregateMember — basic scoring
// ---------------------------------------------------------------------------

describe('aggregateMember', () => {
  it('returns zero totals for a member with no entries', () => {
    const ch = makeChallenge({
      rules: [{
        id: 'gym', kind: 'binary', name: 'Gym', order: 0,
        pointsYes: 1, pointsNo: 0, pointsFree: 1,
      }],
    });
    const member = makeMember('m1', 'Alice');
    const result = aggregateMember(ch, member, []);
    expect(result.totalPoints).toBe(0);
    expect(result.daysLogged).toBe(0);
  });

  it('sums points across multiple entries', () => {
    const ch = makeChallenge({
      rules: [{
        id: 'gym', kind: 'binary', name: 'Gym', order: 0,
        pointsYes: 1, pointsNo: 0, pointsFree: 1,
      }],
    });
    const member = makeMember('m1', 'Alice');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes' }),
      makeEntry('e3', 'm1', '2024-06-05', { gym: 'no' }),
    ];
    const result = aggregateMember(ch, member, entries);
    expect(result.totalPoints).toBe(2);
    expect(result.daysLogged).toBe(3);
  });

  it('credits perRule correctly', () => {
    const ch = makeChallenge({
      rules: [
        { id: 'gym', kind: 'binary', name: 'Gym', order: 0, pointsYes: 1, pointsNo: 0, pointsFree: 1 },
        { id: 'steps', kind: 'counter', name: 'Steps', order: 1, target: 10_000, maxPoints: 5, unit: 'steps', decimals: 0 },
      ],
    });
    const member = makeMember('m1', 'Alice');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes', steps: 10_000 }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes', steps: 5_000 }),
    ];
    const result = aggregateMember(ch, member, entries);
    expect(result.perRule['gym']).toBe(2);
    expect(result.perRule['steps']).toBe(7.5); // 5 + 2.5
  });
});

// ---------------------------------------------------------------------------
// aggregateMember — tracker "latest only" logic
// ---------------------------------------------------------------------------

describe('aggregateMember — tracker latest-only', () => {
  it('only credits the latest tracker entry', () => {
    const ch = makeChallenge({
      rules: [{
        id: 'weight', kind: 'tracker', name: 'Weight', order: 0,
        maxPoints: 30, unit: 'lb', decimals: 1,
      }],
    });
    const member: Member = {
      ...makeMember('m1', 'Alice'),
      trackerConfig: {
        ruleId: 'weight',
        startVal: 200,
        goalVal: 180,
        direction: 'down',
        lockedAt: { seconds: 0, nanoseconds: 0 } as never,
      },
    };
    // Day 1: 190 lb (50% progress = 15 pts). Day 2: 185 lb (75% = 22.5 pts).
    // Only day 2 should count toward the total.
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { weight: 190 }), // older
      makeEntry('e2', 'm1', '2024-06-04', { weight: 185 }), // latest
    ];
    const result = aggregateMember(ch, member, entries);
    expect(result.perRule['weight']).toBeCloseTo(22.5);
    expect(result.totalPoints).toBeCloseTo(22.5);
  });
});

// ---------------------------------------------------------------------------
// aggregateMember — streak bonuses
// ---------------------------------------------------------------------------

describe('aggregateMember — streak bonuses', () => {
  const gymRule = {
    id: 'gym', kind: 'binary' as const, name: 'Gym', order: 0,
    pointsYes: 1, pointsNo: 0, pointsFree: 1,
  };

  it('fires streak bonus on completing daysRequired consecutive days', () => {
    const streakRule = {
      id: 'streak3', kind: 'streak' as const, name: '3-Day Streak', order: 1,
      ruleRef: 'gym', daysRequired: 3, bonusPoints: 5, repeatable: false,
    };
    const ch = makeChallenge({ rules: [gymRule, streakRule] });
    const member = makeMember('m1', 'Alice');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes' }),
      makeEntry('e3', 'm1', '2024-06-05', { gym: 'yes' }), // completes streak
    ];
    const result = aggregateMember(ch, member, entries);
    // 3 yes (3 pts) + streak bonus (5 pts) = 8
    expect(result.totalPoints).toBe(8);
    expect(result.perRule['streak3']).toBe(5);
  });

  it('does not fire if streak is broken', () => {
    const streakRule = {
      id: 'streak3', kind: 'streak' as const, name: '3-Day Streak', order: 1,
      ruleRef: 'gym', daysRequired: 3, bonusPoints: 5, repeatable: false,
    };
    const ch = makeChallenge({ rules: [gymRule, streakRule] });
    const member = makeMember('m1', 'Alice');
    // Gap on day 2 (no entry or 'no')
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'no' }),  // broken
      makeEntry('e3', 'm1', '2024-06-05', { gym: 'yes' }),
    ];
    const result = aggregateMember(ch, member, entries);
    expect(result.perRule['streak3']).toBe(0);
    expect(result.totalPoints).toBe(2); // only 2 'yes' days
  });

  it('non-repeatable streak fires at most once', () => {
    const streakRule = {
      id: 'streak3', kind: 'streak' as const, name: '3-Day Streak', order: 1,
      ruleRef: 'gym', daysRequired: 3, bonusPoints: 5, repeatable: false,
    };
    const ch = makeChallenge({ rules: [gymRule, streakRule] });
    const member = makeMember('m1', 'Alice');
    // 6 consecutive days → would fire on day 3 and day 6 if repeatable, but only day 3 for non-repeatable
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes' }),
      makeEntry('e3', 'm1', '2024-06-05', { gym: 'yes' }), // streak fires
      makeEntry('e4', 'm1', '2024-06-06', { gym: 'yes' }),
      makeEntry('e5', 'm1', '2024-06-07', { gym: 'yes' }),
      makeEntry('e6', 'm1', '2024-06-08', { gym: 'yes' }),
    ];
    const result = aggregateMember(ch, member, entries);
    expect(result.perRule['streak3']).toBe(5); // only once
    expect(result.totalPoints).toBe(11); // 6 yes + 5 bonus
  });

  it('repeatable streak fires again every daysRequired days', () => {
    const streakRule = {
      id: 'streak3', kind: 'streak' as const, name: '3-Day Streak', order: 1,
      ruleRef: 'gym', daysRequired: 3, bonusPoints: 5, repeatable: true,
    };
    const ch = makeChallenge({ rules: [gymRule, streakRule] });
    const member = makeMember('m1', 'Alice');
    // 6 consecutive days → fires on day 3 AND day 6
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes' }),
      makeEntry('e3', 'm1', '2024-06-05', { gym: 'yes' }), // first fire
      makeEntry('e4', 'm1', '2024-06-06', { gym: 'yes' }),
      makeEntry('e5', 'm1', '2024-06-07', { gym: 'yes' }),
      makeEntry('e6', 'm1', '2024-06-08', { gym: 'yes' }), // second fire
    ];
    const result = aggregateMember(ch, member, entries);
    expect(result.perRule['streak3']).toBe(10); // 2 × 5
    expect(result.totalPoints).toBe(16); // 6 yes + 10 bonus
  });

  it('non-repeatable streak fires again after a break', () => {
    const streakRule = {
      id: 'streak3', kind: 'streak' as const, name: '3-Day Streak', order: 1,
      ruleRef: 'gym', daysRequired: 3, bonusPoints: 5, repeatable: false,
    };
    const ch = makeChallenge({ rules: [gymRule, streakRule] });
    const member = makeMember('m1', 'Alice');
    // Run 1 (days 3-5): streak fires. Break. Run 2 (days 8-10): fires again.
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes' }),
      makeEntry('e3', 'm1', '2024-06-05', { gym: 'yes' }), // first fire
      // gap on 2024-06-06
      makeEntry('e4', 'm1', '2024-06-08', { gym: 'yes' }),
      makeEntry('e5', 'm1', '2024-06-09', { gym: 'yes' }),
      makeEntry('e6', 'm1', '2024-06-10', { gym: 'yes' }), // second fire (new run)
    ];
    const result = aggregateMember(ch, member, entries);
    expect(result.perRule['streak3']).toBe(10); // fires twice (two separate runs)
  });
});

// ---------------------------------------------------------------------------
// buildLeaderboard
// ---------------------------------------------------------------------------

describe('buildLeaderboard', () => {
  const gymRule = {
    id: 'gym', kind: 'binary' as const, name: 'Gym', order: 0,
    pointsYes: 1, pointsNo: 0, pointsFree: 1,
  };
  const ch = makeChallenge({ rules: [gymRule] });

  it('excludes inactive members from standings', () => {
    const active = makeMember('m1', 'Alice', true);
    const inactive = makeMember('m2', 'Bob', false);
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm2', '2024-06-03', { gym: 'yes' }), // Bob is inactive
    ];
    const lb = buildLeaderboard(ch, [active, inactive], entries);
    expect(lb.standings).toHaveLength(1);
    expect(lb.standings[0]?.memberName).toBe('Alice');
  });

  it('inactive member entries do not affect active members totals', () => {
    const active = makeMember('m1', 'Alice', true);
    const inactive = makeMember('m2', 'Bob', false);
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm2', '2024-06-03', { gym: 'yes' }),
    ];
    const lb = buildLeaderboard(ch, [active, inactive], entries);
    expect(lb.standings[0]?.totalPoints).toBe(1);
  });

  it('sorts by total points descending', () => {
    const alice = makeMember('m1', 'Alice');
    const bob = makeMember('m2', 'Bob');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes' }),
      makeEntry('e3', 'm2', '2024-06-03', { gym: 'yes' }),
    ];
    const lb = buildLeaderboard(ch, [alice, bob], entries);
    expect(lb.standings[0]?.memberName).toBe('Alice');
    expect(lb.standings[1]?.memberName).toBe('Bob');
  });

  it('assigns rank 1 to the top scorer', () => {
    const alice = makeMember('m1', 'Alice');
    const bob = makeMember('m2', 'Bob');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm2', '2024-06-03', { gym: 'no' }),
    ];
    const lb = buildLeaderboard(ch, [alice, bob], entries);
    expect(lb.standings[0]?.rank).toBe(1);
    expect(lb.standings[1]?.rank).toBe(2);
  });

  it('ties share the same rank and next rank skips', () => {
    const alice = makeMember('m1', 'Alice');
    const bob = makeMember('m2', 'Bob');
    const carol = makeMember('m3', 'Carol');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }), // 1 pt
      makeEntry('e2', 'm2', '2024-06-03', { gym: 'yes' }), // 1 pt (tie with Alice)
      makeEntry('e3', 'm3', '2024-06-03', { gym: 'no' }),  // 0 pts
    ];
    const lb = buildLeaderboard(ch, [alice, bob, carol], entries);
    const ranks = lb.standings.map(s => ({ name: s.memberName, rank: s.rank }));
    // Alice and Bob are tied at rank 1; Carol is rank 3 (skips 2)
    const aliceRank = ranks.find(r => r.name === 'Alice')?.rank;
    const bobRank = ranks.find(r => r.name === 'Bob')?.rank;
    const carolRank = ranks.find(r => r.name === 'Carol')?.rank;
    expect(aliceRank).toBe(1);
    expect(bobRank).toBe(1);
    expect(carolRank).toBe(3);
  });

  it('includes active member with no entries at 0 pts', () => {
    const alice = makeMember('m1', 'Alice');
    const lb = buildLeaderboard(ch, [alice], []);
    expect(lb.standings).toHaveLength(1);
    expect(lb.standings[0]?.totalPoints).toBe(0);
  });

  it('sets totalEntries to count of active-member entries only', () => {
    const active = makeMember('m1', 'Alice');
    const inactive = makeMember('m2', 'Bob', false);
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm2', '2024-06-03', { gym: 'yes' }), // inactive
    ];
    const lb = buildLeaderboard(ch, [active, inactive], entries);
    expect(lb.totalEntries).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildWeeklySummary
// ---------------------------------------------------------------------------

describe('buildWeeklySummary', () => {
  it('reports correct weekly cap usage for binary rules', () => {
    const ch = makeChallenge({
      rules: [{
        id: 'gym', kind: 'binary', name: 'Gym', order: 0,
        pointsYes: 1, pointsNo: 0, pointsFree: 1,
        weeklyCap: { maxScoringDays: 4 },
      }],
    });
    const member = makeMember('m1', 'Alice');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-03', { gym: 'yes' }),
      makeEntry('e2', 'm1', '2024-06-04', { gym: 'yes' }),
      makeEntry('e3', 'm1', '2024-06-05', { gym: 'yes' }),
    ];
    const summary = buildWeeklySummary(ch, member, entries, '2024-06-05');
    expect(summary.perRule['gym']?.used).toBe(3);
    expect(summary.perRule['gym']?.cap).toBe(4);
    expect(summary.weekNumber).toBe(1);
  });

  it('reports week 2 for a date in the second week', () => {
    const ch = makeChallenge({ rules: [] });
    const member = makeMember('m1', 'Alice');
    const summary = buildWeeklySummary(ch, member, [], '2024-06-08'); // day 8 = week 2
    expect(summary.weekNumber).toBe(2);
  });

  it('reports lifetime free-pass usage', () => {
    const ch = makeChallenge({
      rules: [{
        id: 'gym', kind: 'binary', name: 'Gym', order: 0,
        pointsYes: 1, pointsNo: 0, pointsFree: 1,
        freePasses: { count: 5, lifetime: true },
      }],
    });
    const member = makeMember('m1', 'Alice');
    const entries = [
      makeEntry('e1', 'm1', '2024-06-01', { gym: 'free' }),
      makeEntry('e2', 'm1', '2024-06-03', { gym: 'free' }),
    ];
    const summary = buildWeeklySummary(ch, member, entries, '2024-06-05');
    expect(summary.freePassUsage['gym']?.used).toBe(2);
    expect(summary.freePassUsage['gym']?.cap).toBe(5);
  });
});
