/**
 * Member rollups, leaderboard construction, and weekly summaries.
 *
 * This module is the only place that handles:
 *  - Streak bonus computation (requires full member history)
 *  - Tracker "latest entry only" logic (see V2_PLAN edge cases)
 *  - Inactive member exclusion from leaderboard standings
 *
 * All functions are pure (Firestore-free).
 */

import type {
  Challenge,
  Entry,
  Member,
  StreakRule,
} from '../../types';
import type {
  EvaluatedEntry,
  MemberStanding,
  Leaderboard,
  WeeklySummary,
} from '../../types';
import type { DateString } from '../../types';
import { countConsecutiveDaysAtEnd, diffDays, getWeekWindow } from '../dates';
import { evaluateEntry } from './evaluate';

// ---------------------------------------------------------------------------
// Member aggregation
// ---------------------------------------------------------------------------

/**
 * Compute a single member's leaderboard standing from their full entry
 * history. Handles tracker "latest entry only" and streak bonuses.
 *
 * Inactive members can be passed in — callers (buildLeaderboard) are
 * responsible for filtering them out before adding to standings.
 */
/**
 * Optional window for "points earned between these dates".
 *
 * Scoring still sees the member's whole history — weekly caps, penalty
 * waivers and streak runs all depend on days outside the window — but only
 * points dated inside it are added up. Filtering the entries before they reach
 * the evaluator would silently change how they score.
 */
export interface DateRange {
  start: DateString;
  end: DateString;
}

