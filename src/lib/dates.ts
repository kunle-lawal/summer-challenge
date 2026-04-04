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

export function todayDisplay(): string {
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

/** Min/max YYYY-MM-DD for the workout log date picker (local calendar). */
export function workoutLogDateBounds(): { minDate: string; maxDate: string } {
  const max = new Date();
  const min = new Date(max);
  min.setDate(min.getDate() - WORKOUT_LOG_LOOKBACK_DAYS);
  return { minDate: toLocalYMD(min), maxDate: toLocalYMD(max) };
}

/** Clamp a YYYY-MM-DD string to the allowed workout log window. */
export function clampWorkoutLogDate(raw: string): string {
  const { minDate, maxDate } = workoutLogDateBounds();
  const s = raw.slice(0, 10);
  if (s < minDate) return minDate;
  if (s > maxDate) return maxDate;
  return s;
}

/** Oldest → newest calendar days allowed for workout logging (length = WORKOUT_LOG_LOOKBACK_DAYS + 1). */
export function workoutLogSelectableDates(): string[] {
  const { minDate, maxDate } = workoutLogDateBounds();
  const out: string[] = [];
  const cur = new Date(minDate.slice(0, 10) + 'T12:00:00');
  const end = new Date(maxDate.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return [maxDate];
  while (cur <= end) {
    out.push(toLocalYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Compact label for log-date chips (e.g. "Wed, Mar 19"). */
export function formatLogDateChipLabel(ymd: string): string {
  const d = new Date(String(ymd).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return ymd;
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
  const d = new Date(String(ymd).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return ymd;
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
