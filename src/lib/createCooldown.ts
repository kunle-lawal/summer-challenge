/**
 * Client-side challenge-create cooldown (1 hour).
 *
 * Stores the last-created timestamp in localStorage. The Create wizard
 * checks this on mount and shows a friendly "try again in N minutes" notice
 * if within the cooldown window. Bypassable by clearing storage — real
 * abuse protection is Firebase App Check. See V2_PLAN §3.6.
 */

import type { CreateCooldownState } from '../types';
import { LS_KEYS } from '../types';

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

function readState(): CreateCooldownState | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.createCooldown);
    if (!raw) return null;
    return JSON.parse(raw) as CreateCooldownState;
  } catch {
    return null;
  }
}

/**
 * True if the user created a challenge within the last hour on this device.
 * Pass `now` (ms epoch) to override for testing.
 */
export function isOnCooldown(now: number = Date.now()): boolean {
  const state = readState();
  if (!state) return false;
  return now - state.lastCreatedAt < COOLDOWN_MS;
}

/**
 * How many milliseconds remain on the cooldown window.
 * Returns 0 if the user is not on cooldown.
 * Pass `now` (ms epoch) to override for testing.
 */
export function getCooldownRemainingMs(now: number = Date.now()): number {
  const state = readState();
  if (!state) return 0;
  return Math.max(0, COOLDOWN_MS - (now - state.lastCreatedAt));
}

/**
 * Record the current time as the last challenge-create timestamp.
 * Starts or resets the cooldown window.
 * Pass `now` (ms epoch) to override for testing.
 */
export function recordCreateTimestamp(now: number = Date.now()): void {
  const state: CreateCooldownState = { lastCreatedAt: now };
  localStorage.setItem(LS_KEYS.createCooldown, JSON.stringify(state));
}

/**
 * Clear the cooldown state.
 * Use in tests and admin-bypass flows.
 */
export function clearCooldown(): void {
  localStorage.removeItem(LS_KEYS.createCooldown);
}
