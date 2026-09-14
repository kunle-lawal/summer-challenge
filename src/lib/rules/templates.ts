/**
 * Ready-made challenge shapes offered in the create flow.
 *
 * A template is a whole challenge — a rule set, a suggested length and the
 * reasoning behind the numbers. `presets.ts` returns bare rule arrays; this
 * wraps that idea up with everything the create screen needs to describe a
 * choice properly.
 *
 * ## Two constraints that shaped every one of these
 *
 * **Streaks fire on days where the watched rule scored greater than zero.**
 * That makes three things true, and getting them wrong produces a rule that
 * looks fine and behaves badly:
 *
 *   - A streak on a **capped binary** breaks the moment the cap bites, because
 *     a capped day scores 0. Never point one at a rule with a `weeklyCap`.
 *   - A streak on a **counter** is free points: any value above zero scores,
 *     so logging a single step keeps it alive.
 *   - A streak on a **penalty** only works when `pointsClean` is above zero.
 *
 *   So streaks here watch penalties (clean days), ranges (in-band nights), or
 *   uncapped binaries — and `templates.test.ts` enforces that.
 *
 * **Daily rules compound.** Over a nine-week run a rule worth +2 a day is worth
 * ~126 points, which quietly dwarfs a weekly-capped rule. The per-rule ceilings
 * in each template's notes are the budget those numbers were picked against.
 */

import type { Rule } from '../../types';

export interface ChallengeTemplate {
  id: string;
  /** Shown on the card. */
  name: string;
  /** One line, shown under the name. */
  tagline: string;
  /** Two or three sentences — who it's for and what it rewards. */
  blurb: string;
  /** Suggested length. The create screen turns this into an end date. */
  weeks: number;
  /** Everything going right, every day. For calibration, not a target. */
  ceiling: number;
  /** How forgiving it is, in plain words. */
  forgiveness: string;
  build: (newId: () => string) => Rule[];
}

// ---------------------------------------------------------------------------

/**
 * Balanced, and the one to pick if you're not sure.
 *
 * Ceiling ≈ 578 over nine weeks:
 *   gym 108 · steps 126 · sleep 95 · junk 63 · clean streak 72 ·
 *   sleep streak 54 · personal goal 60
 *
 * No single rule is worth more than a quarter of the total, so a bad week in
 * one place doesn't settle the whole thing. The two streaks are what reward
 * turning up every day rather than cramming.
 */
const lockIn: ChallengeTemplate = {
  id: 'lock-in',
  name: 'Lock In',
  tagline: 'Gym, steps, sleep, food, and a goal of your own',
  blurb:
    'The balanced one. Seven rules covering training, movement, sleep and eating, with two streaks that pay for consistency and a personal goal that only you compete against. Nothing is worth enough to decide the challenge on its own.',
  weeks: 9,
  ceiling: 578,
  forgiveness: '6 gym passes · 6 food passes · first slip each week free',
  build: id => {
    const gym = id();
    const steps = id();
    const sleep = id();
    const junk = id();
    return [
      {
        id: gym, kind: 'binary', name: 'Gym', emoji: '🏋️', order: 0,
        pointsYes: 3, pointsNo: 0, pointsFree: 3,
        weeklyCap: { maxScoringDays: 4 },
        freePasses: { count: 6, lifetime: true },
      },
      {
        id: steps, kind: 'counter', name: 'Steps', emoji: '🚶', order: 1,
        target: 8000, maxPoints: 2, unit: 'steps', decimals: 0,
      },
      {
        id: sleep, kind: 'range', name: 'Sleep', emoji: '😴', order: 2,
        min: 7, max: 9, pointsAtMin: 1.5, pointsAtMax: 1.5, pointsOutside: 0,
        unit: 'h', decimals: 1,
      },
      {
        id: junk, kind: 'penalty', name: 'Junk food', emoji: '🍕', order: 3,
        pointsClean: 1, pointsPerInfraction: -2, pointsFree: 1,
        weeklyFirstWaived: true,
        freePasses: { count: 6, lifetime: true },
      },
      {
        id: id(), kind: 'streak', name: 'Clean streak', emoji: '🔥', order: 4,
        ruleRef: junk, daysRequired: 7, bonusPoints: 8, repeatable: true,
      },
      {
        id: id(), kind: 'streak', name: 'Sleep streak', emoji: '🌙', order: 5,
        ruleRef: sleep, daysRequired: 7, bonusPoints: 6, repeatable: true,
      },
      {
        id: id(), kind: 'tracker', name: 'Personal goal', emoji: '🎯', order: 6,
        maxPoints: 60, unit: 'lb', decimals: 1,
      },
    ];
  },
};

/**
 * For unpredictable schedules — travel, shift work, small children.
 *
 * Ceiling ≈ 530 over eight weeks:
 *   move 112 · move streak 88 · steps 112 · sleep 112 · food 56 · goal 50
 *
 * Move is deliberately **uncapped**, which is what lets a streak watch it.
 * Streaks are ~17% of the total here against ~22% in Lock In, and the
 * penalty is half as harsh, so showing up beats going hard.
 */
