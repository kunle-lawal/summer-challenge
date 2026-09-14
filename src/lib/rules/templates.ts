/**
 * Ready-made challenge shapes offered in the create flow.
 *
 * A template is a whole challenge — a rule set, a suggested length, and the
 * reasoning behind the numbers. `presets.ts` returns bare rule arrays; this
 * wraps that up with everything the create screen needs to describe a choice.
 *
 * ## The three things every template is tuned against
 *
 * **A streak only counts days that qualify.** By default that means the watched
 * rule scored above zero, which is right for a yes/no habit or a clean day but
 * wrong for a counter — one logged step would score above zero and hold a step
 * streak open forever. Any streak here that watches a counter sets
 * `qualifier: 'full'`, so the day has to earn the rule's maximum.
 *
 * **A streak on a capped binary is close to unwinnable.** A capped day scores
 * zero, so the run breaks every time the cap bites. Streaks here watch uncapped
 * binaries, penalties, ranges, or counters at full credit.
 *
 * **Daily rules compound.** Over ten weeks a rule worth +2 a day is worth 140
 * points, which quietly dwarfs anything weekly-capped. `ceilingOf` computes the
 * real budget, and no template lets a single rule past a quarter of it — with
 * two players there is nowhere to hide and one metric shouldn't settle it.
 *
 * All three are enforced in `templates.test.ts`.
 */

import type { Rule, StreakQualifier } from '../../types';
import { maxDailyPoints } from './kinds';

// ---------------------------------------------------------------------------
// Rule builders
// ---------------------------------------------------------------------------

type Id = () => string;

/**
 * Free passes, sized to the length of the run.
 *
 * Roughly two a week on the easygoing templates, one a week on the strict ones.
 * A nine-week challenge with six passes is not forgiving; with thirteen, you
 * can lose a fortnight to a work trip and still be in it.
 */
const passes = (weeks: number, perWeek: number) => ({
  count: Math.round(weeks * perWeek),
  lifetime: true as const,
});

interface BinaryOpts {
  cap?: number;
  passes?: { count: number; lifetime: true };
}

const binary = (
  id: string, name: string, emoji: string, order: number, points: number, o: BinaryOpts = {},
): Rule => ({
  id, kind: 'binary', name, emoji, order,
  pointsYes: points, pointsNo: 0, pointsFree: points,
  weeklyCap: o.cap ? { maxScoringDays: o.cap } : null,
  freePasses: o.passes ?? null,
});

const counter = (
  id: string, name: string, emoji: string, order: number,
  target: number, maxPoints: number, unit: string, decimals = 0,
): Rule => ({ id, kind: 'counter', name, emoji, order, target, maxPoints, unit, decimals });

const band = (
  id: string, name: string, emoji: string, order: number,
  min: number, max: number, points: number, unit: string, decimals = 1,
): Rule => ({
  id, kind: 'range', name, emoji, order,
  min, max, pointsAtMin: points, pointsAtMax: points, pointsOutside: 0, unit, decimals,
});

const penalty = (
  id: string, name: string, emoji: string, order: number,
  clean: number, slip: number,
  o: { waiveFirst?: boolean; passes?: { count: number; lifetime: true } } = {},
): Rule => ({
  id, kind: 'penalty', name, emoji, order,
  pointsClean: clean, pointsPerInfraction: slip, pointsFree: clean,
  weeklyFirstWaived: o.waiveFirst ?? true,
  freePasses: o.passes ?? null,
});

const streak = (
  id: string, name: string, order: number,
  ruleRef: string, daysRequired: number, bonusPoints: number,
  qualifier: StreakQualifier = 'positive',
): Rule => ({
  id, kind: 'streak', name, emoji: '🔥', order,
  ruleRef, daysRequired, bonusPoints, repeatable: true, qualifier,
});

const goal = (id: string, order: number, maxPoints: number, unit = 'lb', decimals = 1): Rule =>
  ({ id, kind: 'tracker', name: 'Personal goal', emoji: '🎯', order, maxPoints, unit, decimals });

// ---------------------------------------------------------------------------
// Ceiling
// ---------------------------------------------------------------------------

/**
 * Everything going right, every day. Computed rather than written down, so the
 * figure on the card can't drift away from the rules behind it.
 */
