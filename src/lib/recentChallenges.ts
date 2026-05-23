/**
 * Recent-challenges list in localStorage.
 *
 * Powers the `/` root redirect (most-recently-visited challenge wins) and
 * the challenge-switcher dropdown in the top bar. Capped at MAX_RECENT
 * entries to keep localStorage small.
 *
 * See RecentChallenge in types/localStorage.ts for the stored shape.
 */

import type { RecentChallenge } from '../types';
import { LS_KEYS } from '../types';

const MAX_RECENT = 10;

function readList(): RecentChallenge[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.recentChallenges);
    if (!raw) return [];
    return JSON.parse(raw) as RecentChallenge[];
  } catch {
    return [];
  }
}

function writeList(list: RecentChallenge[]): void {
  localStorage.setItem(LS_KEYS.recentChallenges, JSON.stringify(list));
}

/**
 * Get the list of recently visited challenges, sorted newest-first.
 */
export function getRecentChallenges(): RecentChallenge[] {
  return readList().sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
}

/**
 * Record a challenge visit, upserting by slug and trimming to MAX_RECENT.
 * The stored name is refreshed on each visit in case the owner renamed it.
 */
export function recordChallengeVisit(slug: string, name: string): void {
  const existing = readList().filter(c => c.slug !== slug);
  existing.push({ slug, name, lastVisitedAt: Date.now() });
  existing.sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
  writeList(existing.slice(0, MAX_RECENT));
}

/**
 * Return the most recently visited challenge, or null if none are stored.
 */
export function getMostRecentChallenge(): RecentChallenge | null {
  const list = getRecentChallenges();
  return list[0] ?? null;
}

/**
 * Remove a specific challenge from the recent list by slug.
 */
export function removeFromRecent(slug: string): void {
  writeList(readList().filter(c => c.slug !== slug));
}