const baseCamp: ChallengeTemplate = {
  id: 'base-camp',
  name: 'Base Camp',
  tagline: 'Show up daily. Forgiving about everything else',
  blurb:
    'Built for weeks that don’t go to plan. Any deliberate half hour counts as movement, there’s no weekly cap to hit, slips cost half what they do elsewhere, and there are eight passes on each of the two rules that can bite. Rewards the streak, not the session.',
  weeks: 8,
  ceiling: 530,
  forgiveness: '8 movement passes · 8 food passes · slips cost only 1',
  build: id => {
    const move = id();
    const sleep = id();
    const junk = id();
    return [
      {
        id: move, kind: 'binary', name: 'Move', emoji: '👟', order: 0,
        pointsYes: 2, pointsNo: 0, pointsFree: 2,
        // Uncapped on purpose: a weekly cap would break the streak below every
        // time it bit, since a capped day scores zero.
        weeklyCap: null,
        freePasses: { count: 8, lifetime: true },
      },
      {
        id: id(), kind: 'streak', name: 'Move streak', emoji: '🔥', order: 1,
        ruleRef: move, daysRequired: 5, bonusPoints: 8, repeatable: true,
      },
      {
        id: id(), kind: 'counter', name: 'Steps', emoji: '🚶', order: 2,
        target: 7000, maxPoints: 2, unit: 'steps', decimals: 0,
      },
      {
        id: sleep, kind: 'range', name: 'Sleep', emoji: '😴', order: 3,
        min: 7, max: 9, pointsAtMin: 2, pointsAtMax: 2, pointsOutside: 0,
        unit: 'h', decimals: 1,
      },
      {
        id: junk, kind: 'penalty', name: 'Junk food', emoji: '🍕', order: 4,
        pointsClean: 1, pointsPerInfraction: -1, pointsFree: 1,
        weeklyFirstWaived: true,
        freePasses: { count: 8, lifetime: true },
      },
      {
        id: id(), kind: 'tracker', name: 'Personal goal', emoji: '🎯', order: 5,
        maxPoints: 50, unit: 'lb', decimals: 1,
      },
    ];
  },
};

/**
 * The strict one, for a body-composition push.
 *
 * Ceiling ≈ 674 over nine weeks:
 *   gym 135 · steps 126 · protein 95 · junk 63 · alcohol 63 ·
 *   clean streak 72 · personal goal 120
 *
 * The personal goal is the largest single rule at ~18%, which is the point:
 * whoever moves furthest toward their own target wins, not whoever starts
 * fitter. Slips cost 3 and passes are tighter — pick this one deliberately.
 */
const cut: ChallengeTemplate = {
  id: 'cut',
  name: 'Cut',
  tagline: 'Strict. The personal goal decides it',
  blurb:
    'For a hard eight or nine weeks with a number you want to hit. Protein and alcohol join the usual rules, slips cost three, and the personal goal is worth more than any other rule — so it’s decided by who moves furthest against their own starting point, not who was fitter on day one.',
  weeks: 9,
  ceiling: 674,
  forgiveness: '4 gym passes · 4 food passes · 3 drink passes',
  build: id => {
    const junk = id();
    return [
      {
        id: id(), kind: 'binary', name: 'Gym', emoji: '🏋️', order: 0,
        pointsYes: 3, pointsNo: 0, pointsFree: 3,
        weeklyCap: { maxScoringDays: 5 },
        freePasses: { count: 4, lifetime: true },
      },
      {
        id: id(), kind: 'counter', name: 'Steps', emoji: '🚶', order: 1,
        target: 10000, maxPoints: 2, unit: 'steps', decimals: 0,
      },
      {
        id: id(), kind: 'counter', name: 'Protein', emoji: '🥩', order: 2,
        target: 140, maxPoints: 1.5, unit: 'g', decimals: 0,
      },
      {
        id: junk, kind: 'penalty', name: 'Junk food', emoji: '🍕', order: 3,
        pointsClean: 1, pointsPerInfraction: -3, pointsFree: 1,
        weeklyFirstWaived: true,
        freePasses: { count: 4, lifetime: true },
      },
      {
        id: id(), kind: 'penalty', name: 'Alcohol', emoji: '🍺', order: 4,
        pointsClean: 1, pointsPerInfraction: -3, pointsFree: 1,
        // No weekly waiver here — that's the difference between this and food.
        weeklyFirstWaived: false,
        freePasses: { count: 3, lifetime: true },
      },
      {
        id: id(), kind: 'streak', name: 'Clean streak', emoji: '🔥', order: 5,
        ruleRef: junk, daysRequired: 10, bonusPoints: 12, repeatable: true,
      },
      {
        id: id(), kind: 'tracker', name: 'Personal goal', emoji: '🎯', order: 6,
        maxPoints: 120, unit: 'lb', decimals: 1,
      },
    ];
  },
};

/** Start from nothing. */
const blank: ChallengeTemplate = {
  id: 'blank',
  name: 'Start empty',
  tagline: 'Build your own rules from scratch',
  blurb: 'No rules to begin with. Add exactly what you want to track.',
  weeks: 9,
  ceiling: 0,
  forgiveness: 'Whatever you decide',
  build: () => [],
};

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [lockIn, baseCamp, cut, blank];

export const DEFAULT_TEMPLATE_ID = lockIn.id;
