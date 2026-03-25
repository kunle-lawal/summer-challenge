import type { GoalDayEntry, PersonId, ProfileData, RankedPlayer, WorkoutEntry } from '../types';
import { CHALLENGE_START, PEOPLE, PROFILE_MAX_PTS } from './config';
import { today, windowOf } from './dates';

/** Max distinct days per challenge week that earn +1 gym (went or free-gym). */
export const WEEKLY_GYM_SCORE_DAYS = 4;
/** Max distinct days per challenge week that earn +1 clean (clean or free-junk). */
export const WEEKLY_CLEAN_SCORE_DAYS = 6;

export function calcPts(gym: string, steps: string | number, junk: string): number {
  let pts = 0;
  if (gym === 'went' || gym === 'free-gym') pts += 1;
  if (junk === 'clean' || junk === 'free-junk') pts += 1;
  if (junk === 'ate') pts -= 1;
  const s = Math.max(0, parseFloat(String(steps)) || 0);
  pts += Math.round((Math.min(s, 10000) / 10000) * 5 * 10) / 10;
  return Math.round(pts * 10) / 10;
}

/**
 * Workout points for one day, applying weekly caps: after {@link WEEKLY_GYM_SCORE_DAYS}
 * scoring gym days and {@link WEEKLY_CLEAN_SCORE_DAYS} scoring clean days in the same
 * window as `logDate`, extra went/free-gym or clean/free-junk choices still log but drop
 * the +1 for that bucket (steps and junk penalty unchanged).
 */
export function calcPtsForLogDay(
  gym: string,
  steps: string | number,
  junk: string,
  entries: WorkoutEntry[],
  personId: string,
  logDate: string,
): number {
  const startDate = CHALLENGE_START;
  const win = windowOf(logDate, startDate);
  const day = logDate.slice(0, 10);
  const others = entries.filter(
    (e) =>
      e.personId === personId &&
      e.date.slice(0, 10) !== day &&
      windowOf(e.date, startDate) === win,
  );
  const priorGym = others.filter(
    (e) => e.gym === 'went' || e.gym === 'free-gym',
  ).length;
  const priorClean = others.filter(
    (e) => e.junk === 'clean' || e.junk === 'free-junk',
  ).length;

  let pts = calcPts(gym, steps, junk);
  const gymWouldScore = gym === 'went' || gym === 'free-gym';
  const cleanWouldScore = junk === 'clean' || junk === 'free-junk';
  if (gymWouldScore && priorGym >= WEEKLY_GYM_SCORE_DAYS) pts -= 1;
  if (cleanWouldScore && priorClean >= WEEKLY_CLEAN_SCORE_DAYS) pts -= 1;
  return Math.round(pts * 10) / 10;
}

export function calcProfilePts(
  currentVal: string | number,
  goalVal: number | null,
  startVal: number | null,
  direction: string,
): number {
  const goal = goalVal != null ? parseFloat(String(goalVal)) : NaN;
  const curr = parseFloat(String(currentVal));
  const start = startVal != null ? parseFloat(String(startVal)) : NaN;
  if (Number.isNaN(goal) || Number.isNaN(curr) || Number.isNaN(start)) return 0;
  const range = Math.abs(goal - start);
  if (range === 0) return curr === goal ? PROFILE_MAX_PTS : 0;
  const progress =
    direction === 'down'
      ? (start - curr) / range
      : (curr - start) / range;
  return Math.round(Math.min(1, Math.max(0, progress)) * PROFILE_MAX_PTS * 10) / 10;
}

/**
 * Personal goal pts for one logged value (0–30 progress toward goal).
 * `asOfDate` is kept for call-site compatibility; scoring is progress-only.
 */
export function calcPersonalGoalPtsForDay(
  profile: ProfileData,
  entryValue: number,
  _asOfDate: string,
): number {
  if (!profile.lockedGoal || profile.goal == null || profile.startVal == null) return 0;
  return calcProfilePts(
    entryValue,
    profile.goal,
    profile.startVal,
    profile.direction || 'down',
  );
}

