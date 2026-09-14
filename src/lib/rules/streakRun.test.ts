import { describe, it, expect } from 'vitest';
import type { Challenge, Entry, Member, StreakRule } from '../../types';
import { getStreakRunAtDate, getStreakSlots } from './streakRun';

const gymId = 'gym';
const junkId = 'junk';
const streakId = 'streak5';

const gymRule = {
  id: gymId,
  kind: 'binary' as const,
  name: 'Gym',
  order: 0,
  pointsYes: 1,
  pointsNo: 0,
  pointsFree: 1,
};

const junkRule = {
  id: junkId,
  kind: 'penalty' as const,
  name: 'Junk',
  order: 1,
  pointsClean: 1,
  pointsPerInfraction: -1,
  pointsFree: 1,
  weeklyFirstWaived: true,
};

const streakRule: StreakRule = {
  id: streakId,
  kind: 'streak',
  name: 'Clean 5',
  order: 2,
  ruleRef: junkId,
  daysRequired: 5,
  bonusPoints: 2,
  repeatable: true,
};

const challenge: Challenge = {
  id: 'ch1',
  slug: 'abc123',
  name: 'Test',
  status: 'active',
  ownerPasswordHash: '',
  ownerPasswordSalt: '',
  createdAt: {} as never,
  config: {
    startDate: '2024-06-01',
    endDate: null,
    weekAnchor: '2024-06-01',
    timezone: 'UTC',
    rules: [gymRule, junkRule, streakRule],
  },
};

const member: Member = {
  id: 'm1',
  name: 'Alice',
  active: true,
  removedAt: null,
  createdAt: {} as never,
};

function entry(date: string, junk: string): Entry {
  return {
    id: `e-${date}`,
    memberId: 'm1',
    date,
    values: { [junkId]: junk },
    pts: 0,
    createdAt: {} as never,
    updatedAt: {} as never,
    createdByMemberId: 'm1',
  };
}

describe('getStreakRunAtDate', () => {
  it('returns empty when no positive days', () => {
    const run = getStreakRunAtDate(challenge, member, [], streakRule, '2024-06-05');
    expect(run.count).toBe(0);
    expect(run.runDates).toEqual([]);
  });

  it('returns consecutive run dates ending on asOfDate', () => {
    const entries = [
      entry('2024-06-03', 'clean'),
      entry('2024-06-04', 'clean'),
      entry('2024-06-05', 'clean'),
    ];
    const run = getStreakRunAtDate(challenge, member, entries, streakRule, '2024-06-05');
    expect(run.runDates).toEqual(['2024-06-03', '2024-06-04', '2024-06-05']);
    expect(run.count).toBe(3);
    expect(run.complete).toBe(false);
  });

  it('marks broken when slip logged on asOfDate', () => {
    const entries = [
      entry('2024-06-03', 'clean'),
      entry('2024-06-04', 'clean'),
      entry('2024-06-05', 'infraction'),
    ];
    const run = getStreakRunAtDate(challenge, member, entries, streakRule, '2024-06-05');
    expect(run.brokenOnDate).toBe(true);
    expect(run.count).toBe(0);
  });

  it('does not count waived infraction as a streak day', () => {
    const entries = [
      entry('2024-06-03', 'clean'),
      entry('2024-06-04', 'clean'),
      entry('2024-06-05', 'infraction'), // first of week → 0 pts
    ];
    const run = getStreakRunAtDate(challenge, member, entries, streakRule, '2024-06-04');
    expect(run.runDates).toEqual(['2024-06-03', '2024-06-04']);
  });

  it('shows only current cycle for repeatable streak', () => {
    const entries = [
      entry('2024-06-01', 'clean'),
      entry('2024-06-02', 'clean'),
      entry('2024-06-03', 'clean'),
      entry('2024-06-04', 'clean'),
      entry('2024-06-05', 'clean'),
      entry('2024-06-06', 'clean'),
    ];
    const run = getStreakRunAtDate(challenge, member, entries, streakRule, '2024-06-06');
    expect(run.runDates).toEqual(['2024-06-06']);
    expect(run.count).toBe(1);
  });

  it('shows complete when cycle finishes on asOfDate', () => {
    const entries = [
      entry('2024-06-01', 'clean'),
      entry('2024-06-02', 'clean'),
      entry('2024-06-03', 'clean'),
      entry('2024-06-04', 'clean'),
      entry('2024-06-05', 'clean'),
    ];
    const run = getStreakRunAtDate(challenge, member, entries, streakRule, '2024-06-05');
    expect(run.complete).toBe(true);
    expect(run.runDates).toHaveLength(5);
  });
});

describe('getStreakSlots', () => {
  it('projects next calendar days into empty slots', () => {
    const run = {
      runDates: ['2024-06-03', '2024-06-04', '2024-06-05'],
      count: 3,
      complete: false,
      brokenOnDate: false,
    };
    const slots = getStreakSlots(run, 5);
    expect(slots[0]?.filled).toBe(true);
    expect(slots[0]?.date).toBe('2024-06-03');
    expect(slots[3]?.filled).toBe(false);
    expect(slots[3]?.projected).toBe(true);
    expect(slots[3]?.date).toBe('2024-06-06');
    expect(slots[4]?.date).toBe('2024-06-07');
  });
});
