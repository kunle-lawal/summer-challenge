/**
 * Turning audit rows into something readable.
 *
 * The stored `before` / `after` are untyped JSON whose shape varies per action,
 * so everything here narrows defensively and falls back to something sensible
 * rather than throwing on a row written by an older version of the app.
 */

import type { AuditLogEntry, Member, Rule } from '../types';
import { formatRuleValue } from './rules/display';

export const AUDIT_FILTERS = ['All', 'Entries', 'Members', 'Config', 'Owner'] as const;
export type AuditFilter = (typeof AUDIT_FILTERS)[number];

export function auditCategory(action: string): Exclude<AuditFilter, 'All'> {
  if (action.startsWith('member.')) return 'Members';
  if (action.startsWith('entry.')) return 'Entries';
  if (action.startsWith('owner.')) return 'Owner';
  return 'Config';
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;

export function auditTitle(a: AuditLogEntry, memberById: Record<string, Member>): string {
  const after = asRecord(a.after);
  const before = asRecord(a.before);
  const nameOf = (id: unknown) => memberById[String(id)]?.name ?? 'Someone';

  switch (a.action) {
    case 'challenge.create': return 'Challenge created';
    case 'challenge.rename': {
      const from = String(before?.name ?? '');
      const to = String(after?.name ?? '');
      return from && to ? `Renamed to “${to}”` : 'Challenge renamed';
    }
    case 'challenge.config_change': return 'Rules and dates updated';
    case 'challenge.status_change': {
      const status = typeof a.after === 'string' ? a.after : String(after?.status ?? '');
      return status === 'ended' ? 'Challenge ended' : 'Challenge reopened';
    }
    case 'member.add': return `${String(after?.name ?? 'Someone')} added`;
    case 'member.remove': return `${String(before?.name ?? 'Someone')} removed`;
    case 'member.restore': return `${String(before?.name ?? 'Someone')} put back`;
    case 'member.rename': {
      const from = typeof a.before === 'string' ? a.before : String(before?.name ?? '');
      const to = typeof a.after === 'string' ? a.after : String(after?.name ?? '');
      return from && to ? `${from} renamed to ${to}` : 'Member renamed';
    }
    case 'member.tracker_config': return `${nameOf(a.target.id)} set a personal goal`;
    case 'entry.create': return `${nameOf(after?.memberId)} logged ${String(after?.date ?? 'a day')}`;
    case 'entry.update': return `${a.actorMemberId ? nameOf(a.actorMemberId) : 'Someone'} changed a log`;
    case 'entry.delete': return `${nameOf(asRecord(a.before)?.memberId)}’s log was deleted`;
    case 'owner.login': return 'Settings unlocked';
    case 'owner.login_failed': return 'Failed unlock attempt';
    default: return a.action;
  }
}

export function formatAuditTime(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function auditDateKey(ts: { seconds: number } | null | undefined): string {
  if (!ts) return 'Unknown';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export interface AuditChange {
  label: string;
  from?: string;
  to?: string;
}

const readable = (v: unknown, rule?: Rule): string => {
  if (v === undefined || v === null) return '—';
  if (rule) {
    const formatted = formatRuleValue(rule, v as never);
    if (formatted) return formatted;
  }
  if (typeof v === 'number') return String(v);
  return String(v);
};

/**
 * The rows shown when an audit entry is expanded.
 *
 * For entry changes this is the useful one: which rules moved, and from what to
 * what. Rules that didn't change are left out entirely, so the list never pads
 * itself with unchanged values.
 */
export function auditChanges(a: AuditLogEntry, ruleById: Record<string, Rule>): AuditChange[] {
  const before = asRecord(a.before);
  const after = asRecord(a.after);

  if (a.action === 'entry.create' || a.action === 'entry.update' || a.action === 'entry.delete') {
    const beforeValues = asRecord(before?.values) ?? {};
    const afterValues = asRecord(after?.values) ?? {};
    const ids = [...new Set([...Object.keys(beforeValues), ...Object.keys(afterValues)])];

    const rows = ids
      .filter(id => JSON.stringify(beforeValues[id]) !== JSON.stringify(afterValues[id]))
      .map(id => {
        const rule = ruleById[id];
        return {
          label: rule?.name ?? id,
          from: readable(beforeValues[id], rule),
          to: readable(afterValues[id], rule),
        };
      });

    const beforePts = before?.pts;
    const afterPts = after?.pts;
    if (typeof beforePts === 'number' || typeof afterPts === 'number') {
      if (beforePts !== afterPts) {
        rows.push({
          label: 'Day total',
          from: typeof beforePts === 'number' ? beforePts.toFixed(1) : '—',
          to: typeof afterPts === 'number' ? afterPts.toFixed(1) : '—',
        });
      }
    }
    return rows;
  }

  if (a.action === 'challenge.config_change') {
    const beforeRules = Array.isArray(before?.rules) ? (before.rules as Rule[]) : [];
    const afterRules = Array.isArray(after?.rules) ? (after.rules as Rule[]) : [];
    const beforeById = new Map(beforeRules.map(r => [r.id, r]));
    const afterById = new Map(afterRules.map(r => [r.id, r]));

    const rows: AuditChange[] = [];
    const added = afterRules.filter(r => !beforeById.has(r.id)).map(r => r.name);
    const removed = beforeRules.filter(r => !afterById.has(r.id)).map(r => r.name);
    const changed = afterRules
      .filter(r => beforeById.has(r.id) && JSON.stringify(beforeById.get(r.id)) !== JSON.stringify(r))
      .map(r => r.name);

    if (added.length) rows.push({ label: 'Rules added', to: added.join(', ') });
    if (removed.length) rows.push({ label: 'Rules removed', to: removed.join(', ') });
    if (changed.length) rows.push({ label: 'Rules changed', to: changed.join(', ') });

    for (const key of ['startDate', 'endDate', 'timezone', 'weekAnchor'] as const) {
      if (before?.[key] !== after?.[key]) {
        rows.push({ label: key, from: readable(before?.[key]), to: readable(after?.[key]) });
      }
    }
    return rows;
  }

  if (a.action === 'challenge.rename') {
    return [{ label: 'Name', from: readable(before?.name), to: readable(after?.name) }];
  }

  if (a.action === 'member.rename') {
    const from = typeof a.before === 'string' ? a.before : readable(before?.name);
    const to = typeof a.after === 'string' ? a.after : readable(after?.name);
    return [{ label: 'Name', from, to }];
  }

  return [];
}
