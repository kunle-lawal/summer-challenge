import { describe, it, expect } from 'vitest';
import type { BinaryRule, Entry, PenaltyRule, Rule } from '../../types';
import { activeRules, isRuleActive } from '../../types';
import { getFreePassState } from './kinds';
import { getLoggedDayStreak } from './aggregate';

function makeEntry(date: string, values: Entry['values']): Entry {
  return {
    id: `e-${date}`,
    memberId: 'm1',
    date,
    values,
    pts: 0,
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    updatedAt: { seconds: 0, nanoseconds: 0 } as never,
    createdByMemberId: 'm1',
  };
}

const gym: BinaryRule = {
  id: 'gym', kind: 'binary', name: 'Gym', order: 0,
  pointsYes: 1, pointsNo: 0, pointsFree: 1,
  freePasses: { count: 5, lifetime: true },
};

const junk: PenaltyRule = {
  id: 'junk', kind: 'penalty', name: 'Junk', order: 1,
  pointsClean: 0, pointsPerInfraction: -1, pointsFree: 0,
  weeklyFirstWaived: true,
  freePasses: { count: 2, lifetime: true },
};

// ---------------------------------------------------------------------------
// getFreePassState
// ---------------------------------------------------------------------------

describe('getFreePassState', () => {
  it('reports the full quota when nothing has been spent', () => {
    expect(getFreePassState(gym, [])).toMatchObject({ offered: true, quota: 5, used: 0, left: 5 });
  });

  it('counts passes spent across the whole challenge, not just this week', () => {
    const entries = [
      makeEntry('2026-05-01', { gym: 'free' }),
      makeEntry('2026-06-14', { gym: 'free' }),
      makeEntry('2026-06-15', { gym: 'yes' }),
    ];
    expect(getFreePassState(gym, entries)).toMatchObject({ used: 2, left: 3 });
  });

  it('reports none offered when the rule has no free passes configured', () => {
    const { freePasses: _omitted, ...noPasses } = gym;
    expect(getFreePassState(noPasses as Rule, [])).toMatchObject({ offered: false, left: 0 });
  });

  it('reports none offered when the quota is zero', () => {
    const zero: BinaryRule = { ...gym, freePasses: { count: 0, lifetime: true } };
    expect(getFreePassState(zero, [])).toMatchObject({ offered: false });
  });

  it('never reports a negative balance when quota is cut below what was spent', () => {
    const shrunk: BinaryRule = { ...gym, freePasses: { count: 1, lifetime: true } };
    const entries = [makeEntry('2026-05-01', { gym: 'free' }), makeEntry('2026-05-02', { gym: 'free' })];
    expect(getFreePassState(shrunk, entries)).toMatchObject({ used: 2, left: 0 });
  });

  it('works on penalty rules too', () => {
    const entries = [makeEntry('2026-05-01', { junk: 'free' })];
    expect(getFreePassState(junk, entries)).toMatchObject({ offered: true, quota: 2, used: 1, left: 1 });
  });

  it('is not offered on a kind that has no free passes', () => {
    const steps: Rule = { id: 's', kind: 'counter', name: 'Steps', order: 2, target: 1, maxPoints: 1, unit: 'x', decimals: 0 };
    expect(getFreePassState(steps, [])).toMatchObject({ offered: false });
  });

  // The reason excludeDate exists: re-opening the day you spent a pass on must
  // not read as though that pass is gone AND still spendable.
  describe('when re-editing the day a pass was spent on', () => {
    const entries = [
      makeEntry('2026-06-10', { gym: 'free' }),
      makeEntry('2026-06-14', { gym: 'free' }),
    ];

    it('excludes that day from the used count', () => {
      expect(getFreePassState(gym, entries, '2026-06-14')).toMatchObject({ used: 1, left: 4 });
    });

    it('flags that a pass is currently spent on that day', () => {
      expect(getFreePassState(gym, entries, '2026-06-14').spentOnDate).toBe(true);
    });

    it('does not flag a day with no pass on it', () => {
      expect(getFreePassState(gym, entries, '2026-06-15')).toMatchObject({ used: 2, spentOnDate: false });
    });
  });
});

// ---------------------------------------------------------------------------
// getLoggedDayStreak
// ---------------------------------------------------------------------------

describe('getLoggedDayStreak', () => {
  const on = (...dates: string[]) => dates.map(d => makeEntry(d, { gym: 'yes' }));

  it('is zero with no entries', () => {
    expect(getLoggedDayStreak([], '2026-06-15')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(getLoggedDayStreak(on('2026-06-13', '2026-06-14', '2026-06-15'), '2026-06-15')).toBe(3);
  });

  it('stops at the first gap', () => {
    expect(getLoggedDayStreak(on('2026-06-10', '2026-06-14', '2026-06-15'), '2026-06-15')).toBe(2);
  });

  // Otherwise every streak in the challenge would read zero until its owner
  // got around to logging that morning.
  it('still counts when the last log was yesterday', () => {
    expect(getLoggedDayStreak(on('2026-06-13', '2026-06-14'), '2026-06-15')).toBe(2);
  });

  it('is broken once two days have passed', () => {
    expect(getLoggedDayStreak(on('2026-06-12', '2026-06-13'), '2026-06-15')).toBe(0);
  });

  it('counts a duplicated date once', () => {
    const entries = [...on('2026-06-14', '2026-06-15'), makeEntry('2026-06-15', { junk: 'clean' })];
    expect(getLoggedDayStreak(entries, '2026-06-15')).toBe(2);
  });

  it('ignores entries dated after today rather than counting them', () => {
    expect(getLoggedDayStreak(on('2026-06-20'), '2026-06-15')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Rule retirement
// ---------------------------------------------------------------------------

describe('isRuleActive / activeRules', () => {
  it('treats a rule written before the field existed as active', () => {
    expect(isRuleActive(gym)).toBe(true);
  });

  it('treats an explicitly retired rule as inactive', () => {
    expect(isRuleActive({ ...gym, active: false })).toBe(false);
  });

  it('drops retired rules and returns the rest in display order', () => {
    const rules: Rule[] = [{ ...junk, order: 2 }, { ...gym, order: 1, active: false }, { ...junk, id: 'j2', order: 0 }];
    expect(activeRules(rules).map(r => r.id)).toEqual(['j2', 'junk']);
  });
});
