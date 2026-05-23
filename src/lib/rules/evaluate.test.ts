import { describe, it, expect } from 'vitest';
import type { Challenge, Entry, Member, BinaryRule, PenaltyRule } from '../../types';
import { evaluateEntry, isFreePassExhausted } from './evaluate';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_CONFIG: Challenge['config'] = {
  startDate: '2024-06-01',
  endDate: null,
  weekAnchor: '2024-06-01', // weeks start Saturday June 1
  timezone: 'UTC',
  rules: [],
};

function makeChallenge(rules: Challenge['config']['rules'] = []): Challenge {
  return {
    id: 'ch1',
    slug: 'abc123',
    name: 'Test Challenge',
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    status: 'active',
    ownerPasswordHash: 'hash',
    ownerPasswordSalt: 'salt',
    config: { ...BASE_CONFIG, rules },
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'mem1',
    name: 'Alice',
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    active: true,
    removedAt: null,
    ...overrides,
  };
}

function makeEntry(
  date: string,
  values: Entry['values'],
  overrides: Partial<Entry> = {},
): Entry {
  return {
    id: `entry-${date}`,
    memberId: 'mem1',
    date,
    values,
    pts: 0,
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    updatedAt: { seconds: 0, nanoseconds: 0 } as never,
    createdByMemberId: 'mem1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Binary rule
// ---------------------------------------------------------------------------

describe('binary rule', () => {
  const rule: BinaryRule = {
    id: 'gym',
    kind: 'binary',
    name: 'Gym',
    order: 0,
    pointsYes: 1,
    pointsNo: 0,
    pointsFree: 1,
    freePasses: { count: 5, lifetime: true },
    weeklyCap: { maxScoringDays: 4 },
  };
  const challenge = makeChallenge([rule]);
  const member = makeMember();

  it('awards pointsYes for yes', () => {
    const entry = makeEntry('2024-06-01', { gym: 'yes' });
    const result = evaluateEntry(challenge, entry, member, [entry]);
    expect(result.perRule['gym']?.points).toBe(1);
  });

  it('awards pointsNo for no', () => {
    const entry = makeEntry('2024-06-01', { gym: 'no' });
    const result = evaluateEntry(challenge, entry, member, [entry]);
    expect(result.perRule['gym']?.points).toBe(0);
  });

  it('awards pointsFree for free and marks usedFreePass', () => {
    const entry = makeEntry('2024-06-01', { gym: 'free' });
    const result = evaluateEntry(challenge, entry, member, [entry]);
    const r = result.perRule['gym'];
    expect(r?.points).toBe(1);
    expect(r?.usedFreePass).toBe(true);
  });

  it('returns 0 pts when rule not logged', () => {
    const entry = makeEntry('2024-06-01', {});
    const result = evaluateEntry(challenge, entry, member, [entry]);
    expect(result.perRule['gym']?.points).toBe(0);
    expect(result.perRule['gym']?.rawValue).toBeNull();
  });

  it('applies weekly cap: 5th yes in a week scores 0', () => {
    // Cap = 4; Mon–Thu score, Fri is capped.
    const entries = [
      makeEntry('2024-06-03', { gym: 'yes' }, { id: 'e1' }), // Mon
      makeEntry('2024-06-04', { gym: 'yes' }, { id: 'e2' }), // Tue
      makeEntry('2024-06-05', { gym: 'yes' }, { id: 'e3' }), // Wed
      makeEntry('2024-06-06', { gym: 'yes' }, { id: 'e4' }), // Thu
      makeEntry('2024-06-07', { gym: 'yes' }, { id: 'e5' }), // Fri — should be capped
    ];
    const friday = entries[4]!;
    const result = evaluateEntry(challenge, friday, member, entries);
    expect(result.perRule['gym']?.points).toBe(0);
    expect(result.perRule['gym']?.cappedFromWeekly).toBe(true);
  });

  it('does not cap when prior positive days are below the cap', () => {
    const entries = [
      makeEntry('2024-06-03', { gym: 'yes' }, { id: 'e1' }),
      makeEntry('2024-06-04', { gym: 'yes' }, { id: 'e2' }),
      makeEntry('2024-06-05', { gym: 'yes' }, { id: 'e3' }),
    ];
    const wed = entries[2]!;
    const result = evaluateEntry(challenge, wed, member, entries);
    expect(result.perRule['gym']?.points).toBe(1);
    expect(result.perRule['gym']?.cappedFromWeekly).toBeFalsy();
  });

  it('cap counts distinct dates, not entries — same-day resave does not double-count', () => {
    // Three separate entry objects for the same 4 dates (cap = 4).
    // The 5th entry (same date as e4, different id) should still be capped.
    const entries = [
      makeEntry('2024-06-03', { gym: 'yes' }, { id: 'e1' }),
      makeEntry('2024-06-04', { gym: 'yes' }, { id: 'e2' }),
      makeEntry('2024-06-05', { gym: 'yes' }, { id: 'e3' }),
      makeEntry('2024-06-06', { gym: 'yes' }, { id: 'e4' }),
      // "Resave" of June 6 — distinct dates in prior entries = 4 >= cap
      makeEntry('2024-06-07', { gym: 'yes' }, { id: 'e5' }),
    ];
    const e5 = entries[4]!;
    const result = evaluateEntry(challenge, e5, member, entries);
    expect(result.perRule['gym']?.cappedFromWeekly).toBe(true);
  });

  it('cap resets across week boundaries', () => {
    // Week 1 (Jun 1–7): 4 yes → fills cap.
    // Week 2 (Jun 8–14): 1st yes should score normally.
    const entries = [
      makeEntry('2024-06-03', { gym: 'yes' }, { id: 'e1' }),
      makeEntry('2024-06-04', { gym: 'yes' }, { id: 'e2' }),
      makeEntry('2024-06-05', { gym: 'yes' }, { id: 'e3' }),
      makeEntry('2024-06-06', { gym: 'yes' }, { id: 'e4' }),
      makeEntry('2024-06-08', { gym: 'yes' }, { id: 'e5' }), // week 2
    ];
    const e5 = entries[4]!;
    const result = evaluateEntry(challenge, e5, member, entries);
    expect(result.perRule['gym']?.points).toBe(1);
    expect(result.perRule['gym']?.cappedFromWeekly).toBeFalsy();
  });

  it('free pass counts as a scoring day for cap purposes', () => {
    const entries = [
      makeEntry('2024-06-03', { gym: 'yes' }, { id: 'e1' }),
      makeEntry('2024-06-04', { gym: 'yes' }, { id: 'e2' }),
      makeEntry('2024-06-05', { gym: 'yes' }, { id: 'e3' }),
      makeEntry('2024-06-06', { gym: 'free' }, { id: 'e4' }), // free pass = 4th scoring day
      makeEntry('2024-06-07', { gym: 'yes' }, { id: 'e5' }),  // 5th → capped
    ];
    const e5 = entries[4]!;
    const result = evaluateEntry(challenge, e5, member, entries);
    expect(result.perRule['gym']?.cappedFromWeekly).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Counter rule
// ---------------------------------------------------------------------------

describe('counter rule', () => {
  const rule = {
    id: 'steps',
    kind: 'counter' as const,
    name: 'Steps',
    order: 0,
    target: 10_000,
    maxPoints: 5,
    unit: 'steps',
    decimals: 0,
  };
  const challenge = makeChallenge([rule]);
  const member = makeMember();

  it('awards maxPoints when target is reached', () => {
    const entry = makeEntry('2024-06-01', { steps: 10_000 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['steps']?.points).toBe(5);
  });

  it('awards maxPoints when target is exceeded', () => {
    const entry = makeEntry('2024-06-01', { steps: 15_000 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['steps']?.points).toBe(5);
  });

  it('awards 0 for 0 steps', () => {
    const entry = makeEntry('2024-06-01', { steps: 0 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['steps']?.points).toBe(0);
  });

  it('scales linearly for partial progress (5000 steps → 2.5 pts)', () => {
    const entry = makeEntry('2024-06-01', { steps: 5_000 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['steps']?.points).toBe(2.5);
  });

  it('returns 0 when rule not logged', () => {
    const entry = makeEntry('2024-06-01', {});
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['steps']?.points).toBe(0);
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['steps']?.rawValue).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Range rule
// ---------------------------------------------------------------------------

describe('range rule', () => {
  const rule = {
    id: 'sleep',
    kind: 'range' as const,
    name: 'Sleep',
    order: 0,
    min: 7,
    max: 9,
    pointsAtMin: 1,
    pointsAtMax: 3,
    pointsOutside: -1,
    unit: 'hrs',
    decimals: 1,
  };
  const challenge = makeChallenge([rule]);
  const member = makeMember();

  it('awards pointsAtMin at lower bound', () => {
    const entry = makeEntry('2024-06-01', { sleep: 7 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['sleep']?.points).toBe(1);
  });

  it('awards pointsAtMax at upper bound', () => {
    const entry = makeEntry('2024-06-01', { sleep: 9 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['sleep']?.points).toBe(3);
  });

  it('scales linearly inside range', () => {
    const entry = makeEntry('2024-06-01', { sleep: 8 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['sleep']?.points).toBe(2);
  });

  it('awards pointsOutside for value below range', () => {
    const entry = makeEntry('2024-06-01', { sleep: 5 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['sleep']?.points).toBe(-1);
  });

  it('awards pointsOutside for value above range', () => {
    const entry = makeEntry('2024-06-01', { sleep: 11 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['sleep']?.points).toBe(-1);
  });

  it('supports legacy pointsInside as flat in-band score', () => {
    const legacyRule = {
      ...rule,
      pointsAtMin: undefined,
      pointsAtMax: undefined,
      pointsInside: 2,
    } as typeof rule & { pointsInside: number };
    const legacyChallenge = makeChallenge([legacyRule]);
    const entry = makeEntry('2024-06-01', { sleep: 8 });
    expect(evaluateEntry(legacyChallenge, entry, member, [entry]).perRule['sleep']?.points).toBe(2);
  });

  it('returns 0 when rule not logged', () => {
    const entry = makeEntry('2024-06-01', {});
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['sleep']?.rawValue).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Penalty rule
// ---------------------------------------------------------------------------

describe('penalty rule', () => {
  const rule: PenaltyRule = {
    id: 'junk',
    kind: 'penalty',
    name: 'Junk Food',
    order: 0,
    pointsClean: 1,
    pointsPerInfraction: -1,
    pointsFree: 1,
    weeklyFirstWaived: true,
    freePasses: { count: 5, lifetime: true },
  };
  const challenge = makeChallenge([rule]);
  const member = makeMember();

  it('awards pointsClean for clean day', () => {
    const entry = makeEntry('2024-06-01', { junk: 'clean' });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['junk']?.points).toBe(1);
  });

  it('awards pointsFree for free pass and marks usedFreePass', () => {
    const entry = makeEntry('2024-06-01', { junk: 'free' });
    const r = evaluateEntry(challenge, entry, member, [entry]).perRule['junk'];
    expect(r?.points).toBe(1);
    expect(r?.usedFreePass).toBe(true);
  });

  it('returns pointsPerInfraction for infraction (non-first of week)', () => {
    const prior = makeEntry('2024-06-03', { junk: 'infraction' }, { id: 'e1' });
    const current = makeEntry('2024-06-04', { junk: 'infraction' }, { id: 'e2' });
    const r = evaluateEntry(challenge, current, member, [prior, current]).perRule['junk'];
    expect(r?.points).toBe(-1);
    expect(r?.waivedFromPenalty).toBeFalsy();
  });

  it('waives FIRST infraction of the week', () => {
    const entry = makeEntry('2024-06-03', { junk: 'infraction' });
    const r = evaluateEntry(challenge, entry, member, [entry]).perRule['junk'];
    expect(r?.points).toBe(0);
    expect(r?.waivedFromPenalty).toBe(true);
  });

  it('waiver applies once per week; second infraction scores normally', () => {
    const mon = makeEntry('2024-06-03', { junk: 'infraction' }, { id: 'e1' }); // waived
    const tue = makeEntry('2024-06-04', { junk: 'infraction' }, { id: 'e2' }); // -1
    const r = evaluateEntry(challenge, tue, member, [mon, tue]).perRule['junk'];
    expect(r?.points).toBe(-1);
  });

  it('waiver resets at week boundary', () => {
    // Week 1 (Jun 1–7) already had an infraction.
    const w1 = makeEntry('2024-06-03', { junk: 'infraction' }, { id: 'e1' });
    // Week 2 (Jun 8–14) first infraction should be waived.
    const w2 = makeEntry('2024-06-08', { junk: 'infraction' }, { id: 'e2' });
    const r = evaluateEntry(challenge, w2, member, [w1, w2]).perRule['junk'];
    expect(r?.points).toBe(0);
    expect(r?.waivedFromPenalty).toBe(true);
  });

  it('no waiver when weeklyFirstWaived is false', () => {
    const noWaiver: PenaltyRule = { ...rule, id: 'junk2', weeklyFirstWaived: false };
    const ch = makeChallenge([noWaiver]);
    const entry = makeEntry('2024-06-03', { junk2: 'infraction' });
    const r = evaluateEntry(ch, entry, member, [entry]).perRule['junk2'];
    expect(r?.points).toBe(-1);
    expect(r?.waivedFromPenalty).toBeFalsy();
  });

  it('returns 0 when rule not logged', () => {
    const entry = makeEntry('2024-06-01', {});
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['junk']?.rawValue).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tracker rule
// ---------------------------------------------------------------------------

describe('tracker rule', () => {
  const rule = {
    id: 'weight',
    kind: 'tracker' as const,
    name: 'Weight',
    order: 0,
    maxPoints: 30,
    unit: 'lb',
    decimals: 1,
  };
  const challenge = makeChallenge([rule]);

  const memberWithGoal = makeMember({
    trackerConfig: {
      ruleId: 'weight',
      startVal: 200,
      goalVal: 180,
      direction: 'down',
      lockedAt: { seconds: 0, nanoseconds: 0 } as never,
    },
  });

  it('returns 0 when no tracker config set', () => {
    const member = makeMember(); // no trackerConfig
    const entry = makeEntry('2024-06-01', { weight: 195 });
    expect(evaluateEntry(challenge, entry, member, [entry]).perRule['weight']?.points).toBe(0);
  });

  it('returns 0 when rule not logged', () => {
    const entry = makeEntry('2024-06-01', {});
    expect(evaluateEntry(challenge, entry, memberWithGoal, [entry]).perRule['weight']?.rawValue).toBeNull();
  });

  it('awards full maxPoints at goal for direction=down', () => {
    const entry = makeEntry('2024-06-01', { weight: 180 });
    expect(evaluateEntry(challenge, entry, memberWithGoal, [entry]).perRule['weight']?.points).toBe(30);
  });

  it('awards 0 pts at start value', () => {
    const entry = makeEntry('2024-06-01', { weight: 200 });
    expect(evaluateEntry(challenge, entry, memberWithGoal, [entry]).perRule['weight']?.points).toBe(0);
  });

  it('awards proportional pts at midpoint (190 lb = 50% = 15 pts)', () => {
    const entry = makeEntry('2024-06-01', { weight: 190 });
    expect(evaluateEntry(challenge, entry, memberWithGoal, [entry]).perRule['weight']?.points).toBe(15);
  });

  it('caps at maxPoints when value overshoots the goal', () => {
    const entry = makeEntry('2024-06-01', { weight: 170 }); // 30lb below start, goal was -20
    expect(evaluateEntry(challenge, entry, memberWithGoal, [entry]).perRule['weight']?.points).toBe(30);
  });

  it('awards proportional pts for direction=up', () => {
    const memberUp = makeMember({
      trackerConfig: {
        ruleId: 'weight',
        startVal: 0,
        goalVal: 100,
        direction: 'up',
        lockedAt: { seconds: 0, nanoseconds: 0 } as never,
      },
    });
    const entry = makeEntry('2024-06-01', { weight: 50 });
    expect(evaluateEntry(challenge, entry, memberUp, [entry]).perRule['weight']?.points).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Streak rule (produces 0 in evaluateEntry; streaks handled in aggregate)
// ---------------------------------------------------------------------------

describe('streak rule in evaluateEntry', () => {
  it('always produces 0 pts — streak bonuses are computed in aggregate', () => {
    const gymRule: BinaryRule = {
      id: 'gym',
      kind: 'binary',
      name: 'Gym',
      order: 0,
      pointsYes: 1,
      pointsNo: 0,
      pointsFree: 1,
    };
    const streakRule = {
      id: 'streak7',
      kind: 'streak' as const,
      name: '7-Day Gym Streak',
      order: 1,
      ruleRef: 'gym',
      daysRequired: 7,
      bonusPoints: 5,
      repeatable: false,
    };
    const challenge = makeChallenge([gymRule, streakRule]);
    const member = makeMember();
    const entry = makeEntry('2024-06-07', { gym: 'yes' });
    const result = evaluateEntry(challenge, entry, member, [entry]);
    expect(result.perRule['streak7']?.points).toBe(0);
    expect(result.perRule['streak7']?.rawValue).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Total points accumulation
// ---------------------------------------------------------------------------

describe('evaluateEntry total points', () => {
  it('sums all rule points correctly', () => {
    const gym: BinaryRule = {
      id: 'gym', kind: 'binary', name: 'Gym', order: 0,
      pointsYes: 1, pointsNo: 0, pointsFree: 1,
    };
    const steps = {
      id: 'steps', kind: 'counter' as const, name: 'Steps', order: 1,
      target: 10_000, maxPoints: 5, unit: 'steps', decimals: 0,
    };
    const challenge = makeChallenge([gym, steps]);
    const member = makeMember();
    const entry = makeEntry('2024-06-01', { gym: 'yes', steps: 10_000 });
    const result = evaluateEntry(challenge, entry, member, [entry]);
    expect(result.totalPoints).toBe(6); // 1 + 5
  });
});

// ---------------------------------------------------------------------------
// isFreePassExhausted
// ---------------------------------------------------------------------------

describe('isFreePassExhausted', () => {
  const rule: BinaryRule = {
    id: 'gym', kind: 'binary', name: 'Gym', order: 0,
    pointsYes: 1, pointsNo: 0, pointsFree: 1,
    freePasses: { count: 3, lifetime: true },
  };

  it('returns true when no free passes configured', () => {
    const noFree: BinaryRule = { ...rule, id: 'nofree', freePasses: null };
    expect(isFreePassExhausted(noFree, [])).toBe(true);
  });

  it('returns false when passes remain', () => {
    const entries = [makeEntry('2024-06-01', { gym: 'free' })];
    expect(isFreePassExhausted(rule, entries)).toBe(false);
  });

  it('returns true when all passes used', () => {
    const entries = [
      makeEntry('2024-06-01', { gym: 'free' }, { id: 'e1' }),
      makeEntry('2024-06-02', { gym: 'free' }, { id: 'e2' }),
      makeEntry('2024-06-03', { gym: 'free' }, { id: 'e3' }),
    ];
    expect(isFreePassExhausted(rule, entries)).toBe(true);
  });

  it('returns false when no entries logged', () => {
    expect(isFreePassExhausted(rule, [])).toBe(false);
  });
});
