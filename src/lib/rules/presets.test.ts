import { describe, it, expect } from 'vitest';
import { RULE_KINDS } from '../../types';
import { classicPreset, minimalPreset } from './presets';

describe('classicPreset', () => {
  const ids: [string, string, string, string] = ['gym-id', 'steps-id', 'junk-id', 'weight-id'];
  const rules = classicPreset(ids);

  it('returns exactly 4 rules', () => {
    expect(rules).toHaveLength(4);
  });

  it('uses the provided IDs', () => {
    expect(rules[0]?.id).toBe('gym-id');
    expect(rules[1]?.id).toBe('steps-id');
    expect(rules[2]?.id).toBe('junk-id');
    expect(rules[3]?.id).toBe('weight-id');
  });

  it('all rules have valid kinds', () => {
    for (const rule of rules) {
      expect(RULE_KINDS).toContain(rule.kind);
    }
  });

  it('gym rule is binary with weekly cap of 4', () => {
    const gym = rules[0];
    expect(gym?.kind).toBe('binary');
    if (gym?.kind !== 'binary') return;
    expect(gym.weeklyCap?.maxScoringDays).toBe(4);
    expect(gym.freePasses?.count).toBe(5);
  });

  it('steps rule is counter targeting 10 000 for 5 pts', () => {
    const steps = rules[1];
    expect(steps?.kind).toBe('counter');
    if (steps?.kind !== 'counter') return;
    expect(steps.target).toBe(10_000);
    expect(steps.maxPoints).toBe(5);
  });

  it('junk rule is penalty with weeklyFirstWaived and 5 free passes', () => {
    const junk = rules[2];
    expect(junk?.kind).toBe('penalty');
    if (junk?.kind !== 'penalty') return;
    expect(junk.weeklyFirstWaived).toBe(true);
    expect(junk.freePasses?.count).toBe(5);
    expect(junk.pointsPerInfraction).toBeLessThan(0);
  });

  it('weight rule is tracker with maxPoints 30', () => {
    const weight = rules[3];
    expect(weight?.kind).toBe('tracker');
    if (weight?.kind !== 'tracker') return;
    expect(weight.maxPoints).toBe(30);
  });

  it('all rules have required BaseRule fields', () => {
    for (const rule of rules) {
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
      expect(typeof rule.name).toBe('string');
      expect(typeof rule.order).toBe('number');
    }
  });

  it('rules have ascending order values', () => {
    const orders = rules.map(r => r.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe('minimalPreset', () => {
  it('returns exactly 1 rule', () => {
    expect(minimalPreset('id1', 'Workout')).toHaveLength(1);
  });

  it('returns a binary rule with the provided id and name', () => {
    const [rule] = minimalPreset('my-id', 'Meditation');
    expect(rule?.id).toBe('my-id');
    expect(rule?.name).toBe('Meditation');
    expect(rule?.kind).toBe('binary');
  });

  it('includes the optional emoji when provided', () => {
    const [rule] = minimalPreset('id2', 'Run', '🏃');
    expect(rule?.emoji).toBe('🏃');
  });

  it('has no free passes and no weekly cap by default', () => {
    const [rule] = minimalPreset('id3', 'Read');
    if (rule?.kind !== 'binary') return;
    expect(rule.freePasses).toBeNull();
    expect(rule.weeklyCap).toBeNull();
  });

  it('has correct points schema', () => {
    const [rule] = minimalPreset('id4', 'Stretch');
    if (rule?.kind !== 'binary') return;
    expect(rule.pointsYes).toBeGreaterThan(0);
    expect(rule.pointsNo).toBe(0);
  });

  it('has order 0', () => {
    const [rule] = minimalPreset('id5', 'Walk');
    expect(rule?.order).toBe(0);
  });
});
