import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isOnCooldown,
  getCooldownRemainingMs,
  recordCreateTimestamp,
  clearCooldown,
} from './createCooldown';

const HOUR_MS = 60 * 60 * 1000;

describe('createCooldown', () => {
  beforeEach(() => clearCooldown());
  afterEach(() => clearCooldown());

  // ---------------------------------------------------------------------------
  // isOnCooldown
  // ---------------------------------------------------------------------------

  it('is not on cooldown when no timestamp has been recorded', () => {
    expect(isOnCooldown(Date.now())).toBe(false);
  });

  it('is on cooldown immediately after recording a timestamp', () => {
    const now = 1_000_000_000_000;
    recordCreateTimestamp(now);
    expect(isOnCooldown(now)).toBe(true);
  });

  it('is still on cooldown 1 ms before the hour expires', () => {
    const created = 1_000_000_000_000;
    recordCreateTimestamp(created);
    expect(isOnCooldown(created + HOUR_MS - 1)).toBe(true);
  });

  it('is NOT on cooldown exactly when the hour expires', () => {
    const created = 1_000_000_000_000;
    recordCreateTimestamp(created);
    expect(isOnCooldown(created + HOUR_MS)).toBe(false);
  });

  it('is not on cooldown after more than 1 hour has passed', () => {
    const created = 1_000_000_000_000;
    recordCreateTimestamp(created);
    expect(isOnCooldown(created + HOUR_MS + 1)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // getCooldownRemainingMs
  // ---------------------------------------------------------------------------

  it('returns 0 remaining when no state is stored', () => {
    expect(getCooldownRemainingMs(Date.now())).toBe(0);
  });

  it('returns the correct remaining time mid-cooldown', () => {
    const created = 1_000_000_000_000;
    recordCreateTimestamp(created);
    const checkAt = created + 30 * 60 * 1000; // 30 minutes later
    expect(getCooldownRemainingMs(checkAt)).toBe(30 * 60 * 1000);
  });

  it('returns 0 after the cooldown has expired', () => {
    const created = 1_000_000_000_000;
    recordCreateTimestamp(created);
    expect(getCooldownRemainingMs(created + HOUR_MS + 999)).toBe(0);
  });

  it('returns approximately HOUR_MS right after recording', () => {
    const created = 1_000_000_000_000;
    recordCreateTimestamp(created);
    expect(getCooldownRemainingMs(created)).toBe(HOUR_MS);
  });

  // ---------------------------------------------------------------------------
  // recordCreateTimestamp
  // ---------------------------------------------------------------------------

  it('resets the cooldown when called a second time', () => {
    const first = 1_000_000_000_000;
    recordCreateTimestamp(first);

    // Advance 59 min — still on cooldown from the first create
    const secondCreate = first + 59 * 60 * 1000;
    recordCreateTimestamp(secondCreate); // reset

    // 59 min after the SECOND create should still be on cooldown
    expect(isOnCooldown(secondCreate + 59 * 60 * 1000)).toBe(true);
    // 61 min after the SECOND create should be off cooldown
    expect(isOnCooldown(secondCreate + 61 * 60 * 1000)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // clearCooldown
  // ---------------------------------------------------------------------------

  it('removes the cooldown state entirely', () => {
    recordCreateTimestamp(Date.now());
    clearCooldown();
    expect(isOnCooldown(Date.now())).toBe(false);
    expect(getCooldownRemainingMs(Date.now())).toBe(0);
  });
});
