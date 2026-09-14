import { describe, it, expect } from 'vitest';
import type { Rule } from '../../types';
import { CHALLENGE_TEMPLATES, DEFAULT_TEMPLATE_ID } from './templates';

/** Deterministic ids, so a failure names the rule rather than a nanoid. */
function idFactory() {
  let n = 0;
  return () => `r${n++}`;
}

const built = CHALLENGE_TEMPLATES.map(t => ({ template: t, rules: t.build(idFactory()) }));
const withRules = built.filter(b => b.rules.length > 0);

/**
 * Everything going right, every day — the budget the numbers were picked
 * against. Mirrors how aggregate.ts actually accumulates, so drift in either
 * shows up here.
 */
function ceilingOf(rules: Rule[], weeks: number): number {
  const days = weeks * 7;
  const byId = new Map(rules.map(r => [r.id, r]));

  return rules.reduce((total, rule) => {
    switch (rule.kind) {
      case 'binary':
        return total + (rule.weeklyCap
          ? rule.weeklyCap.maxScoringDays * rule.pointsYes * weeks
          : rule.pointsYes * days);
      case 'counter':
        return total + rule.maxPoints * days;
      case 'range':
        return total + Math.max(rule.pointsAtMin, rule.pointsAtMax) * days;
      case 'penalty':
        return total + rule.pointsClean * days;
      case 'streak': {
        // A streak on a capped rule can't actually run clean; the guard below
        // rejects those, so this arithmetic only ever sees uncapped refs.
        void byId.get(rule.ruleRef);
        return total + (rule.repeatable
          ? Math.floor(days / rule.daysRequired) * rule.bonusPoints
          : rule.bonusPoints);
      }
      case 'tracker':
        return total + rule.maxPoints;
    }
  }, 0);
}

describe.each(built)('$template.name', ({ template, rules }) => {
  it('has unique rule ids', () => {
    expect(new Set(rules.map(r => r.id)).size).toBe(rules.length);
  });

  it('numbers its rules from zero with no gaps', () => {
    expect(rules.map(r => r.order)).toEqual(rules.map((_, i) => i));
  });

  it('gives every rule a name', () => {
    for (const rule of rules) expect(rule.name.trim().length).toBeGreaterThan(0);
  });

  it('states a ceiling that matches its own numbers', () => {
    if (rules.length === 0) return;
    // Within a point, since the stated figure is rounded for display.
    expect(Math.abs(ceilingOf(rules, template.weeks) - template.ceiling)).toBeLessThanOrEqual(1);
  });

  it('runs for somewhere between six and twelve weeks', () => {
    expect(template.weeks).toBeGreaterThanOrEqual(6);
    expect(template.weeks).toBeLessThanOrEqual(12);
  });
});

// ---------------------------------------------------------------------------
// The streak rules that are easy to get wrong
// ---------------------------------------------------------------------------

describe.each(withRules)('$template.name — streaks', ({ rules }) => {
  const streaks = rules.filter(r => r.kind === 'streak');
  const byId = new Map(rules.map(r => [r.id, r]));

  it('points every streak at a rule in the same challenge', () => {
    for (const s of streaks) {
      if (s.kind !== 'streak') continue;
      expect(byId.get(s.ruleRef), `${s.name} → ${s.ruleRef}`).toBeDefined();
    }
  });

  /*
   * A capped day scores zero, and a streak counts days that scored above zero.
   * So a streak watching a capped rule breaks every single time the cap bites —
   * it looks fine in the editor and is close to unwinnable in practice.
   */
  it('never watches a capped binary', () => {
    for (const s of streaks) {
      if (s.kind !== 'streak') continue;
      const ref = byId.get(s.ruleRef);
      if (ref?.kind === 'binary') {
        expect(ref.weeklyCap, `${s.name} watches capped ${ref.name}`).toBeFalsy();
      }
    }
  });

  /* Any value above zero scores, so one logged step would keep it alive. */
  it('never watches a counter', () => {
    for (const s of streaks) {
      if (s.kind !== 'streak') continue;
      expect(byId.get(s.ruleRef)?.kind, `${s.name} watches a counter`).not.toBe('counter');
    }
  });

  it('only watches a penalty whose clean days actually score', () => {
    for (const s of streaks) {
      if (s.kind !== 'streak') continue;
      const ref = byId.get(s.ruleRef);
      if (ref?.kind === 'penalty') {
        expect(ref.pointsClean, `${s.name} watches ${ref.name}`).toBeGreaterThan(0);
      }
    }
  });

  it('only watches a range that scores inside the band', () => {
    for (const s of streaks) {
      if (s.kind !== 'streak') continue;
      const ref = byId.get(s.ruleRef);
      if (ref?.kind === 'range') {
        expect(Math.min(ref.pointsAtMin, ref.pointsAtMax)).toBeGreaterThan(0);
      }
    }
  });

  it('asks for a streak length that can complete more than once', () => {
    for (const s of streaks) {
      if (s.kind !== 'streak') continue;
      expect(s.daysRequired).toBeGreaterThanOrEqual(3);
      expect(s.daysRequired).toBeLessThanOrEqual(14);
    }
  });
});

// ---------------------------------------------------------------------------
// Fairness
// ---------------------------------------------------------------------------

describe.each(withRules)('$template.name — fairness', ({ template, rules }) => {
  it('gives free passes on every rule that can cost points', () => {
    for (const rule of rules) {
      if (rule.kind === 'penalty') {
        expect(rule.freePasses?.count ?? 0, `${rule.name} has no passes`).toBeGreaterThan(0);
      }
    }
  });

  it('lets a weekly-capped rule be missed without wrecking the run', () => {
    for (const rule of rules) {
      if (rule.kind === 'binary' && rule.weeklyCap) {
        expect(rule.freePasses?.count ?? 0, `${rule.name} has no passes`).toBeGreaterThan(0);
      }
    }
  });

  /*
   * With two people there is nowhere to hide, so no single rule should be able
   * to settle it. A quarter of the ceiling is the line.
   */
  it('has no single rule worth more than a quarter of everything', () => {
    const total = ceilingOf(rules, template.weeks);
    for (const rule of rules) {
      const share = ceilingOf([rule], template.weeks) / total;
      expect(share, `${rule.name} is ${Math.round(share * 100)}% of the challenge`)
        .toBeLessThanOrEqual(0.25);
    }
  });

  it('includes a personal goal, so it is not decided by who started fitter', () => {
    expect(rules.some(r => r.kind === 'tracker')).toBe(true);
  });

  it('rewards consistency with at least one streak', () => {
    expect(rules.some(r => r.kind === 'streak')).toBe(true);
  });
});

describe('the template list', () => {
  it('has a default that exists', () => {
    expect(CHALLENGE_TEMPLATES.some(t => t.id === DEFAULT_TEMPLATE_ID)).toBe(true);
  });

  it('has unique template ids', () => {
    expect(new Set(CHALLENGE_TEMPLATES.map(t => t.id)).size).toBe(CHALLENGE_TEMPLATES.length);
  });

  it('offers an empty option for people who want to build their own', () => {
    expect(CHALLENGE_TEMPLATES.some(t => t.build(idFactory()).length === 0)).toBe(true);
  });
});
