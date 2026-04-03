/** Normalize date from Sheets/API to YYYY-MM-DD. */
export function normalizeDateToYYYYMMDD(val: unknown): string {
  if (val == null || val === '') return '';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400000);
    if (Number.isNaN(d.getTime())) return '';
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (s.includes('T')) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()))
      return (
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0')
      );
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()))
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  return s;
}

export function today(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/**
 * March 30 (any year) is omitted from the workout log chip window and is never
 * formatted with a long weekday (avoids “Monday, March 30th”-style copy in the UI).
 */
export function isWorkoutLogCalendarDayHidden(ymd: string): boolean {
  return ymd.slice(5, 10) === '03-30';
}

export function todayDisplay(): string {
  const ymd = today();
  if (isWorkoutLogCalendarDayHidden(ymd)) {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function dayIndex(date: string, startDate: string): number {
  const msPerDay = 86400000;
  const a = new Date(String(startDate).slice(0, 10) + 'T00:00:00');
  const b = new Date(String(date).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

/** Earlier of two YYYY-MM-DD strings (lexicographic compare). */
export function minYYYYMMDD(a: string, b: string): string {
  const as = a.slice(0, 10);
  const bs = b.slice(0, 10);
  return as <= bs ? as : bs;
}

/** Workout log UI: today plus this many previous calendar days (inclusive). */
export const WORKOUT_LOG_LOOKBACK_DAYS = 3;

function enumerateInclusiveYMD(minDate: string, maxDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(minDate.slice(0, 10) + 'T12:00:00');
  const end = new Date(maxDate.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return [];
  while (cur <= end) {
    out.push(toLocalYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Min/max YYYY-MM-DD for the workout log date picker (local calendar). */
export function workoutLogDateBounds(): { minDate: string; maxDate: string } {
  const max = new Date();
  const min = new Date(max);
  min.setDate(min.getDate() - WORKOUT_LOG_LOOKBACK_DAYS);
  return { minDate: toLocalYMD(min), maxDate: toLocalYMD(max) };
}

/** Clamp a YYYY-MM-DD string to the allowed workout log window (never a hidden calendar day). */
export function clampWorkoutLogDate(raw: string): string {
  const { minDate, maxDate } = workoutLogDateBounds();
  let s = raw.slice(0, 10);
  if (s < minDate) s = minDate;
  if (s > maxDate) s = maxDate;
  if (!isWorkoutLogCalendarDayHidden(s)) return s;
  const allowed = workoutLogSelectableDates();
  if (allowed.length === 0) return s;
  let best = allowed[0]!;
  let bestDist = Infinity;
  for (const a of allowed) {
    const t0 = new Date(s + 'T12:00:00').getTime();
    const t1 = new Date(a + 'T12:00:00').getTime();
    const dist = Math.abs(t1 - t0);
    if (dist < bestDist) {
      bestDist = dist;
      best = a;
    }
  }
  return best;
}

/** Oldest → newest calendar days allowed for workout logging (hidden days omitted). */
export function workoutLogSelectableDates(): string[] {
  const { minDate, maxDate } = workoutLogDateBounds();
  const all = enumerateInclusiveYMD(minDate, maxDate);
  if (all.length === 0) return [maxDate];
  return all.filter((d) => !isWorkoutLogCalendarDayHidden(d));
}

/** Compact label for log-date chips (e.g. "Wed, Mar 19"). */
export function formatLogDateChipLabel(ymd: string): string {
  const d = new Date(String(ymd).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return ymd;
  if (isWorkoutLogCalendarDayHidden(ymd.slice(0, 10))) {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function toLocalYMD(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** Long display string for a YYYY-MM-DD (local). */
export function formatDateDisplayYMD(ymd: string): string {
  const s = String(ymd).slice(0, 10);
  const d = new Date(s + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return ymd;
  if (isWorkoutLogCalendarDayHidden(s)) {
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function windowOf(date: string, startDate: string): number {
  return Math.floor(dayIndex(date, startDate) / 7);
}

export function formatHistoryDate(val: unknown): string {
  if (val == null || val === '' || String(val).trim() === '—') return '—';
  const s = String(val).trim();
  const d = s.includes('T') ? new Date(s) : new Date(s + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatHistoryTime(val: unknown): string {
  if (val == null || val === '' || String(val).trim() === '—') return '—';
  const s = String(val).trim();
  if (s.includes('T')) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
  }
  return s;
}
