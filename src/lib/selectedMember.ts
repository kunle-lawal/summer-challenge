/**
 * Per-challenge selected-member cache in localStorage.
 *
 * Identity in v2 is "which member are you in THIS challenge." A real human
 * can be "Alex" in challenge A and "Sandro" in challenge B simultaneously;
 * the selections are completely independent. Key format: `sc:selected:{slug}`.
 *
 * See V2_PLAN §4.2 and LS_KEYS in types/localStorage.ts.
 */

import { LS_KEYS } from '../types';

/**
 * Get the cached member ID for a challenge slug.
 * Returns null if no selection has been made or storage is unavailable.
 */
export function getSelectedMember(slug: string): string | null {
  return localStorage.getItem(LS_KEYS.selectedMemberPrefix + slug);
}

/**
 * Cache a member selection for a challenge slug.
 */
export function setSelectedMember(slug: string, memberId: string): void {
  localStorage.setItem(LS_KEYS.selectedMemberPrefix + slug, memberId);
}

/**
 * Clear the cached member selection for a challenge slug.
 * Called when a member is removed or the user explicitly switches.
 */
export function clearSelectedMember(slug: string): void {
  localStorage.removeItem(LS_KEYS.selectedMemberPrefix + slug);
}
