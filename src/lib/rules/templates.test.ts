import { describe, it, expect } from 'vitest';
import type { Rule } from '../../types';
import {
  CHALLENGE_TEMPLATES, DEFAULT_TEMPLATE_ID, ceilingOf, passSummary, templatesByFocus,
} from './templates';

/** Deterministic ids, so a failure names the rule rather than a nanoid. */
function idFactory() {
  let n = 0;
  return () => `r${n++}`;
}

const built = CHALLENGE_TEMPLATES.map(t => ({ template: t, rules: t.build(idFactory()) }));
const withRules = built.filter(b => b.rules.length > 0);

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

  it('is worth enough to be worth playing', () => {
    if (rules.length === 0) return;
    expect(ceilingOf(rules, template.weeks)).toBeGreaterThan(100);
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

  /*
   * Any value above zero scores on a counter, so a streak watching one has to
   * demand full credit or a single logged unit keeps it alive forever.
   */
  it('only watches a counter at full credit', () => {
    for (const s of streaks) {
      if (s.kind !== 'streak') continue;
      if (byId.get(s.ruleRef)?.kind === 'counter') {
        expect(s.qualifier, `${s.name} watches a counter without requiring full credit`).toBe('full');
      }
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

  /*
   * The whole point of the ask: one or two passes a week, not six for a nine
   * week run. Anything that can cost you points needs a real buffer.
   */
  it('gives at least one pass per week on everything that can bite', () => {
    for (const rule of rules) {
      const bites = rule.kind === 'penalty' || (rule.kind === 'binary' && !!rule.weeklyCap);
      if (!bites) continue;
      const count = (rule.kind === 'penalty' || rule.kind === 'binary')
        ? rule.freePasses?.count ?? 0
        : 0;
      expect(count, `${rule.name} has ${count} passes over ${template.weeks} weeks`)
        .toBeGreaterThanOrEqual(template.weeks);
    }
  });

  /*
   * These counts used to be typed into each blurb by hand, and one of them was
   * already wrong — the card claimed 13 passes where the rules gave 14.
   */
  it('quotes a pass rate that matches the rules', () => {
    const summary = passSummary(rules, template.weeks);
    if (!summary) return;
    const rates = rules
      .filter(r => r.kind === 'penalty' || r.kind === 'binary')
      .map(r => (r.kind === 'penalty' || r.kind === 'binary' ? r.freePasses?.count ?? 0 : 0))
      .filter(n => n > 0)
      .map(n => n / template.weeks);
    const low = Math.round(Math.min(...rates) * 10) / 10;
    expect(summary).toContain(String(low));
  });

  it('never quotes a pass rate below one a week', () => {
    const rates = rules
      .filter(r => r.kind === 'penalty' || (r.kind === 'binary' && !!r.weeklyCap))
      .map(r => (r.kind === 'penalty' || r.kind === 'binary' ? r.freePasses?.count ?? 0 : 0));
    for (const count of rates) {
      expect(count / template.weeks).toBeGreaterThanOrEqual(1);
    }
  });

  /*
   * A counter that keeps paying past its target has a ceiling far above what
   * anyone would realistically do, so it blows the quarter-of-the-challenge
   * budget by construction. It's a deliberate option for a custom challenge,
   * not something to ship inside a balanced template.
   */
  it('has no counter without a ceiling', () => {
    for (const rule of rules) {
      if (rule.kind !== 'counter') continue;
      const unbounded = (rule.overflow ?? 'cap') === 'linear' && rule.dailyMax == null;
      expect(unbounded, `${rule.name} can pay without limit`).toBe(false);
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

  it('offers real variety rather than reskins of one shape', () => {
    expect(CHALLENGE_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    const shapes = new Set(
      CHALLENGE_TEMPLATES.map(t =>
        t.build(idFactory()).map(r => r.kind).sort().join(','),
      ),
    );
    expect(shapes.size).toBeGreaterThanOrEqual(6);
  });

  it('groups every template under a focus, losing none', () => {
    const grouped = templatesByFocus().flatMap(g => g.templates);
    expect(grouped).toHaveLength(CHALLENGE_TEMPLATES.length);
  });
});
