import type { GoalDayEntry, ProfileData, ResetLogEntry, WorkoutEntry } from '../types';
import { PEOPLE } from './config';
import { formatHistoryDate, formatHistoryTime } from './dates';
import { ptsClass, stepsPtsFromEntry } from './scoring';
import type { PtsTone } from './scoring';

export type HistoryDisplayRow =
  | {
      kind: 'workout';
      sortDate: string;
      sortTime: string;
      dateDisplay: string;
      timeDisplay: string;
      name: string;
      pill: 'workout';
      gym: string;
      junk: string;
      steps: number;
      stepPts: number;
      pts: number;
      ptsTone: PtsTone;
    }
  | {
      kind: 'goal';
      sortDate: string;
      sortTime: string;
      dateDisplay: string;
      timeDisplay: string;
      name: string;
      pill: 'goal';
      value: number;
      goal: number | null;
      dirLabel: string;
      pts: number;
    }
  | {
      kind: 'goal_set';
      sortDate: string;
      sortTime: string;
      dateDisplay: string;
      timeDisplay: string;
      name: string;
      pill: 'goal_set';
      goal: number;
      startVal: number;
      direction: string;
      setNumber: number;
    }
  | {
      kind: 'goal_reset';
      sortDate: string;
      sortTime: string;
      dateDisplay: string;
      timeDisplay: string;
      name: string;
      pill: 'goal_reset';
      previousGoal: unknown;
      previousStart: unknown;
      previousDirection: string;
      resetNumber: number;
    };

function parseTime(t: string): number {
  if (!t || t === '—') return -1;
  const m = t.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)/i);
  if (!m) return -1;
  let h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  const sec = parseInt(m[3] || '0', 10);
  const ampm = m[4]!.toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 3600 + min * 60 + sec;
}

export function buildHistoryRows(
  entries: WorkoutEntry[],
  profiles: Record<string, ProfileData | undefined>,
  resetLog: ResetLogEntry[],
): HistoryDisplayRow[] {
  const rows: HistoryDisplayRow[] = [];

  for (const e of entries) {
    const name = PEOPLE.find((p) => p.id === e.personId)?.name ?? e.personId;
    const sp = stepsPtsFromEntry(e.steps);
    rows.push({
      kind: 'workout',
      sortDate: e.date,
      sortTime: e.time || '—',
      dateDisplay: formatHistoryDate(e.date),
      timeDisplay: formatHistoryTime(e.time),
      name,
      pill: 'workout',
      gym: e.gym,
      junk: e.junk,
      steps: e.steps,
      stepPts: sp,
      pts: e.pts,
      ptsTone: ptsClass(e.pts),
    });
  }

  for (const p of PEOPLE) {
    const pData = profiles[p.id];
    if (!pData?.entries) continue;
    const dirLabel = pData.direction === 'up' ? 'going up' : 'going down';
    for (const e of pData.entries) {
      rows.push(rowFromGoalEntry(e, p.name, pData.goal, dirLabel));
    }
  }

  for (const e of resetLog) {
    const name = PEOPLE.find((p) => p.id === e.personId)?.name ?? e.personId;
    if (e.type === 'goal_set') {
      rows.push({
        kind: 'goal_set',
        sortDate: e.date,
        sortTime: e.time || '—',
        dateDisplay: formatHistoryDate(e.date),
        timeDisplay: formatHistoryTime(e.time),
        name,
        pill: 'goal_set',
        goal: e.goal,
        startVal: e.startVal,
        direction: e.direction,
        setNumber: e.setNumber,
      });
    } else if (e.type === 'goal_reset') {
      rows.push({
        kind: 'goal_reset',
        sortDate: e.date,
        sortTime: e.time || '—',
        dateDisplay: formatHistoryDate(e.date),
        timeDisplay: formatHistoryTime(e.time),
        name,
        pill: 'goal_reset',
        previousGoal: e.previousGoal,
        previousStart: e.previousStart,
        previousDirection: e.previousDirection,
        resetNumber: e.resetNumber,
      });
    }
  }

  rows.sort((a, b) => {
    const dc = b.sortDate.localeCompare(a.sortDate);
    if (dc !== 0) return dc;
    return parseTime(b.sortTime) - parseTime(a.sortTime);
  });

  return rows;
}

function rowFromGoalEntry(
  e: GoalDayEntry,
  name: string,
  goal: number | null,
  dirLabel: string,
): HistoryDisplayRow {
  return {
    kind: 'goal',
    sortDate: e.date,
    sortTime: e.time || '—',
    dateDisplay: formatHistoryDate(e.date),
    timeDisplay: formatHistoryTime(e.time),
    name,
    pill: 'goal',
    value: e.value,
    goal,
    dirLabel,
    pts: e.pts,
  };
}
