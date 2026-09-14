/**
 * Turning stored values into things a person reads.
 *
 * The design prototype formats by rule id — `"Went"` for gym, `"Clean"` for
 * junk. Real rules are user-defined, so these format by kind and lean on the
 * rule's own `unit` and `decimals` for everything domain-specific.
 */

import type { RawEntryValue, Rule } from '../../types';

/** Signed points, always to one decimal: "+3.6", "−1.0", "0.0". */
export function formatPoints(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${Math.abs(n).toFixed(1)}`;
}

/** Unsigned points for places where the sign would be noise. */
export function formatPointsPlain(n: number): string {
  return n.toFixed(1);
}

function withUnit(value: string, unit: string): string {
  const u = unit.trim();
  if (!u) return value;
  // Single-character units read better closed up: "7.5h", not "7.5 h".
  return u.length === 1 ? `${value}${u}` : `${value} ${u}`;
}

function formatNumber(value: number, decimals: number): string {
  return decimals === 0
    ? Math.round(value).toLocaleString('en-US')
    : value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * How a logged value reads on a card. Returns null when nothing is logged —
 * callers show the rule's formula in that slot instead, so the row never
 * renders an empty gap.
 */
export function formatRuleValue(rule: Rule, value: RawEntryValue | undefined | null): string | null {
  if (value === undefined || value === null) return null;

  switch (rule.kind) {
    case 'binary':
      return value === 'yes' ? 'Yes' : value === 'free' ? 'Free pass' : 'No';
    case 'penalty':
      return value === 'clean' ? 'Clean' : value === 'free' ? 'Free pass' : 'Slipped';
    case 'counter':
      return typeof value === 'number' ? withUnit(formatNumber(value, rule.decimals), rule.unit) : null;
    case 'range':
      return typeof value === 'number' ? withUnit(formatNumber(value, rule.decimals), rule.unit) : null;
    case 'tracker':
      return typeof value === 'number' ? withUnit(formatNumber(value, rule.decimals), rule.unit) : null;
    case 'streak':
      return null; // derived — never has a stored value
  }
}

/** True when this rule's value for a day has been filled in. */
export function isLogged(value: RawEntryValue | undefined | null): boolean {
  return value !== undefined && value !== null;
}
