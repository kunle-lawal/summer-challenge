import type { Person } from '../types';

const DEFAULT_PEOPLE: readonly Person[] = [
  { id: 'kunle', name: 'Kunle' },
  { id: 'ella', name: 'Ella' },
  { id: 'scar', name: 'Scar' },
  { id: 'marcus', name: 'Marcus' },
  { id: 'will', name: 'Will' },
  { id: 'sandro', name: 'Sandro' },
];

function parsePeopleJson(raw: string | undefined): Person[] {
  if (raw == null || raw.trim() === '') return [...DEFAULT_PEOPLE];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_PEOPLE];
    const out: Person[] = [];
    for (const row of parsed) {
      if (row && typeof row === 'object' && 'id' in row && 'name' in row) {
        const id = String((row as { id: unknown }).id);
        const name = String((row as { name: unknown }).name);
        if (id && name) out.push({ id, name });
      }
    }
    return out.length > 0 ? out : [...DEFAULT_PEOPLE];
  } catch {
    return [...DEFAULT_PEOPLE];
  }
}

export const FREE_LIMIT = 5;
export const PROFILE_MAX_PTS = 30;

export const SCRIPT_URL: string = import.meta.env.VITE_SCRIPT_URL ?? '';

export const CHALLENGE_START: string =
  import.meta.env.VITE_CHALLENGE_START?.trim() || '2026-03-17';

/** Inclusive end date for challenge (personal-goal missed-day penalties stop here). */
export const CHALLENGE_END: string =
  import.meta.env.VITE_CHALLENGE_END?.trim() || '2026-04-17';

export const PEOPLE: Person[] = parsePeopleJson(import.meta.env.VITE_PEOPLE);

export const GOAL_RESET_OPEN: Date = new Date(
  import.meta.env.VITE_GOAL_RESET_OPEN ?? '2026-03-16T00:00:00',
);

export const GOAL_RESET_CLOSE: Date = new Date(
  import.meta.env.VITE_GOAL_RESET_CLOSE ?? '2026-03-20T23:59:59',
);

export function isScriptConfigured(): boolean {
  return (
    SCRIPT_URL !== '' &&
    SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE'
  );
}
