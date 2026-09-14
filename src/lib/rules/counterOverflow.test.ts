import { describe, it, expect } from 'vitest';
import type { Challenge, CounterRule, Entry, Member, StreakRule } from '../../types';
import { evaluateEntry } from './evaluate';
import { maxDailyPoints, qualifiesForStreak } from './kinds';
import { formatRuleFormula, explainRule } from './ruleDocs';

const ts = { seconds: 0, nanoseconds: 0 } as never;
const member: Member = { id: 'm1', name: 'K', createdAt: ts, active: true, removedAt: null };

const base: CounterRule = {
  id: 'steps', kind: 'counter', name: 'Steps', order: 0,
  target: 10_000, maxPoints: 5, unit: 'steps', decimals: 0,
};

function score(rule: CounterRule, value: number): number {
  const challenge: Challenge = {
    id: 'c', slug: 's', name: 'n', createdAt: ts, status: 'active',
    ownerPasswordHash: '', ownerPasswordSalt: '',
    config: { startDate: '2026-06-01', endDate: null, weekAnchor: '2026-06-01', timezone: 'UTC', rules: [rule] },
  };
  const entry: Entry = {
    id: 'e', memberId: 'm1', date: '2026-06-01', values: { [rule.id]: value },
    pts: 0, createdAt: ts, updatedAt: ts, createdByMemberId: 'm1',
  };
  return evaluateEntry(challenge, entry, member, [entry]).perRule[rule.id]?.points ?? 0;
}

// ---------------------------------------------------------------------------

describe('a counter that stops at the target', () => {
  it('is what a rule with no overflow set does, so old rules are untouched', () => {
    expect(score(base, 20_000)).toBe(5);
  });

  it('scales up to the target', () => {
    expect(score(base, 5_000)).toBe(2.5);
    expect(score(base, 10_000)).toBe(5);
  });

  it('is explicit about it', () => {
    expect(score({ ...base, overflow: 'cap' }, 30_000)).toBe(5);
    expect(formatRuleFormula({ ...base, overflow: 'cap' })).toBe('10,000 steps = +5 pts');
  });
});

describe('a counter that keeps paying', () => {
  const open: CounterRule = { ...base, overflow: 'linear' };

  it('pays double for double the target', () => {
    expect(score(open, 20_000)).toBe(10);
  });

  it('pays proportionally for anything in between', () => {
    expect(score(open, 15_000)).toBe(7.5);
  });

  it('still scales normally below the target', () => {
    expect(score(open, 5_000)).toBe(2.5);
  });

  it('has no ceiling at all when none is set', () => {
    expect(score(open, 200_000)).toBe(100);
  });

  it('says so in the formula', () => {
    expect(formatRuleFormula(open)).toContain('no cap');
    expect(explainRule(open)).toContain('no daily limit');
  });
});

describe('a counter that keeps paying up to a limit', () => {
  const capped: CounterRule = { ...base, overflow: 'linear', dailyMax: 15 };

  it('pays past the target', () => {
    expect(score(capped, 20_000)).toBe(10);
  });

  it('stops at the daily limit', () => {
    expect(score(capped, 40_000)).toBe(15);
    expect(score(capped, 400_000)).toBe(15);
  });

  it('names the limit in the formula', () => {
    expect(formatRuleFormula(capped)).toContain('up to +15/day');
  });
});

// ---------------------------------------------------------------------------
// The interaction that could quietly break
// ---------------------------------------------------------------------------

describe('streaks on a counter that keeps paying', () => {
  const open: CounterRule = { ...base, overflow: 'linear' };
  const streak: StreakRule = {
    id: 'st', kind: 'streak', name: 'S', order: 1,
    ruleRef: 'steps', daysRequired: 3, bonusPoints: 5, repeatable: true, qualifier: 'full',
  };

  /*
   * "Full credit" has to keep meaning "hit the target". If it meant the day's
   * ceiling, an unbounded counter would make the streak unsatisfiable — there
   * is no highest day.
   */
  it('treats full credit as hitting the target, not an unreachable ceiling', () => {
    expect(maxDailyPoints(open)).toBe(5);
    expect(qualifiesForStreak(streak, open, 5)).toBe(true);
  });

  it('still counts a day that goes well past the target', () => {
    expect(qualifiesForStreak(streak, open, 40)).toBe(true);
  });

  it('still rejects a day that falls short', () => {
    expect(qualifiesForStreak(streak, open, 4.9)).toBe(false);
  });
});

describe('edge cases', () => {
  it('scores zero rather than dividing by zero on a zero target', () => {
    expect(score({ ...base, target: 0, overflow: 'linear' }, 5_000)).toBe(0);
  });

  it('ignores a negative value', () => {
    expect(score({ ...base, overflow: 'linear' }, -100)).toBe(0);
  });

  it('ignores dailyMax when the rule stops at the target anyway', () => {
    expect(score({ ...base, overflow: 'cap', dailyMax: 99 }, 50_000)).toBe(5);
  });
});