function pickLatestGoalEntry(entries: GoalDayEntry[]): GoalDayEntry | null {
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) => {
    const dc = b.date.slice(0, 10).localeCompare(a.date.slice(0, 10));
    if (dc !== 0) return dc;
    return String(b.time).localeCompare(String(a.time));
  })[0]!;
}

/** Single current personal-goal score (latest logged value; not a sum of historical rows). */
export function calcPersonalGoalPts(profile: ProfileData | undefined): number {
  if (!profile?.lockedGoal || profile.goal == null || profile.startVal == null) return 0;
  const latest = pickLatestGoalEntry(profile.entries ?? []);
  const value = latest != null ? latest.value : profile.startVal;
  return calcProfilePts(
    value,
    profile.goal,
    profile.startVal,
    profile.direction || 'down',
  );
}

export function getFreeCounts(entries: WorkoutRecord[]): Record<
  PersonId,
  { gym: number; junk: number }
> {
  const counts: Record<string, { gym: number; junk: number }> = {};
  for (const p of PEOPLE) counts[p.id] = { gym: 0, junk: 0 };
  for (const e of entries) {
    if (e.gym === 'free-gym') counts[e.personId]!.gym++;
    if (e.junk === 'free-junk') counts[e.personId]!.junk++;
  }
  return counts;
}

type WorkoutRecord = Pick<WorkoutEntry, 'personId' | 'gym' | 'junk' | 'date'>;

export function getWindowLimits(
  entries: WorkoutEntry[],
  personId: string,
  /** Which calendar day’s week window to evaluate (e.g. selected workout log date). */
  referenceDate: string = today(),
): {
  gymDays: number;
  cleanDays: number;
  gymMaxed: boolean;
  cleanMaxed: boolean;
  windowNum: number;
} {
  const startDate = CHALLENGE_START;
  const currentWin = windowOf(referenceDate, startDate);
  const winEntries = entries.filter(
    (e) => e.personId === personId && windowOf(e.date, startDate) === currentWin,
  );

  const gymDays = winEntries.filter(
    (e) => e.gym === 'went' || e.gym === 'free-gym',
  ).length;
  const cleanDays = winEntries.filter(
    (e) => e.junk === 'clean' || e.junk === 'free-junk',
  ).length;

  return {
    gymDays,
    cleanDays,
    gymMaxed: gymDays >= WEEKLY_GYM_SCORE_DAYS,
    cleanMaxed: cleanDays >= WEEKLY_CLEAN_SCORE_DAYS,
    windowNum: currentWin + 1,
  };
}

export function getTotals(
  entries: WorkoutEntry[],
  profiles: Record<string, ProfileData | undefined>,
): RankedPlayer[] {
  const totals: Record<string, RankedPlayer> = {};
  for (const p of PEOPLE) {
    totals[p.id] = {
      personId: p.id,
      name: p.name,
      pts: 0,
      days: 0,
      profilePts: 0,
    };
  }

  for (const e of entries) {
    const t = totals[e.personId];
    if (t) {
      t.pts = Math.round((t.pts + e.pts) * 10) / 10;
      t.days++;
    }
  }

  for (const p of PEOPLE) {
    const pData = profiles[p.id];
    if (pData) {
      const profilePts = calcPersonalGoalPts(pData);
      totals[p.id]!.profilePts = profilePts;
      totals[p.id]!.pts = Math.round((totals[p.id]!.pts + profilePts) * 10) / 10;
    }
  }

  return Object.values(totals).sort((a, b) => b.pts - a.pts);
}

export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function fmtPts(n: number): string {
  return (n > 0 ? '+' : '') + n;
}

export type PtsTone = 'pos' | 'neg' | 'zero';

export function ptsClass(n: number): PtsTone {
  return n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero';
}

export function stepsPtsFromEntry(steps: number): number {
  return Math.round((Math.min(steps, 10000) / 10000) * 5 * 10) / 10;
}
