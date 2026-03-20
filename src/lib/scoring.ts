import type { PersonId, ProfileData, RankedPlayer, WorkoutEntry } from '../types';
import { CHALLENGE_START, PEOPLE, PROFILE_MAX_PTS } from './config';
import { today, windowOf } from './dates';

export function calcPts(gym: string, steps: string | number, junk: string): number {
  let pts = 0;
  if (gym === 'went' || gym === 'free-gym') pts += 1;
  if (junk === 'clean' || junk === 'free-junk') pts += 1;
  if (junk === 'ate') pts -= 1;
  const s = Math.max(0, parseFloat(String(steps)) || 0);
  pts += Math.round((Math.min(s, 10000) / 10000) * 5 * 10) / 10;
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
): {
  gymDays: number;
  cleanDays: number;
  gymMaxed: boolean;
  cleanMaxed: boolean;
  windowNum: number;
} {
  const startDate = CHALLENGE_START;
  const currentWin = windowOf(today(), startDate);
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
    gymMaxed: gymDays >= 4,
    cleanMaxed: cleanDays >= 6,
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
    if (pData?.entries) {
      const profileTotal = pData.entries.reduce((sum, e) => sum + (e.pts || 0), 0);
      const rounded = Math.round(profileTotal * 10) / 10;
      totals[p.id]!.profilePts = rounded;
      totals[p.id]!.pts = Math.round((totals[p.id]!.pts + rounded) * 10) / 10;
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
