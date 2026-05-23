import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { SearchIcon } from '@/components/ui/Icons';
import type { AuditLogEntry, Rule, RawEntryValue } from '@/types';

// ── Styled components ─────────────────────────────────────────────────────────

const SHeader = styled.header`
  padding: 14px 16px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
`;

const Eyebrow = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 30px;
  line-height: 0.96;
  font-weight: 400;
  margin-top: 2px;
  em { font-style: italic; }
`;

const Sub = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
  margin-top: 2px;
`;

const HeaderRight = styled.div`
  margin-left: auto;
`;

const IconBtn = styled.button`
  width: 36px; height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.color.ink};
  svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 1.6; fill: none; }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const Body = styled.div`
  padding: 0 16px 24px;
`;

const ChipsRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin: 0 -16px;
  padding: 14px 16px 0;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Chip = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  border: 1px solid ${({ theme, $active }) => $active ? theme.color.ink : theme.color.hair2};
  background: ${({ theme, $active }) => $active ? theme.color.ink : theme.color.surface};
  color: ${({ theme, $active }) => $active ? theme.color.surface : theme.color.ink2};
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radii.pill};
  font: 500 13px/1 ${({ theme }) => theme.font.body};
  cursor: pointer;
  white-space: nowrap;
`;

const Groups = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Group = styled.div`
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface};
`;

const GroupHd = styled.div`
  padding: 10px 14px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  background: ${({ theme }) => theme.color.surface2};
`;

const GroupHdLabel = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  font-weight: 500;
`;

const HistRow = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  &:last-child { border-bottom: 0; }
`;

const BodyLine = styled.div`
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.ink};
  line-height: 1.35;
  b { font-weight: 600; }
`;

const MetaLine = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
  margin-top: 3px;
  text-transform: uppercase;
`;

const Delta = styled.div<{ $sign: 'pos' | 'neg' | 'zero' }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 18px;
  color: ${({ theme, $sign }) =>
    $sign === 'pos' ? theme.color.good :
    $sign === 'neg' ? theme.color.bad :
    theme.color.ink3};
  font-variant-numeric: tabular-nums;
`;

const TagPill = styled.span<{ $variant?: 'outline' | 'accent' }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-left: 5px;
  border: 1px solid ${({ theme, $variant }) =>
    $variant === 'accent' ? theme.color.accent + '60' : theme.color.hair2};
  background: ${({ theme, $variant }) =>
    $variant === 'accent' ? theme.color.accentTint : 'transparent'};
  color: ${({ theme, $variant }) =>
    $variant === 'accent' ? theme.color.accent : theme.color.ink3};
`;

const DiffLine = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 2px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
`;

const FootNote = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  padding: 8px 4px;
  line-height: 1.5;
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 24px;
  color: ${({ theme }) => theme.color.ink3};
  font-size: 13.5px;
