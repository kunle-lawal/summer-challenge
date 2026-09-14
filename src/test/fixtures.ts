/**
 * Fixtures for render tests. Shaped like real Firestore documents, with a
 * rule of every kind so a screen that mishandles one is caught.
 */
import type { Challenge, Entry, Member, Rule } from '@/types';

const ts = { seconds: 0, nanoseconds: 0 } as never;

/** The account that owns the fixture challenge. */
export const OWNER_UID = 'owner-uid';

export const RULES: Rule[] = [
  { id: 'gym', kind: 'binary', name: 'Gym', order: 0, pointsYes: 1, pointsNo: 0, pointsFree: 1,
    freePasses: { count: 5, lifetime: true }, weeklyCap: { maxScoringDays: 4 } },
  { id: 'steps', kind: 'counter', name: 'Steps', order: 1, target: 10_000, maxPoints: 5, unit: 'steps', decimals: 0 },
  { id: 'sleep', kind: 'range', name: 'Sleep', order: 2, min: 7, max: 9, pointsAtMin: 1, pointsAtMax: 1,
    pointsOutside: 0, unit: 'h', decimals: 1 },
  { id: 'junk', kind: 'penalty', name: 'Junk food', order: 3, pointsClean: 0, pointsPerInfraction: -1,
    pointsFree: 0, weeklyFirstWaived: true, freePasses: { count: 5, lifetime: true } },
  { id: 'streak', kind: 'streak', name: 'Clean streak', order: 4, ruleRef: 'junk', daysRequired: 7,
    bonusPoints: 5, repeatable: true },
  { id: 'weight', kind: 'tracker', name: 'Personal goal', order: 5, maxPoints: 30, unit: 'lb', decimals: 1 },
];

export function makeChallenge(over: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1',
    slug: 'abc123',
    name: 'Summer Challenge',
    createdAt: ts,
    status: 'active',
    ownerUid: OWNER_UID,
    config: {
      startDate: '2026-05-01',
      endDate: '2026-07-26',
      weekAnchor: '2026-05-01',
      timezone: 'UTC',
      rules: RULES,
    },
    ...over,
  };
}

export function makeMember(over: Partial<Member> = {}): Member {
  return { id: 'm1', name: 'Kunle', createdAt: ts, active: true, removedAt: null, uid: null, ...over };
}

export const MEMBERS: Member[] = [
  makeMember(),
  makeMember({ id: 'm2', name: 'Ella' }),
  makeMember({ id: 'm3', name: 'Scar' }),
];

export function makeEntry(date: string, values: Entry['values'], memberId = 'm1'): Entry {
  return {
    id: `e-${memberId}-${date}`,
    memberId,
    date,
    values,
    pts: 0,
    createdAt: ts,
    updatedAt: ts,
    createdByMemberId: memberId,
  };
}

export const ENTRIES: Entry[] = [
  makeEntry('2026-05-20', { gym: 'yes', steps: 9400, sleep: 7.5, junk: 'clean', weight: 187.5 }),
  makeEntry('2026-05-21', { gym: 'free', steps: 10_400, sleep: 8, junk: 'infraction' }),
  makeEntry('2026-05-20', { gym: 'yes', steps: 12_000 }, 'm2'),
];
