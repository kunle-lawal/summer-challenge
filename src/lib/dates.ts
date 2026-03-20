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