`;

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'entries' | 'admin';

interface HistoryItem {
  id: string;
  date: string;
  dateKey: string;
  who: string;
  memberId: string | null;
  summary: string;
  /** Changed values line, e.g. "Steps: 7000 → 8500 · Gym: no → yes" */
  diff: string | null;
  delta: number | null;
  time: string;
  isAdmin: boolean;
  isMilestone: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(ts: { seconds: number; nanoseconds: number } | null | undefined): { date: string; time: string; dateKey: string } {
  if (!ts) return { date: 'Unknown', time: '', dateKey: '' };
  const d = new Date(ts.seconds * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dateKey = d.toISOString().slice(0, 10);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const dateLabel = dateKey === todayKey
    ? `Today · ${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`
    : `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hDisplay = h % 12 || 12;
  return { date: dateLabel, time: `${hDisplay}:${m} ${ampm}`, dateKey };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function describeAuditAction(a: AuditLogEntry): string {
  const after = a.after as Record<string, unknown> | null;
  const before = a.before as Record<string, unknown> | null;
  switch (a.action) {
    case 'challenge.create': return 'Challenge created';
    case 'challenge.config_change': return 'Settings updated';
    case 'challenge.status_change': return `Status → ${String(after?.status ?? '')}`;
    case 'member.add': return `Member added: ${String(after?.name ?? '')}`;
    case 'member.remove': return `Member removed: ${String(before?.name ?? '')}`;
    case 'member.rename': return `Member renamed → ${String(after?.name ?? '')}`;
    case 'entry.create': return `Logged for ${String(after?.date ?? '')}`;
    case 'entry.update': return `Updated entry for ${String(after?.date ?? (before?.date ?? ''))}`;
    case 'entry.delete': return `Deleted entry for ${String(before?.date ?? '')}`;
    case 'owner.login': return 'Admin unlocked';
    case 'owner.login_failed': return 'Admin login attempt failed';
    default: return a.action;
  }
}

function formatValue(v: RawEntryValue | undefined): string {
  if (v === undefined) return '—';
  if (typeof v === 'number') return String(v);
  const labels: Record<string, string> = {
    yes: '✓ yes', no: '✗ no', free: 'free pass',
    clean: '✓ clean', infraction: '✗ slip',
  };
  return labels[v] ?? String(v);
}

/**
 * Build a diff string for entry.create / entry.update / entry.delete.
 * For updates, only shows rules that actually changed.
 */
function buildEntryDiff(
  action: string,
  beforeRaw: unknown,
  afterRaw: unknown,
  ruleById: Record<string, Rule>,
): string | null {
  type ValMap = Record<string, RawEntryValue>;

  if (action === 'entry.create') {
    const vals = (afterRaw as Record<string, unknown>)?.values as ValMap | undefined;
    if (!vals) return null;
    return Object.entries(vals)
      .map(([rId, v]) => {
        const name = ruleById[rId]?.name ?? rId;
        return `${name}: ${formatValue(v)}`;
      })
      .join(' · ') || null;
  }

  if (action === 'entry.update') {
    const before = (beforeRaw as Record<string, unknown>)?.values as ValMap | undefined;
    const after  = (afterRaw  as Record<string, unknown>)?.values as ValMap | undefined;
    if (!before && !after) return null;
    const allKeys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
    const changes: string[] = [];
    for (const rId of allKeys) {
      const oldVal = before?.[rId];
      const newVal = after?.[rId];
      if (oldVal === newVal) continue;
      const name = ruleById[rId]?.name ?? rId;
      if (oldVal === undefined) {
        changes.push(`${name}: ${formatValue(newVal)}`);
      } else if (newVal === undefined) {
        changes.push(`${name}: ${formatValue(oldVal)} → removed`);
      } else {
        changes.push(`${name}: ${formatValue(oldVal)} → ${formatValue(newVal)}`);
      }
    }
    return changes.join(' · ') || null;
  }

  if (action === 'entry.delete') {
    const vals = (beforeRaw as Record<string, unknown>)?.values as ValMap | undefined;
    if (!vals) return null;
    return Object.entries(vals)
      .map(([rId, v]) => {
        const name = ruleById[rId]?.name ?? rId;
        return `${name}: ${formatValue(v)}`;
      })
      .join(' · ') || null;
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { challenge, members, auditLog } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const [filter, setFilter] = useState<FilterMode>('all');

  if (!challenge) return null;

  const memberById = useMemo(
    () => Object.fromEntries(members.map(m => [m.id, m])),
    [members],
  );

  const ruleById = useMemo(
    () => Object.fromEntries((challenge.config?.rules ?? []).map((r: Rule) => [r.id, r])),
    [challenge.config?.rules],
  );

  const allItems: HistoryItem[] = useMemo(() => {
    const items = auditLog.map((a: AuditLogEntry) => {
      const ts = a.timestamp as unknown as { seconds: number; nanoseconds: number } | null;
      const { date, time, dateKey } = formatTs(ts);
      const actor = a.actorMemberId ? (memberById[a.actorMemberId]?.name ?? 'Unknown') : 'Owner';
      const isEntry = a.action.startsWith('entry.');
      const summary = describeAuditAction(a);
      const diff = isEntry ? buildEntryDiff(a.action, a.before, a.after, ruleById) : null;
      return {
        id: a.id,
        date,
        dateKey,
        who: actor,
        memberId: a.actorMemberId,
        summary,
        diff,
        delta: null,
        time,
        isAdmin: !isEntry,
        isMilestone: a.action === 'challenge.create' || a.action === 'challenge.status_change',
      };
    });
    items.sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.time.localeCompare(a.time));
    return items;
  }, [auditLog, memberById, ruleById]);

  const filtered = useMemo(() => {
    if (filter === 'entries') return allItems.filter(i => !i.isAdmin);
    if (filter === 'admin') return allItems.filter(i => i.isAdmin);
    return allItems;
  }, [allItems, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, { dateLabel: string; items: HistoryItem[] }>();
    for (const item of filtered) {
      if (!map.has(item.dateKey)) {
        map.set(item.dateKey, { dateLabel: item.date, items: [] });
      }
      map.get(item.dateKey)!.items.push(item);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalCount = allItems.length;

  return (
    <>
      <SHeader>
        <HeaderRow>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>{challenge.name}</Eyebrow>
            <Title>Hist<em>ory</em></Title>
            <Sub>{totalCount} events · newest first</Sub>
          </div>
          <HeaderRight>
            <IconBtn aria-label="Search">
              <SearchIcon />
            </IconBtn>
          </HeaderRight>
        </HeaderRow>
      </SHeader>

      <Body>
        <ChipsRow role="tablist">
          {(['all', 'entries', 'admin'] as FilterMode[]).map(f => (
            <Chip key={f} $active={filter === f} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}>
              {f === 'all' ? 'All' : f === 'entries' ? 'Entries' : 'Admin'}
            </Chip>
          ))}
        </ChipsRow>

        <Groups>
          {grouped.length === 0 ? (
            <EmptyState>No events yet. Start logging!</EmptyState>
          ) : grouped.map(([dateKey, { dateLabel, items }]) => (
            <Group key={dateKey}>
              <GroupHd>
                <GroupHdLabel>{dateLabel}</GroupHdLabel>
              </GroupHd>
              {items.map(item => {
                const member = item.memberId ? memberById[item.memberId] : null;
                return (
                  <HistRow key={item.id}>
                    {member ? (
                      <MemberBadge member={member} size="sm" isYou={item.memberId === selectedMemberId} />
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--bg-2)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--f-mono)', fontSize: '9.5px', fontWeight: 600,
                      }}>
                        {item.who.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <BodyLine>
                        <b>{item.who}</b>
                        {item.isAdmin && <TagPill>admin</TagPill>}
                        {item.memberId === selectedMemberId && <TagPill $variant="accent">you</TagPill>}
                        {' '}{item.summary}
                      </BodyLine>
                      {item.diff && <DiffLine>{item.diff}</DiffLine>}
                      <MetaLine>{item.time}</MetaLine>
                    </div>
                    <Delta $sign={item.delta === null ? 'zero' : item.delta > 0 ? 'pos' : item.delta < 0 ? 'neg' : 'zero'}>
                      {item.delta === null ? '—' : item.delta > 0 ? `+${item.delta.toFixed(1)}` : item.delta === 0 ? '—' : item.delta.toFixed(1)}
                    </Delta>
                  </HistRow>
                );
              })}
            </Group>
          ))}
        </Groups>

        <FootNote>
          Full event log — admin actions, edits, and member changes are included. Removed members still appear in old rows.
        </FootNote>
      </Body>

      {/* suppress unused warning */}
      <span style={{ display: 'none' }}>{slug}</span>
    </>
  );
}
