/**
 * Direction-aware tracker progress — shared by scoring and the log UI bar.
 *
 * Progress only increases when the current value moves toward the goal.
 * Moving away from the goal (e.g. gaining weight on a loss tracker) yields 0%.
 */

import type { TrackerDirection } from '../../types';

export interface TrackerProgressInput {
  startVal: number;
  goalVal: number;
  direction: TrackerDirection;
}

export interface TrackerProgress {
  /** Progress toward goal, 0–1 (clamped). */
  pct: number;
  /** Same as pct × 100 — bar fill width and thumb position. */
  barPct: number;
  /** Absolute distance from current value to goal. */
  remainingToGoal: number;
  /** Current value moved away from the goal relative to start. */
  regressed: boolean;
}

export function computeTrackerProgress(
  config: TrackerProgressInput,
  current: number | null,
): TrackerProgress {
  const { startVal, goalVal, direction } = config;
  const totalChange = Math.abs(goalVal - startVal);

  if (current === null || totalChange === 0) {
    return {
      pct: 0,
      barPct: 0,
      remainingToGoal: totalChange,
      regressed: false,
    };
  }

  const rawProgress =
    direction === 'down' ? startVal - current : current - startVal;

  const pct = Math.min(1, Math.max(0, rawProgress / totalChange));
  const regressed = rawProgress < 0;

  return {
    pct,
    barPct: pct * 100,
    remainingToGoal: Math.abs(goalVal - current),
    regressed,
  };
}