export function ceilingOf(rules: readonly Rule[], weeks: number): number {
  const days = weeks * 7;
  return rules.reduce((total, rule) => {
    switch (rule.kind) {
      case 'binary':
        return total + (rule.weeklyCap
          ? rule.weeklyCap.maxScoringDays * maxDailyPoints(rule) * weeks
          : maxDailyPoints(rule) * days);
      case 'counter':
      case 'range':
      case 'penalty':
        return total + maxDailyPoints(rule) * days;
      case 'streak':
        return total + (rule.repeatable
          ? Math.floor(days / rule.daysRequired) * rule.bonusPoints
          : rule.bonusPoints);
      case 'tracker':
        return total + rule.maxPoints;
    }
  }, 0);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const TEMPLATE_FOCUSES = [
  'Balanced', 'Body composition', 'Endurance', 'Habits & recovery', 'Mind', 'Your own',
] as const;
export type TemplateFocus = (typeof TEMPLATE_FOCUSES)[number];

export interface ChallengeTemplate {
  id: string;
  name: string;
  focus: TemplateFocus;
  /** One line, under the name. */
  tagline: string;
  /** Two or three sentences: who it's for, what it rewards. */
  blurb: string;
  weeks: number;
  /**
   * The qualitative half of how forgiving it is — the part the pass counts
   * can't say. The counts themselves are computed by `passSummary`, so the
   * card can never disagree with the rules behind it.
   */
  forgiveness: string;
  build: (newId: Id) => Rule[];
}

const TEMPLATES: ChallengeTemplate[] = [
  // ── Balanced ─────────────────────────────────────────────────────────────
  {
    id: 'lock-in',
    name: 'Lock In',
    focus: 'Balanced',
    tagline: 'Gym, steps, sleep, food, and a goal of your own',
    blurb:
      'The balanced one, and the place to start if you are not sure. Training, movement, sleep and eating, with two streaks that pay for consistency and a personal goal only you compete against.',
    weeks: 9,
    forgiveness: 'First slip each week is free',
    build: id => {
      const gym = id(), sleep = id(), junk = id();
      return [
        binary(gym, 'Gym', '🏋️', 0, 3, { cap: 4, passes: passes(9, 1.5) }),
        counter(id(), 'Steps', '🚶', 1, 8000, 2, 'steps'),
        band(sleep, 'Sleep', '😴', 2, 7, 9, 1.5, 'h'),
        penalty(junk, 'Junk food', '🍕', 3, 1, -2, { passes: passes(9, 1.5) }),
        streak(id(), 'Clean streak', 4, junk, 7, 8),
        streak(id(), 'Sleep streak', 5, sleep, 7, 6),
        goal(id(), 6, 60),
      ];
    },
  },
  {
    id: 'base-camp',
    name: 'Base Camp',
    focus: 'Balanced',
    tagline: 'Show up daily. Forgiving about everything else',
    blurb:
      'Built for weeks that do not go to plan — travel, shift work, small children. Any deliberate half hour counts, there is no cap to chase, slips cost half what they do elsewhere, and passes are generous.',
    weeks: 8,
    forgiveness: 'Slips cost only 1',
    build: id => {
      const move = id(), junk = id();
      return [
        binary(move, 'Move', '👟', 0, 2, { passes: passes(8, 2) }),
        streak(id(), 'Move streak', 1, move, 5, 8),
        counter(id(), 'Steps', '🚶', 2, 7000, 2, 'steps'),
        band(id(), 'Sleep', '😴', 3, 7, 9, 2, 'h'),
        penalty(junk, 'Junk food', '🍕', 4, 1, -1, { passes: passes(8, 2) }),
        goal(id(), 5, 50),
      ];
    },
  },
  {
    id: 'winter-arc',
    name: 'Winter Arc',
    focus: 'Balanced',
    tagline: 'Early starts, hard training, nothing to nurse',
    blurb:
      'The lock-in-before-the-new-year run. Up early, in the gym, off the drink, reading at night. Ten weeks takes you through to the start of December with something to show for it.',
    weeks: 10,
    forgiveness: 'No waiver on drink — every slip counts',
    build: id => {
      const gym = id(), wake = id(), drink = id(), read = id();
      return [
        binary(gym, 'Gym', '🏋️', 0, 3, { cap: 5, passes: passes(10, 1) }),
        binary(wake, 'Up before 7', '🌅', 1, 2, { passes: passes(10, 1) }),
        streak(id(), 'Early streak', 2, wake, 7, 10),
        counter(id(), 'Steps', '🚶', 3, 8000, 1.5, 'steps'),
        binary(read, 'Read 20 min', '📖', 4, 1.5, { passes: passes(10, 1) }),
        penalty(drink, 'Alcohol', '🍺', 5, 1, -3, { waiveFirst: false, passes: passes(10, 1) }),
        goal(id(), 6, 70),
      ];
    },
  },

  // ── Body composition ─────────────────────────────────────────────────────
  {
    id: 'cut',
    name: 'Cut',
    focus: 'Body composition',
    tagline: 'Strict. The personal goal decides it',
    blurb:
      'A hard nine weeks with a number you want to hit. Protein and alcohol join the usual rules, slips cost three, and the personal goal outweighs every other rule — so it turns on who moves furthest from their own starting point.',
    weeks: 9,
    forgiveness: 'Slips cost 3. No waiver on drink',
    build: id => {
      const junk = id();
      return [
        binary(id(), 'Gym', '🏋️', 0, 3, { cap: 5, passes: passes(9, 1) }),
        counter(id(), 'Steps', '🚶', 1, 10000, 2, 'steps'),
        counter(id(), 'Protein', '🥩', 2, 140, 1.5, 'g'),
        penalty(junk, 'Junk food', '🍕', 3, 1, -3, { passes: passes(9, 1) }),
        penalty(id(), 'Alcohol', '🍺', 4, 1, -3, { waiveFirst: false, passes: passes(9, 1) }),
        streak(id(), 'Clean streak', 5, junk, 10, 12),
        goal(id(), 6, 120),
      ];
    },
  },
  {
    id: 'recomp',
    name: 'Recomp',
    focus: 'Body composition',
    tagline: 'Lift, eat, sleep. Not much cardio',
    blurb:
      'Strength first. Training and protein carry the weight, sleep is scored properly because that is where the adaptation happens, and steps are only there to stop you sitting still all day.',
    weeks: 10,
    forgiveness: 'First slip each week is free',
    build: id => {
      const gym = id(), sleep = id(), junk = id();
      return [
        binary(gym, 'Lift', '🏋️', 0, 4, { cap: 4, passes: passes(10, 1.5) }),
        counter(id(), 'Protein', '🥩', 1, 150, 2, 'g'),
        band(sleep, 'Sleep', '😴', 2, 7, 9, 2, 'h'),
        counter(id(), 'Steps', '🚶', 3, 6000, 1, 'steps'),
        penalty(junk, 'Junk food', '🍕', 4, 1, -2, { passes: passes(10, 1.5) }),
        streak(id(), 'Sleep streak', 5, sleep, 7, 10),
        goal(id(), 6, 90),
      ];
    },
  },
  {
    id: 'lean-season',
    name: 'Lean Season',
    focus: 'Body composition',
    tagline: 'No gym required — walking and eating',
    blurb:
      'For anyone without a gym or the time for one. Steps do the work, food discipline does the rest, and the step streak only counts days you actually hit the target.',
    weeks: 8,
    forgiveness: 'First slip each week is free',
    build: id => {
      const steps = id(), junk = id();
      return [
        counter(steps, 'Steps', '🚶', 0, 10000, 2, 'steps'),
        streak(id(), 'Step streak', 1, steps, 5, 10, 'full'),
        penalty(junk, 'Junk food', '🍕', 2, 1, -2, { passes: passes(8, 2) }),
        penalty(id(), 'Alcohol', '🍺', 3, 1, -2, { passes: passes(8, 1.5) }),
        band(id(), 'Sleep', '😴', 4, 7, 9, 1.5, 'h'),
        goal(id(), 5, 80),
      ];
    },
  },

  // ── Endurance ────────────────────────────────────────────────────────────
  {
    id: 'run-club',
    name: 'Run Club',
    focus: 'Endurance',
    tagline: 'Miles, mobility and enough sleep to absorb them',
    blurb:
      'Get a running habit to stick. Distance is scored daily, mobility keeps you in one piece, and the run streak only counts days that hit the distance — so a token half mile will not carry it.',
    weeks: 10,
    forgiveness: 'Nothing here costs you points',
    build: id => {
      const run = id(), mob = id();
      return [
        counter(run, 'Run', '🏃', 0, 5, 2.5, 'km', 1),
        streak(id(), 'Run streak', 1, run, 4, 10, 'full'),
        binary(mob, 'Mobility', '🧘', 2, 1.5, { passes: passes(10, 1.5) }),
        band(id(), 'Sleep', '😴', 3, 7, 9, 2, 'h'),
        binary(id(), 'Strength', '🏋️', 4, 2.5, { cap: 2, passes: passes(10, 1.5) }),
        goal(id(), 5, 80, 'min'),
      ];
    },
  },
  {
    id: 'marathon-build',
    name: 'Marathon Build',
    focus: 'Endurance',
    tagline: 'Twelve weeks of mileage, fuel and recovery',
    blurb:
      'A full build block. Daily distance, a weekly long run, strength twice a week and real attention to sleep and fuelling. The longest template here — pick it if you have a race in mind.',
    weeks: 12,
    forgiveness: 'First slip each week is free',
    build: id => {
      const long = id(), sleep = id(), fuel = id();
      return [
        counter(id(), 'Distance', '🏃', 0, 8, 2, 'km', 1),
        binary(long, 'Long run', '🥾', 1, 6, { cap: 1, passes: passes(12, 1) }),
        binary(id(), 'Strength', '🏋️', 2, 2.5, { cap: 2, passes: passes(12, 1.5) }),
        band(sleep, 'Sleep', '😴', 3, 7, 9, 2, 'h'),
        penalty(fuel, 'Junk food', '🍕', 4, 1, -1.5, { passes: passes(12, 1.5) }),
        streak(id(), 'Sleep streak', 5, sleep, 7, 10),
        goal(id(), 6, 100, 'min'),
      ];
    },
  },

  // ── Habits & recovery ────────────────────────────────────────────────────
  {
    id: 'reset',
    name: 'Reset',
    focus: 'Habits & recovery',
    tagline: 'Six weeks of sleep, screens and daylight',
    blurb:
      'No gym, no targets to chase. Sleep on time, off the phone in the evening, outside every day, off the drink. Short on purpose — it is a reset, not a season.',
    weeks: 6,
    forgiveness: 'First slip each week is free',
    build: id => {
      const sleep = id(), screens = id(), walk = id();
      return [
        band(sleep, 'Sleep', '😴', 0, 7, 9, 3, 'h'),
        streak(id(), 'Sleep streak', 1, sleep, 5, 10),
        binary(screens, 'No screens after 10', '📵', 2, 2.5, { passes: passes(6, 2) }),
        binary(walk, 'Daylight walk', '🌤️', 3, 2, { passes: passes(6, 1.5) }),
        penalty(id(), 'Alcohol', '🍺', 4, 1.5, -2, { passes: passes(6, 2) }),
        goal(id(), 5, 50),
      ];
    },
  },
  {
    id: 'clean-slate',
    name: 'Clean Slate',
    focus: 'Habits & recovery',
    tagline: 'Give something up and count the days',
    blurb:
      'Built around long streaks rather than daily scoring. Pick what you are quitting, keep the days clean, and the bonuses grow the further you get. Passes exist, but spending one is a decision.',
    weeks: 9,
    forgiveness: 'No waiver on drink — every slip counts',
    build: id => {
      const drink = id(), junk = id(), scroll = id();
      return [
        penalty(drink, 'Alcohol', '🍺', 0, 2, -3, { waiveFirst: false, passes: passes(9, 1) }),
        streak(id(), 'Dry streak', 1, drink, 14, 20),
        penalty(junk, 'Junk food', '🍕', 2, 1.5, -2, { passes: passes(9, 1) }),
        streak(id(), 'Clean streak', 3, junk, 10, 12),
        penalty(scroll, 'Doomscrolling', '📱', 4, 1, -1.5, { passes: passes(9, 1) }),
        band(id(), 'Sleep', '😴', 5, 7, 9, 1.5, 'h'),
        goal(id(), 6, 60),
      ];
    },
  },
  {
    id: 'desk-job',
    name: 'Desk Job',
    focus: 'Habits & recovery',
    tagline: 'For anyone who sits down at nine and stands up at six',
    blurb:
      'Movement in small doses rather than one big session. Get up through the day, walk at lunch, drink water, stretch in the evening. Low bar by design — it is about breaking the sitting, not training.',
    weeks: 8,
    forgiveness: 'Nothing here costs you points',
    build: id => {
      const breaks = id(), stretch = id();
      return [
        binary(breaks, 'Hourly stand-up', '⏱️', 0, 2, { passes: passes(8, 2) }),
        streak(id(), 'Standing streak', 1, breaks, 5, 8),
        counter(id(), 'Steps', '🚶', 2, 7000, 2, 'steps'),
        counter(id(), 'Water', '💧', 3, 2.5, 1.5, 'L', 1),
        binary(stretch, 'Stretch', '🧘', 4, 1.5, { passes: passes(8, 2) }),
        band(id(), 'Sleep', '😴', 5, 7, 9, 1.5, 'h'),
        goal(id(), 6, 50),
      ];
    },
  },

  // ── Mind ─────────────────────────────────────────────────────────────────
  {
    id: 'deep-work',
    name: 'Deep Work',
    focus: 'Mind',
    tagline: 'Focus hours, reading, and getting off the phone',
    blurb:
      'Not a fitness challenge. Score the hours you actually concentrate, read every day, protect your sleep and keep the phone out of it. The focus streak needs full hours, not a token block.',
    weeks: 8,
    forgiveness: 'First slip each week is free',
    build: id => {
      const focus = id(), read = id(), phone = id();
      return [
        counter(focus, 'Focus hours', '🎧', 0, 3, 2.5, 'h', 1),
        streak(id(), 'Focus streak', 1, focus, 5, 12, 'full'),
        binary(read, 'Read 30 min', '📖', 2, 2, { passes: passes(8, 1.5) }),
        penalty(phone, 'Doomscrolling', '📱', 3, 1.5, -2, { passes: passes(8, 2) }),
        band(id(), 'Sleep', '😴', 4, 7, 9, 2, 'h'),
        goal(id(), 5, 60, 'h'),
      ];
    },
  },
  {
    id: 'whole-person',
    name: 'Whole Person',
    focus: 'Mind',
    tagline: 'A bit of everything, none of it punishing',
    blurb:
      'Movement, stillness, reading and sleep, weighted evenly and scored gently. Good for two people who want the challenge to be a nudge rather than a second job.',
    weeks: 10,
    forgiveness: 'Slips cost only 1',
    build: id => {
      const move = id(), sit = id(), read = id(), junk = id();
      return [
        binary(move, 'Move', '👟', 0, 2, { passes: passes(10, 2) }),
        binary(sit, 'Meditate', '🧘', 1, 2, { passes: passes(10, 2) }),
        streak(id(), 'Stillness streak', 2, sit, 7, 10),
        binary(read, 'Read', '📖', 3, 2, { passes: passes(10, 2) }),
        band(id(), 'Sleep', '😴', 4, 7, 9, 2, 'h'),
        penalty(junk, 'Junk food', '🍕', 5, 1, -1, { passes: passes(10, 2) }),
        goal(id(), 6, 70),
      ];
    },
  },

  // ── Blank ────────────────────────────────────────────────────────────────
  {
    id: 'blank',
    name: 'Start empty',
    focus: 'Your own',
    tagline: 'Build your own rules from scratch',
    blurb: 'No rules to begin with. Add exactly what you want to track.',
    weeks: 9,
    forgiveness: 'Whatever you decide',
    build: () => [],
  },
];

export const CHALLENGE_TEMPLATES = TEMPLATES;
export const DEFAULT_TEMPLATE_ID = 'lock-in';

/**
 * How many free passes this rule set actually hands out, per week of the run.
 *
 * Derived rather than written down: the counts used to be typed into each
 * template's blurb, and drifted the moment a rate changed.
 */
export function passSummary(rules: readonly Rule[], weeks: number): string | null {
  const rates = rules
    .filter(r => r.kind === 'penalty' || (r.kind === 'binary' && !!r.weeklyCap) || r.kind === 'binary')
    .map(r => (r.kind === 'penalty' || r.kind === 'binary' ? r.freePasses?.count ?? 0 : 0))
    .filter(count => count > 0)
    .map(count => count / weeks);

  if (rates.length === 0) return null;

  const round = (n: number) => Math.round(n * 10) / 10;
  const low = round(Math.min(...rates));
  const high = round(Math.max(...rates));
  const each = low === high ? `${low}` : `${low}–${high}`;
  return `${each} free ${high === 1 && low === 1 ? 'pass' : 'passes'} a week`;
}

/** Templates grouped for display, in the order focuses are declared. */
export function templatesByFocus(): { focus: TemplateFocus; templates: ChallengeTemplate[] }[] {
  return TEMPLATE_FOCUSES
    .map(focus => ({ focus, templates: TEMPLATES.filter(t => t.focus === focus) }))
    .filter(group => group.templates.length > 0);
}
