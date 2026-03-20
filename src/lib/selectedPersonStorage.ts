import { PEOPLE } from './config';
import type { Person } from '../types';

export const SELECTED_PERSON_STORAGE_KEY = 'summer-challenge-selected-person-id';

export function readStoredPersonId(): string | null {
  try {
    const raw = localStorage.getItem(SELECTED_PERSON_STORAGE_KEY);
    if (raw == null || raw.trim() === '') return null;
    return raw.trim();
  } catch {
    return null;
  }
}

/** Returns the roster Person when the stored id matches someone in `PEOPLE`. */
export function getStoredPerson(): Person | null {
  const id = readStoredPersonId();
  if (!id) return null;
  return PEOPLE.find((p) => p.id === id) ?? null;
}

export function writeStoredPersonId(personId: string): void {
  try {
    localStorage.setItem(SELECTED_PERSON_STORAGE_KEY, personId);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredPersonId(): void {
  try {
    localStorage.removeItem(SELECTED_PERSON_STORAGE_KEY);
  } catch {
    // ignore
  }
}
