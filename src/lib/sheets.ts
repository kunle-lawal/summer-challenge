import type {
  ProfileData,
  RawGoalLogRow,
  RawProfileRow,
  RawResetLogRow,
  RawWorkoutRow,
  ResetLogEntry,
  SheetsPayload,
  WorkoutEntry,
} from '../types';
import { normalizeDateToYYYYMMDD, today } from './dates';

function parseBool(v: boolean | string | undefined): boolean {
  return v === true || v === 'TRUE';
}

export function normalizeWorkoutRows(rows: RawWorkoutRow[] | undefined): WorkoutEntry[] {
  if (!rows) return [];
  return rows
    .map((r) => ({
      date: normalizeDateToYYYYMMDD(r.date) || today(),
      personId: String(r.personId ?? ''),
      time: String(r.time ?? '—'),
      gym: String(r.gym ?? ''),
      steps: parseFloat(String(r.steps)) || 0,
      junk: String(r.junk ?? ''),
      pts: parseFloat(String(r.pts)) || 0,
      lockedDay: parseBool(r.lockedDay),
    }))
    .filter((r) => r.date && r.personId);
}

export function normalizeProfiles(
  profileRows: RawProfileRow[] | undefined,
  goalRows: RawGoalLogRow[] | undefined,
): Record<string, ProfileData> {
  const profiles: Record<string, ProfileData> = {};

  for (const r of profileRows ?? []) {
    if (!r.personId) continue;
    profiles[r.personId] = {
      goal: r.goal !== '' && r.goal != null ? parseFloat(String(r.goal)) : null,
      startVal:
        r.startVal !== '' && r.startVal != null
          ? parseFloat(String(r.startVal))
          : null,
      direction: String(r.direction ?? 'down'),
      lockedGoal: parseBool(r.lockedGoal),
      goalResets: parseInt(String(r.goalResets), 10) || 0,
      entries: [],
    };
  }

  for (const r of goalRows ?? []) {
    const pid = String(r.personId ?? '');
    if (!profiles[pid]) continue;
    profiles[pid]!.entries.push({
      date: normalizeDateToYYYYMMDD(r.date) || String(r.date ?? '').slice(0, 10) || today(),
      time: String(r.time ?? '—'),
      value: parseFloat(String(r.value)) || 0,
      pts: parseFloat(String(r.pts)) || 0,
      lockedDay: parseBool(r.lockedDay),
    });
  }

  return profiles;
}

export function normalizePasswords(
  rows: { key?: string; password?: string }[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows ?? []) {
    if (r.key) out[String(r.key)] = String(r.password ?? '1234');
  }
  return out;
}

export function normalizeResetLog(rows: RawResetLogRow[] | undefined): ResetLogEntry[] {
  if (!rows) return [];
  const out: ResetLogEntry[] = [];
  for (const r of rows) {
    const date =
      normalizeDateToYYYYMMDD(r.date) || String(r.date ?? '').slice(0, 10) || today();
    const time = String(r.time ?? '—');
    const personId = String(r.personId ?? '');
    const type = String(r.type ?? '');

    if (type === 'goal_reset') {
      out.push({
        date,
        time,
        personId,
        type: 'goal_reset',
        previousGoal: r.previousGoal,
        previousStart: r.previousStart,
        previousDirection: String(r.previousDirection ?? ''),
        resetNumber: parseInt(String(r.resetNumber), 10) || 0,
      });
    } else if (type === 'goal_set') {
      out.push({
        date,
        time,
        personId,
        type: 'goal_set',
        goal: parseFloat(String(r.goal)) || 0,
        startVal: parseFloat(String(r.startVal)) || 0,
        direction: String(r.direction ?? 'down'),
        setNumber: parseInt(String(r.setNumber), 10) || 0,
      });
    }
  }
  return out;
}

export interface ChallengeCache {
  entries: WorkoutEntry[];
  profiles: Record<string, ProfileData>;
  passwords: Record<string, string>;
  resetLog: ResetLogEntry[];
}

export function cacheFromPayload(data: SheetsPayload): ChallengeCache {
  if (data.error) throw new Error(data.error);

  return {
    entries: normalizeWorkoutRows(data.workout_log),
    profiles: normalizeProfiles(data.profiles, data.goal_log),
    passwords: normalizePasswords(data.passwords),
    resetLog: normalizeResetLog(data.reset_log),
  };
}

export async function fetchSheetsJson(url: string): Promise<SheetsPayload> {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  const data = JSON.parse(text) as SheetsPayload;
  return data;
}

export async function postToSheets(
  url: string,
  action: string,
  data: unknown,
): Promise<void> {
  if (!url || url === 'YOUR_APPS_SCRIPT_URL_HERE') return;
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action, data }),
    });
  } catch (err) {
    console.error(`Sheets sync failed (${action}):`, err);
  }
}