export function aggregateMember(
  challenge: Challenge,
  member: Member,
  memberEntries: Entry[],
  range?: DateRange,
): MemberStanding {
  if (memberEntries.length === 0) {
    return emptyStanding(member, challenge.config.rules);
  }

  const inRange = (date: DateString) =>
    range === undefined || (date >= range.start && date <= range.end);

  // Sort entries ascending by date for deterministic processing.
  const sorted = [...memberEntries].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  // Evaluate every entry (streak rules produce 0 pts here).
  const evaluated = sorted.map(entry =>
    evaluateEntry(challenge, entry, member, sorted),
  );

  // Identify streak rules for bonus computation.
  const streakRules = challenge.config.rules.filter(
    (r): r is StreakRule => r.kind === 'streak',
  );

  // Identify tracker rule IDs for "latest entry only" logic.
  const trackerRuleIds = new Set(
    challenge.config.rules
      .filter(r => r.kind === 'tracker')
      .map(r => r.id),
  );

  // For each tracker rule, find the latest date that has a logged value.
  const latestTrackerDates = new Map<string, DateString>();
  for (const ruleId of trackerRuleIds) {
    for (const entry of sorted) {
      if (entry.values[ruleId] !== undefined) {
        latestTrackerDates.set(ruleId, entry.date); // last wins because sorted ascending
      }
    }
  }

  // Build per-rule bonus pts from streak rules.
  const streakBonusByDate = computeStreakBonuses(streakRules, evaluated);

  // Accumulate totals.
  let totalPoints = 0;
  const perRule: Record<string, number> = {};

  for (const evalEntry of evaluated) {
    if (!inRange(evalEntry.date)) continue;

    for (const [ruleId, evalRule] of Object.entries(evalEntry.perRule)) {
      // Tracker rule: only credit the latest logged entry.
      if (trackerRuleIds.has(ruleId)) {
        const latestDate = latestTrackerDates.get(ruleId);
        if (evalEntry.date !== latestDate) continue;
      }

      const pts = evalRule.points;
      perRule[ruleId] = (perRule[ruleId] ?? 0) + pts;
      totalPoints += pts;
    }

    // Add any streak bonuses that fired on this day.
    const bonuses = streakBonusByDate.get(evalEntry.date);
    if (bonuses) {
      for (const [ruleId, bonusPts] of bonuses) {
        perRule[ruleId] = (perRule[ruleId] ?? 0) + bonusPts;
        totalPoints += bonusPts;
      }
    }
  }

  return {
    memberId: member.id,
    memberName: member.name,
    totalPoints,
    daysLogged: range ? memberEntries.filter(e => inRange(e.date)).length : memberEntries.length,
    perRule,
    rank: 0, // assigned by buildLeaderboard
  };
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/**
 * Build a full leaderboard snapshot. Excludes inactive members entirely —
 * their entries do not count toward any standings.
 */
export function buildLeaderboard(
  challenge: Challenge,
  members: Member[],
  allEntries: Entry[],
  range?: DateRange,
): Leaderboard {
  const activeMembers = members.filter(m => m.active);

  // Group entries by memberId.
  const entriesByMember = new Map<string, Entry[]>();
  for (const entry of allEntries) {
    const bucket = entriesByMember.get(entry.memberId) ?? [];
    bucket.push(entry);
    entriesByMember.set(entry.memberId, bucket);
  }

  // Compute standings for each active member.
  const standings = activeMembers.map(member => {
    const memberEntries = entriesByMember.get(member.id) ?? [];
    return aggregateMember(challenge, member, memberEntries, range);
  });

  // Sort: highest points first. Ties keep insertion order (stable).
  standings.sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign 1-based ranks. Ties share the same rank; the next distinct score
  // skips (e.g. two members tied at rank 1 → next rank is 3).
  let rank = 1;
  for (let i = 0; i < standings.length; i++) {
    const standing = standings[i];
    const prev = i > 0 ? standings[i - 1] : undefined;
    if (standing && prev && standing.totalPoints < prev.totalPoints) {
      rank = i + 1;
    }
    if (standing) standing.rank = rank;
  }

  const totalEntries = allEntries.filter(e => {
    const member = activeMembers.find(m => m.id === e.memberId);
    return member !== undefined;
  }).length;

  return {
    standings,
    totalEntries,
    computedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Weekly summary
// ---------------------------------------------------------------------------

/**
 * Compute per-rule weekly usage for one member for the challenge week that
 * contains `referenceDate`. Powers the "Gym: 3/4 this week" indicator.
 */
export function buildWeeklySummary(
  challenge: Challenge,
  _member: Member,
  memberEntries: Entry[],
  referenceDate: DateString,
): WeeklySummary {
  const { weekAnchor, rules } = challenge.config;
  const { start: weekStart, end: weekEnd } = getWeekWindow(referenceDate, weekAnchor);

  const weekEntries = memberEntries.filter(
    e => e.date >= weekStart && e.date <= weekEnd,
  );

  const weekNumber = Math.max(
    1,
    Math.floor(diffDays(referenceDate, weekAnchor) / 7) + 1,
  );

  const perRule: Record<string, { used: number; cap: number | null }> = {};
  const freePassUsage: Record<string, { used: number; cap: number | null }> = {};

  for (const rule of rules) {
    if (rule.kind === 'streak') continue; // streak has no cap or free pass

    // Weekly cap usage.
    if (rule.kind === 'binary') {
      const cap = rule.weeklyCap?.maxScoringDays ?? null;
      let used = 0;
      const scoredDates = new Set<string>();
      for (const entry of weekEntries) {
        const val = entry.values[rule.id];
        if ((val === 'yes' || val === 'free') && !scoredDates.has(entry.date)) {
          scoredDates.add(entry.date);
          // Only count if not capped.
          if (cap === null || used < cap) used++;
        }
      }
      perRule[rule.id] = { used, cap };
    } else {
      perRule[rule.id] = { used: weekEntries.filter(e => e.values[rule.id] !== undefined).length, cap: null };
    }

    // Free-pass usage (binary + penalty).
    if (rule.kind === 'binary' || rule.kind === 'penalty') {
      const cap = rule.freePasses?.count ?? null;
      const used = memberEntries.filter(e => e.values[rule.id] === 'free').length;
      freePassUsage[rule.id] = { used, cap };
    }
  }

  return { weekNumber, perRule, freePassUsage };
}

// ---------------------------------------------------------------------------
// Evaluated entry helpers
// ---------------------------------------------------------------------------

/**
 * Re-evaluate all entries for a member and return the evaluated forms.
 * Useful for history pages that need per-rule breakdowns.
 */
export function evaluateAllEntries(
  challenge: Challenge,
  member: Member,
  memberEntries: Entry[],
): EvaluatedEntry[] {
  const sorted = [...memberEntries].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  return sorted.map(entry => evaluateEntry(challenge, entry, member, sorted));
}

// ---------------------------------------------------------------------------
// Streak bonus computation (internal)
// ---------------------------------------------------------------------------

/**
 * Given a list of evaluated entries for one member and the challenge's streak
 * rules, return a map of date → Map<ruleId, bonusPts> for each day a streak
 * bonus fires.
 *
 * Streak bonus fires on the day the streak COMPLETES. Repeatable streaks
 * reset after each completion and can fire again every `daysRequired` days.
 * Non-repeatable streaks fire at most once per member per challenge.
 */
function computeStreakBonuses(
  streakRules: StreakRule[],
  evaluated: EvaluatedEntry[],
): Map<DateString, Map<string, number>> {
  const result = new Map<DateString, Map<string, number>>();

  for (const rule of streakRules) {
    // Collect dates where the referenced rule scored > 0.
    const positiveDates: DateString[] = [];
    for (const entry of evaluated) {
      const refScore = entry.perRule[rule.ruleRef];
      if (refScore && refScore.points > 0) {
        positiveDates.push(entry.date);
      }
    }
    // positiveDates is already in ascending order (evaluated is sorted ascending).

    let consecutiveRun = 0;
    let bonusFiredEver = false;

    for (let i = 0; i < positiveDates.length; i++) {
      const currDate = positiveDates[i];
      if (currDate === undefined) continue;
      const prevDate = i > 0 ? positiveDates[i - 1] : undefined;

      if (prevDate !== undefined && diffDays(currDate, prevDate) === 1) {
        consecutiveRun++;
      } else {
        consecutiveRun = 1;
        if (!rule.repeatable) bonusFiredEver = false; // new run, reset non-repeatable
      }

      if (consecutiveRun === rule.daysRequired) {
        if (rule.repeatable || !bonusFiredEver) {
          // Fire the bonus on this date.
          if (currDate !== undefined) {
            let dayMap = result.get(currDate);
            if (!dayMap) {
              dayMap = new Map<string, number>();
              result.set(currDate, dayMap);
            }
            dayMap.set(rule.id, (dayMap.get(rule.id) ?? 0) + rule.bonusPoints);
          }
          bonusFiredEver = true;
        }
        if (rule.repeatable) {
          consecutiveRun = 0; // reset so next daysRequired block starts fresh
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyStanding(member: Member, rules: Challenge['config']['rules']): MemberStanding {
  const perRule: Record<string, number> = {};
  for (const rule of rules) {
    perRule[rule.id] = 0;
  }
  return {
    memberId: member.id,
    memberName: member.name,
    totalPoints: 0,
    daysLogged: 0,
    perRule,
    rank: 0,
  };
}

// ---------------------------------------------------------------------------
// Logged-day streak
// ---------------------------------------------------------------------------

/**
 * Consecutive calendar days the member has logged anything, counting back from
 * today. This is the "4 days" figure in the Home header, and it is NOT the
 * same thing as a streak *rule* — that one tracks positive days on one
 * specific rule and pays a bonus.
 *
 * Yesterday still counts as the anchor so the number doesn't drop to zero
 * every midnight before you've had a chance to log.
 */
export function getLoggedDayStreak(
  memberEntries: readonly Entry[],
  today: DateString,
): number {
  if (memberEntries.length === 0) return 0;

  const dates = [...new Set(memberEntries.map(e => e.date))].sort();
  const last = dates[dates.length - 1];
  if (last === undefined) return 0;

  // A streak is live only if it reaches today or yesterday.
  const gap = diffDays(today, last);
  if (gap > 1 || gap < 0) return 0;

  return countConsecutiveDaysAtEnd(dates);
}
