/**
 * Shared copy, examples, and display helpers for the six rule kinds.
 * Used by RuleEditor, CreateChallengePage, AdminPage, and log cards.
 */

import type { Rule, RuleKind, RangeRule, TrackerRule } from '../../types';
import { resolveTrackerConfig } from '../../types/member';
import type { MemberTrackerConfig } from '../../types';

// ---------------------------------------------------------------------------
// Kind descriptions (setup / editor)
// ---------------------------------------------------------------------------

export interface RuleKindInfo {
  /** Short label for kind picker buttons. */
  label: string;
  /** One-line subtitle under the label. */
  subtitle: string;
  /** Plain-language explanation shown when editing or creating. */
  description: string;
}

export const RULE_KIND_INFO: Record<RuleKind, RuleKindInfo> = {
  binary: {
    label: 'Binary',
    subtitle: 'Yes / No / Free',
    description:
      'A daily yes-or-no habit. Members pick Yes, No, or use a limited Free pass. Optional weekly cap limits how many Yes days score per week.',
  },
  counter: {
    label: 'Counter',
    subtitle: 'Number vs target',
    description:
      'A number logged each day (steps, cups of water, etc.). Points scale from 0 up to a max when the target is hit or exceeded.',
  },
  range: {
    label: 'Range',
    subtitle: 'Target band',
    description:
      'A number that should land in a band (e.g. sleep hours). Points scale linearly from a minimum at the low end of the band to a maximum at the high end. Outside the band uses a separate penalty or zero.',
  },
  penalty: {
    label: 'Penalty',
    subtitle: 'Clean vs slip',
    description:
      'Track something you want to avoid. Clean days earn points; each slip costs points. First slip each week can be waived, and Free passes skip the penalty.',
  },
  streak: {
    label: 'Streak',
    subtitle: 'Bonus milestone',
    description:
      'Automatic bonus when another rule is hit N days in a row. Does not have its own log input — it watches a rule you already track.',
  },
  tracker: {
    label: 'Tracker',
    subtitle: 'Personal goal',
    description:
      'Adds a personal goal slot to the challenge. You set how many points progress is worth and a default unit. Each member chooses what they track (weight loss, squat PR, measurements, etc.) and sets their own start and goal on first log.',
  },
};

// ---------------------------------------------------------------------------
// Example rules (one per kind — "Load example" in editor)
// ---------------------------------------------------------------------------

export function exampleRuleForKind(
  kind: RuleKind,
  id: string,
  order: number,
  streakRuleRef?: string,
): Rule {
  switch (kind) {
    case 'binary':
      return {
        id,
        kind,
        name: 'Gym',
        emoji: '🏋️',
        order,
        pointsYes: 1,
        pointsNo: 0,
        pointsFree: 1,
        freePasses: { count: 5, lifetime: true },
        weeklyCap: { maxScoringDays: 4 },
      };
    case 'counter':
      return {
        id,
        kind,
        name: 'Steps',
        emoji: '👟',
        order,
        target: 10_000,
        maxPoints: 5,
        unit: 'steps',
        decimals: 0,
      };
    case 'range':
      return {
        id,
        kind,
        name: 'Sleep',
        emoji: '😴',
        order,
        min: 7,
        max: 9,
        pointsAtMin: 1,
        pointsAtMax: 3,
        pointsOutside: 0,
        unit: 'hrs',
        decimals: 1,
      };
    case 'penalty':
      return {
        id,
        kind,
        name: 'Junk Food',
        emoji: '🍔',
        order,
        pointsClean: 1,
        pointsPerInfraction: -1,
        pointsFree: 1,
        weeklyFirstWaived: true,
        freePasses: { count: 5, lifetime: true },
      };
    case 'streak':
      return {
        id,
        kind,
        name: 'Gym Streak',
        emoji: '🔥',
        order,
        ruleRef: streakRuleRef ?? '',
        daysRequired: 7,
        bonusPoints: 5,
        repeatable: true,
      };
    case 'tracker':
      return {
        id,
        kind,
        name: 'Personal Goal',
        emoji: '🎯',
        order,
        maxPoints: 30,
        unit: 'lb',
        decimals: 1,
      };
  }
}

// ---------------------------------------------------------------------------
// Range point bounds (supports legacy `pointsInside` in stored configs)
// ---------------------------------------------------------------------------

type RangeRuleLegacy = RangeRule & { pointsInside?: number };

export function resolveRangePoints(rule: RangeRuleLegacy): {
  atMin: number;
  atMax: number;
} {
  if (typeof rule.pointsAtMin === 'number') {
    return {
      atMin: rule.pointsAtMin,
      atMax: rule.pointsAtMax ?? rule.pointsAtMin,
    };
  }
  const flat = rule.pointsInside ?? 0;
  return { atMin: flat, atMax: flat };
}

/** Points for a value inside [min, max], linear from atMin to atMax. */
export function scoreRangeValue(
  rule: RangeRuleLegacy,
  value: number,
): number | null {
  if (value < rule.min || value > rule.max) return null;
  const { atMin, atMax } = resolveRangePoints(rule);
  const span = rule.max - rule.min;
  if (span === 0) return atMax;
  const t = (value - rule.min) / span;
  return atMin + t * (atMax - atMin);
}

/** Migrate legacy stored range rules for editing / display. */
export function normalizeRuleForEdit(rule: Rule): Rule {
  if (rule.kind !== 'range') return rule;
  const r = rule as RangeRule & { pointsInside?: number };
  if (typeof r.pointsAtMin === 'number') return rule;
  const flat = r.pointsInside ?? 0;
  const { pointsInside: _legacy, ...rest } = r;
  return { ...rest, pointsAtMin: flat, pointsAtMax: flat };
}


function fmtPts(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

export function formatRuleFormula(r: Rule): string {
  switch (r.kind) {
    case 'binary':
      return `yes = ${fmtPts(r.pointsYes)}`;
    case 'counter':
      return `${r.target.toLocaleString()} ${r.unit} = ${fmtPts(r.maxPoints)} pts`;
    case 'range': {
      const { atMin, atMax } = resolveRangePoints(r);
      if (atMin === atMax) {
        return `${r.min}–${r.max} ${r.unit} = ${fmtPts(atMin)} pts`;
      }
      return `${r.min}–${r.max} ${r.unit} = ${fmtPts(atMin)}→${fmtPts(atMax)} pts`;
    }
    case 'penalty':
      return `clean = ${fmtPts(r.pointsClean)} / slip = ${fmtPts(r.pointsPerInfraction)}`;
    case 'streak':
      return `${r.daysRequired} days = ${fmtPts(r.bonusPoints)} pts`;
    case 'tracker':
      return `personal goal · up to ${fmtPts(r.maxPoints)} pts`;
  }
}

/** Member-facing subtitle for a configured tracker goal. */
export function formatTrackerMemberMeta(
  config: MemberTrackerConfig,
  rule: TrackerRule,
): string {
  const resolved = resolveTrackerConfig(config, rule.unit, rule.name);
  const fmt = (n: number) =>
    rule.decimals === 0 ? String(Math.round(n)) : n.toFixed(rule.decimals);
  return `${resolved.label} · ${fmt(resolved.startVal)}→${fmt(resolved.goalVal)} ${resolved.unit}`;
}
