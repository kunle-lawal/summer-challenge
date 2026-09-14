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
    case 'counter': {
      const base = `${r.target.toLocaleString()} ${r.unit} = ${fmtPts(r.maxPoints)} pts`;
      if ((r.overflow ?? 'cap') !== 'linear') return base;
      return r.dailyMax != null ? `${base}, up to ${fmtPts(r.dailyMax)}/day` : `${base}, no cap`;
    }
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

// ---------------------------------------------------------------------------
// Plain-language explanation of one configured rule
// ---------------------------------------------------------------------------

/**
 * What a rule actually does, in this challenge, with its real numbers.
 *
 * `RULE_KIND_INFO.description` explains a *kind* to an owner who's building a
 * rule. This explains a *rule* to the person logging against it, which is a
 * different sentence — "10,000 steps is the full +5" rather than "a number
 * logged each day".
 *
 * Composed by filtering and joining so a rule without a cap or free passes
 * never leaves a dangling clause (§6).
 */
export function explainRule(rule: Rule, allRules: readonly Rule[] = []): string {
  const pts = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
  const parts: string[] = [];

  switch (rule.kind) {
    case 'binary': {
      parts.push(`Each yes is worth ${pts(rule.pointsYes)}.`);
      if (rule.pointsNo !== 0) parts.push(`A no is ${pts(rule.pointsNo)}.`);
      if (rule.weeklyCap) {
        parts.push(
          `Only the first ${rule.weeklyCap.maxScoringDays} yes ${rule.weeklyCap.maxScoringDays === 1 ? 'day' : 'days'} each week score — extra days still count as done, they just don't add points.`,
        );
      }
      if (rule.freePasses?.count) {
        parts.push(
          `You get ${rule.freePasses.count} free ${rule.freePasses.count === 1 ? 'pass' : 'passes'} for the whole challenge; each one scores like a yes.`,
        );
      }
      break;
    }
    case 'counter': {
      parts.push(
        `Points scale with the count: ${rule.target.toLocaleString()} ${rule.unit} earns ${pts(rule.maxPoints)}, and half that earns half the points.`,
      );
      if ((rule.overflow ?? 'cap') === 'linear') {
        parts.push(
          rule.dailyMax != null
            ? `Going past the target keeps paying at the same rate, up to ${pts(rule.dailyMax)} in a single day.`
            : `Going past the target keeps paying at the same rate, with no daily limit — twice the target is twice the points.`,
        );
      } else {
        parts.push(`Going past the target doesn't add more.`);
      }
      break;
    }
    case 'range': {
      const { atMin, atMax } = resolveRangePoints(rule);
      parts.push(
        atMin === atMax
          ? `Anything from ${rule.min} to ${rule.max} ${rule.unit} scores ${pts(atMin)}.`
          : `Inside ${rule.min}–${rule.max} ${rule.unit} points scale from ${pts(atMin)} at the low end to ${pts(atMax)} at the high end.`,
      );
      parts.push(
        rule.pointsOutside === 0
          ? 'Outside that range scores nothing — it is never a penalty.'
          : `Outside that range scores ${pts(rule.pointsOutside)}.`,
      );
      break;
    }
    case 'penalty': {
      if (rule.pointsClean !== 0) parts.push(`A clean day is worth ${pts(rule.pointsClean)}.`);
      parts.push(`Each slip costs ${Math.abs(rule.pointsPerInfraction)}.`);
      if (rule.weeklyFirstWaived) {
        parts.push('The first slip each week is waived automatically, so one bad night costs nothing.');
      }
      if (rule.freePasses?.count) {
        parts.push(`You have ${rule.freePasses.count} free ${rule.freePasses.count === 1 ? 'pass' : 'passes'} that skip the penalty entirely.`);
      }
      break;
    }
    case 'streak': {
      const tracked = allRules.find(r => r.id === rule.ruleRef);
      parts.push(
        `${rule.daysRequired} days in a row on ${tracked ? tracked.name : 'the tracked rule'} pays ${pts(rule.bonusPoints)}.`,
      );
      parts.push(
        rule.repeatable
          ? `The run then restarts, so it can pay again every ${rule.daysRequired} days.`
          : 'It pays once per challenge.',
      );
      parts.push('A day that scores nothing breaks the run.');
      break;
    }
    case 'tracker': {
      parts.push(
        `Progress from your starting number toward your goal is worth up to ${pts(rule.maxPoints)} across the whole challenge.`,
      );
      parts.push('Only your most recent reading counts, so log it whenever you measure.');
      break;
    }
  }

  return parts.filter(Boolean).join(' ');
}


// ---------------------------------------------------------------------------
// Blank rule per kind
// ---------------------------------------------------------------------------

/**
 * A blank rule of the given kind, with sensible starting numbers.
 *
 * Lives here rather than in the editor because both the rule editor and the
 * create flow need it.
 */
export function defaultForKind(kind: RuleKind, id: string, order: number): Rule {
	switch (kind) {
		case "binary":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				pointsYes: 1,
				pointsNo: 0,
				pointsFree: 1,
				freePasses: null,
				weeklyCap: null,
			};
		case "counter":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				target: 10000,
				maxPoints: 5,
				unit: "units",
				decimals: 0,
			};
		case "range":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				min: 5,
				max: 8,
				pointsAtMin: 1,
				pointsAtMax: 4,
				pointsOutside: 0,
				unit: "units",
				decimals: 1,
			};
		case "penalty":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				pointsClean: 1,
				pointsPerInfraction: -1,
				pointsFree: 1,
				weeklyFirstWaived: true,
				freePasses: null,
			};
		case "streak":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				ruleRef: "",
				daysRequired: 7,
				bonusPoints: 5,
				repeatable: true,
			};
		case "tracker":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				maxPoints: 30,
				unit: "units",
				decimals: 1,
			};
	}
}
