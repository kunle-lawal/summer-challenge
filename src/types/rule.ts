/**
 * Rule definitions for the v2 challenge engine.
 *
 * A challenge's `config.rules` is a `Rule[]` — a heterogeneous list where each
 * element is discriminated by `kind`. The rule kind determines:
 *   - what shape of value an Entry must store for this rule
 *   - how that value is scored
 *   - what caps / waivers / free-passes apply
 *
 * See `entry.ts` for the corresponding entry value types, and
 * `src/lib/rules/evaluate.ts` for the scoring logic that consumes these.
 */

// ---------------------------------------------------------------------------
// Kind enum
// ---------------------------------------------------------------------------

export const RULE_KINDS = [
  'binary',
  'counter',
  'range',
  'penalty',
  'streak',
  'tracker',
] as const;

export type RuleKind = (typeof RULE_KINDS)[number];

// ---------------------------------------------------------------------------
// Shared fields (every rule has these)
// ---------------------------------------------------------------------------

interface BaseRule {
  /** Stable id within the challenge. Generated at rule-create time. */
  id: string;
  /** Display name, e.g. "Gym", "Steps", "Water". */
  name: string;
  /** Optional longer description shown in the Rules reference page. */
  description?: string;
  /** Optional emoji or short label for compact UI surfaces. */
  emoji?: string;
  /** Display order on the Log screen and rule list. Lower = first. */
  order: number;
  /**
   * False retires the rule: it disappears from the log and from Today, so no
   * new values can be entered for it. Values already logged keep scoring —
   * turning a rule off is not a way to erase history. Absent = active, so
   * rules written before this field existed stay on.
   */
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Free-pass and weekly cap shared sub-shapes
// ---------------------------------------------------------------------------

/**
 * Lifetime free-pass tokens. v1 had 5/5 for gym and junk — this generalizes
 * the concept and lets the creator tune the count per rule.
 *
 * `lifetime: true` is the only mode for v1. Future: `lifetime: false` could
 * mean "N per week" or similar, but not yet.
 */
export interface FreePassesConfig {
  count: number;
  lifetime: true;
}

/**
 * Weekly cap on how many days a rule can score positive points. v1's gym
 * cap of 4 days/week and clean cap of 6 days/week become per-rule config.
 *
 * The week boundary comes from `ChallengeConfig.weekAnchor` — see dates.ts.
 */
export interface WeeklyCapConfig {
  maxScoringDays: number;
}

// ---------------------------------------------------------------------------
// Rule kind: binary
// ---------------------------------------------------------------------------

/**
 * A yes/no daily action. The classic example is "Did you go to the gym?"
 * Free passes let the user claim a "yes" without actually doing it,
 * limited by FreePassesConfig.
 *
 * Value type in entries: `'yes' | 'no' | 'free'` (see entry.ts)
 */
export interface BinaryRule extends BaseRule {
  kind: 'binary';
  /** Points awarded for `'yes'`. Typically +1. */
  pointsYes: number;
  /** Points awarded for `'no'`. Typically 0. */
  pointsNo: number;
  /** Points awarded for `'free'`. Typically equal to pointsYes. */
  pointsFree: number;
  /** Lifetime free-pass quota. Omit/null = no free passes available. */
  freePasses?: FreePassesConfig | null;
  /** Weekly scoring cap. Omit/null = uncapped. */
  weeklyCap?: WeeklyCapConfig | null;
}

// ---------------------------------------------------------------------------
// Rule kind: counter
// ---------------------------------------------------------------------------

/**
 * A numeric daily metric scored against a target. The user logs a number;
 * points scale linearly from 0 (no progress) to maxPoints (target hit or
 * exceeded). v1's steps rule (10k = 5 pts) is a `counter`.
 *
 * Value type in entries: `number`
 */
export interface CounterRule extends BaseRule {
  kind: 'counter';
  /** Value at which maxPoints is reached. Values above this also award maxPoints. */
  target: number;
  /** Max points the rule can award in a day. */
  maxPoints: number;
  /** Display unit, e.g. "steps", "cups", "miles". */
  unit: string;
  /** How many decimal places to display the value with. 0 for steps, 1 for miles. */
  decimals: number;
}

// ---------------------------------------------------------------------------
// Rule kind: range
// ---------------------------------------------------------------------------

/**
 * A numeric daily metric scored on whether it falls inside a window.
 * Example: sleep 7–9 hours — points scale from `pointsAtMin` at the low end
 * to `pointsAtMax` at the high end. Outside the window → `pointsOutside`.
 *
 * Value type in entries: `number`
 */
export interface RangeRule extends BaseRule {
  kind: 'range';
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. */
  max: number;
  /** Points at the lower bound of the band (linear scale to pointsAtMax). */
  pointsAtMin: number;
  /** Points at the upper bound of the band. */
  pointsAtMax: number;
  /** Points when value is outside [min, max]. Can be negative. */
  pointsOutside: number;
  unit: string;
  decimals: number;
}

// ---------------------------------------------------------------------------
// Rule kind: penalty
// ---------------------------------------------------------------------------

/**
 * A "bad thing" toggle. v1's junk food rule maps here: each infraction is
 * -1, but the first infraction each week is waived (net 0). Free passes
 * also avoid the penalty.
 *
 * Value type in entries: `'clean' | 'infraction' | 'free'`
 */
export interface PenaltyRule extends BaseRule {
  kind: 'penalty';
  /** Points for `'clean'`. Typically +1 (v1's clean day). */
  pointsClean: number;
  /** Points for `'infraction'`. Typically -1. */
  pointsPerInfraction: number;
  /** Points for `'free'`. Typically equal to pointsClean. */
  pointsFree: number;
  /** If true, the first infraction each week awards 0 instead of pointsPerInfraction. */
  weeklyFirstWaived: boolean;
  /** Lifetime free-pass quota. */
  freePasses?: FreePassesConfig | null;
}

// ---------------------------------------------------------------------------
// Rule kind: streak
// ---------------------------------------------------------------------------

/**
 * A derived bonus rule — awards `bonusPoints` when the member has
 * `daysRequired` consecutive days where the referenced rule scored positive.
 *
 * Streak rules do NOT have an entry value. They are computed during
 * aggregation by looking back across a member's entries. The points are
 * awarded on the day the streak completes (not retroactively to each day in
 * the streak).
 *
 * `repeatable: true` means a new streak can begin the day after one
 * completes, awarding bonus again every N days. `false` means the bonus
 * is one-time per member per challenge.
 */
export interface StreakRule extends BaseRule {
  kind: 'streak';
  /** ID of the rule being tracked. Must reference a rule in the same challenge. */
  ruleRef: string;
  /** Number of consecutive positive-scoring days required. */
  daysRequired: number;
  /** Bonus points awarded when streak completes. */
  bonusPoints: number;
  /** Whether the bonus can re-trigger every `daysRequired` days. */
  repeatable: boolean;
}

// ---------------------------------------------------------------------------
// Rule kind: tracker
// ---------------------------------------------------------------------------

/**
 * A personal-goal tracker. The owner defines that the challenge includes
 * goal tracking (max points, default unit). Each member sets their own
 * label, start, goal, direction, and unit on first log — see
 * `member.trackerConfig`.
 *
 * v1 cap: one tracker per challenge. See V2_PLAN.md §3.4.
 *
 * Value type in entries: `number` (daily measurement)
 */
export interface TrackerRule extends BaseRule {
  kind: 'tracker';
  /** Max points when a member reaches their personal goal. */
  maxPoints: number;
  /** Default unit suggested at member setup (members may choose their own). */
  unit: string;
  decimals: number;
}

// ---------------------------------------------------------------------------
// Union + type guards
// ---------------------------------------------------------------------------

export type Rule =
  | BinaryRule
  | CounterRule
  | RangeRule
  | PenaltyRule
  | StreakRule
  | TrackerRule;

export const isBinaryRule = (r: Rule): r is BinaryRule => r.kind === 'binary';
export const isCounterRule = (r: Rule): r is CounterRule => r.kind === 'counter';
export const isRangeRule = (r: Rule): r is RangeRule => r.kind === 'range';
export const isPenaltyRule = (r: Rule): r is PenaltyRule => r.kind === 'penalty';
export const isStreakRule = (r: Rule): r is StreakRule => r.kind === 'streak';
export const isTrackerRule = (r: Rule): r is TrackerRule => r.kind === 'tracker';

/**
 * True if this rule kind expects an entry value. Streak rules are derived
 * and never have a stored value — every other kind does.
 */
export const ruleAcceptsEntryValue = (r: Rule): boolean => r.kind !== 'streak';

/**
 * True unless the rule has been explicitly retired. Scoring deliberately does
 * NOT consult this — an inactive rule stops accepting new values, it does not
 * retroactively void the ones already logged.
 */
export const isRuleActive = (r: Pick<Rule, 'active'>): boolean => r.active !== false;

/** Active rules in display order. The list every log and summary screen wants. */
export function activeRules(rules: readonly Rule[]): Rule[] {
  return rules.filter(isRuleActive).sort((a, b) => a.order - b.order);
}
