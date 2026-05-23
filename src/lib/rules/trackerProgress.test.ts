import { describe, it, expect } from 'vitest';
import { computeTrackerProgress } from './trackerProgress';

const lossGoal = { startVal: 190, goalVal: 170, direction: 'down' as const };
const gainGoal = { startVal: 100, goalVal: 150, direction: 'up' as const };

describe('computeTrackerProgress', () => {
  it('returns 0% at start', () => {
    const r = computeTrackerProgress(lossGoal, 190);
    expect(r.pct).toBe(0);
    expect(r.regressed).toBe(false);
  });

  it('returns 100% at goal', () => {
    const r = computeTrackerProgress(lossGoal, 170);
    expect(r.pct).toBe(1);
    expect(r.regressed).toBe(false);
  });

  it('scales linearly toward goal (187 = 15%)', () => {
    const r = computeTrackerProgress(lossGoal, 187);
    expect(r.pct).toBeCloseTo(0.15);
    expect(r.barPct).toBeCloseTo(15);
  });

  it('returns 0% when current regresses past start (194 on loss tracker)', () => {
    const r = computeTrackerProgress(lossGoal, 194);
    expect(r.pct).toBe(0);
    expect(r.barPct).toBe(0);
    expect(r.regressed).toBe(true);
    expect(r.remainingToGoal).toBe(24);
  });

  it('caps at 100% when goal is overshot', () => {
    const r = computeTrackerProgress(lossGoal, 165);
    expect(r.pct).toBe(1);
    expect(r.regressed).toBe(false);
  });

  it('returns 0% when current regresses below start on gain tracker', () => {
    const r = computeTrackerProgress(gainGoal, 95);
    expect(r.pct).toBe(0);
    expect(r.regressed).toBe(true);
  });

  it('scales linearly on gain tracker', () => {
    const r = computeTrackerProgress(gainGoal, 125);
    expect(r.pct).toBe(0.5);
  });
});
