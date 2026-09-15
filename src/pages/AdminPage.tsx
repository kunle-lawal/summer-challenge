import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { useAdminMode } from '@/context/AdminModeContext';
import { isRuleActive, type Member, type Rule } from '@/types';
import { changeChallengeStatus, deleteChallenge, renameChallenge, updateChallengeConfig } from '@/lib/challenges';
import { addMember, removeMember, renameMember, restoreMember } from '@/lib/members';
import { diffDays, getWeekNumber, todayInTz } from '@/lib/dates';
import { formatRuleFormula } from '@/lib/rules/ruleDocs';
import {
  AUDIT_FILTERS, auditCategory, auditChanges, auditDateKey, auditTitle, formatAuditTime,
  type AuditFilter,
} from '@/lib/auditDisplay';
import { Body, Hero, HeroProgress, Sheet, Stat, Stats, TopBar } from '@/components/layout/Screen';
import { Dialog, EmptyState, Toast } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { RuleTile } from '@/components/ui/Tile';
import { RuleEditor } from '@/components/admin/RuleEditor';
import {
  AddRow, Button, Card, ErrorText, Field, Hint, IconButton, Input, Label, LinkButton,
  List, Meta, Name, Row, Segmented, Sep, Switch, tnum,
} from '@/components/ui/primitives';

type View = 'settings' | 'audit';

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

const Gate = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  padding: 24px 20px 40px;

  > .lock {
    width: 44px;
    height: 44px;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.color.hair};
    background: ${({ theme }) => theme.color.surface};
    display: grid;
    place-items: center;
    color: ${({ theme }) => theme.color.ink2};
    svg { width: 20px; height: 20px; }
  }

  p {
    font-size: 14px;
    line-height: 21px;
    color: ${({ theme }) => theme.color.ink2};
    font-weight: 500;
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Danger = styled.div`
  border: 1px solid ${({ theme }) => theme.color.badLine};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 16px;
  background: ${({ theme }) => theme.color.badSoft};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AuditGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ChangeList = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 19px;

  dt { color: ${({ theme }) => theme.color.ink3}; font-weight: 600; }
  dd { color: ${({ theme }) => theme.color.ink}; ${tnum} }
`;

// ---------------------------------------------------------------------------
// Password gate
// ---------------------------------------------------------------------------

function AdminGate({ onBack }: { onBack: () => void }) {
  const { enterAdminMode, entering, lastError } = useAdminMode();
  const { selectedMemberId } = useSelectedMember();
  const [password, setPassword] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const submit = () => {
    if (password.trim().length === 0) return;
    setDismissed(false);
    void enterAdminMode(password, selectedMemberId);
  };

  const error = !dismissed && lastError !== null;

  return (
    <Body>
      <TopBar
        title="Settings"
        sub="Owner only"
        left={
          <IconButton type="button" aria-label="Back" onClick={onBack}>
            <Icon name="back" />
          </IconButton>
        }
      />
      <Gate>
        <span className="lock">
          <Icon name="lock" />
        </span>
        <div>
          <h1>Enter the owner password</h1>
          <p>
            Rules, dates and members can be changed while the challenge is running — but only by
            whoever set it up. Every change is written to history.
          </p>
        </div>
        <Field>
          <label htmlFor="owner-pw">Owner password</label>
          <Input
            id="owner-pw"
            $text
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setDismissed(true);
            }}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          {error && (
            <ErrorText role="alert">
              {lastError === 'challenge_not_loaded'
                ? 'The challenge is still loading. Give it a second and try again.'
                : 'That password doesn’t match. There’s no way to reset it — ask whoever created the challenge.'}
            </ErrorText>
          )}
        </Field>
        <Button type="button" $block disabled={password.trim().length === 0 || entering} onClick={submit}>
          {entering ? 'Checking…' : 'Unlock settings'}
        </Button>
      </Gate>
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

function AuditView({ onBack }: { onBack: () => void }) {
  const { challenge, members, auditLog } = useChallenge();
  const [filter, setFilter] = useState<AuditFilter>('All');
  const [open, setOpen] = useState<string | null>(null);

  const memberById = useMemo(
    () => Object.fromEntries(members.map(m => [m.id, m])) as Record<string, Member>,
    [members],
  );
  const ruleById = useMemo(
    () => Object.fromEntries((challenge?.config.rules ?? []).map(r => [r.id, r])) as Record<string, Rule>,
    [challenge],
  );

  const groups = useMemo(() => {
    const rows = auditLog.filter(a => filter === 'All' || auditCategory(a.action) === filter);
    const byDate = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = auditDateKey(row.timestamp);
      byDate.set(key, [...(byDate.get(key) ?? []), row]);
    }
    return [...byDate.entries()];
  }, [auditLog, filter]);

  return (
    <Body>
      <TopBar
        center
        title="History log"
        sub={`${auditLog.length} recorded ${auditLog.length === 1 ? 'change' : 'changes'}`}
        left={
          <IconButton type="button" aria-label="Back to settings" onClick={onBack}>
            <Icon name="back" />
          </IconButton>
        }
      />
      <Sheet>
        <Segmented role="group" aria-label="Filter the log">
          {AUDIT_FILTERS.map(f => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </Segmented>

        {groups.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            body={
              filter === 'All'
                ? 'Every change to this challenge gets recorded here as it happens.'
                : `No ${filter.toLowerCase()} changes have been recorded yet.`
            }
          />
        ) : (
          groups.map(([date, rows]) => (
            <AuditGroup key={date}>
              <Label>{date}</Label>
              <List>
                {rows.map(row => {
                  const changes = auditChanges(row, ruleById);
                  const isOpen = open === row.id;
                  return (
                    <Card key={row.id} $tint={false}>
                      <Row
                        as={changes.length > 0 ? 'button' : 'div'}
                        type={changes.length > 0 ? 'button' : undefined}
                        $bare
                        style={{ padding: 0, minHeight: 0 }}
                        {...(changes.length > 0
                          ? { 'aria-expanded': isOpen, onClick: () => setOpen(isOpen ? null : row.id) }
                          : {})}
                      >
                        <Name>
                          <b>{auditTitle(row, memberById)}</b>
                          <Meta>
                            {[
                              formatAuditTime(row.timestamp),
                              row.actorIsOwner ? 'by the owner' : row.actorMemberId ? `by ${memberById[row.actorMemberId]?.name ?? 'someone'}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Meta>
                        </Name>
                        {changes.length > 0 && <Icon name={isOpen ? 'up' : 'down'} />}
                      </Row>
                      {isOpen && changes.length > 0 && (
                        <ChangeList>
                          {changes.map((c, i) => (
                            <div key={i} style={{ display: 'contents' }}>
                              <dt>{c.label}</dt>
                              <dd>{c.from !== undefined ? `${c.from} → ${c.to}` : c.to}</dd>
                            </div>
                          ))}
                        </ChangeList>
                      )}
                    </Card>
                  );
                })}
              </List>
            </AuditGroup>
          ))
        )}
      </Sheet>
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function AdminPage() {
  const { challenge, members, entries, activeMembers } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const { isAdmin, exitAdminMode } = useAdminMode();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('settings');
  const [name, setName] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingRule, setEditingRule] = useState<Rule | 'new' | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [renamingMember, setRenamingMember] = useState<Member | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirm, setConfirm] = useState<null | { kind: 'remove'; member: Member } | { kind: 'end' } | { kind: 'delete' }>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const actor = { memberId: selectedMemberId, isOwner: true };

  const stats = useMemo(() => {
    if (!challenge) return null;
    const { timezone, weekAnchor, startDate, endDate: end } = challenge.config;
    const today = todayInTz(timezone);
    const span = end ? diffDays(end, startDate) + 1 : null;
    const elapsed = diffDays(today, startDate);
    return {
      weekNumber: Math.max(1, getWeekNumber(today, weekAnchor)),
      totalWeeks: span ? Math.ceil(span / 7) : null,
      daysLeft: end ? Math.max(0, diffDays(end, today)) : null,
      pct: span && span > 0 ? Math.max(0, Math.min(100, ((elapsed + 1) / span) * 100)) : null,
    };
  }, [challenge]);

  if (!challenge) return null;

  const back = () => navigate(`/c/${challenge.slug}`);

  if (!isAdmin) return <AdminGate onBack={back} />;
  if (view === 'audit') return <AuditView onBack={() => setView('settings')} />;

  const rules = [...challenge.config.rules].sort((a, b) => a.order - b.order);
  const liveName = name || challenge.name;
  const liveEnd = endDate || challenge.config.endDate || '';
  const dirty =
    liveName.trim() !== challenge.name ||
    liveEnd !== (challenge.config.endDate ?? '');

  const persistRules = async (next: Rule[], message: string) => {
    setBusy(true);
    setError(null);
    const result = await updateChallengeConfig(challenge.id, { ...challenge.config, rules: next }, actor);
    setBusy(false);
    if (!result.ok) {
      setError('Couldn’t save that. Check your connection and try again.');
      return;
    }
    setToast({ msg: message });
  };

  const saveBasics = async () => {
    setBusy(true);
    setError(null);

    if (liveName.trim() !== challenge.name) {
      const renamed = await renameChallenge(challenge.id, liveName, actor);
      if (!renamed.ok) {
        setBusy(false);
        setError(renamed.reason === 'empty_name' ? 'The challenge needs a name.' : 'Couldn’t rename it.');
        return;
      }
    }

    if (liveEnd !== (challenge.config.endDate ?? '')) {
      const updated = await updateChallengeConfig(
        challenge.id,
        { ...challenge.config, endDate: liveEnd || null },
        actor,
      );
      if (!updated.ok) {
        setBusy(false);
        setError('Couldn’t save the end date.');
        return;
      }
    }

    setBusy(false);
    setName('');
    setEndDate('');
    setToast({ msg: 'Changes saved' });
  };

  const doAddMember = async () => {
    const trimmed = newMemberName.trim();
    if (trimmed.length < 2) return;
    setBusy(true);
    const result = await addMember(challenge.id, trimmed, actor);
    setBusy(false);
    if (!result.ok) {
      setError(`Someone's already called ${trimmed}. Try “${result.suggested}”.`);
      return;
    }
    setAddingMember(false);
    setNewMemberName('');
    setToast({ msg: `${trimmed} added` });
  };

  const doRename = async () => {
    if (!renamingMember) return;
    const trimmed = renameValue.trim();
    if (trimmed.length < 2) return;
    setBusy(true);
    const result = await renameMember(challenge.id, renamingMember.id, trimmed, actor);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.reason === 'name_taken'
          ? `That name's taken. Try “${result.suggested}”.`
          : 'Couldn’t rename them.',
      );
      return;
    }
    setRenamingMember(null);
    setToast({ msg: `Renamed to ${trimmed}` });
  };

  const doRemove = async (member: Member) => {
    setBusy(true);
    const result = await removeMember(challenge.id, member.id, actor);
    setBusy(false);
    setConfirm(null);
    if (!result.ok) {
      setError('Couldn’t remove them.');
      return;
    }
    setToast({
      msg: `${member.name} removed`,
      undo: async () => {
        setToast(null);
        const back2 = await restoreMember(challenge.id, member.id, actor);
        setToast({
          msg: back2.ok
            ? `${member.name} is back`
            : back2.reason === 'name_taken'
              ? `Someone took that name. Re-add them as “${back2.suggested}”.`
              : 'Couldn’t undo that.',
        });
      },
    });
  };

  const toggleStatus = async () => {
    setBusy(true);
    const next = challenge.status === 'ended' ? 'active' : 'ended';
    const result = await changeChallengeStatus(challenge.id, next, actor);
    setBusy(false);
    setConfirm(null);
    setToast({ msg: result.ok ? (next === 'ended' ? 'Challenge ended' : 'Challenge reopened') : 'Couldn’t change that.' });
  };

  const doDelete = async () => {
    setBusy(true);
    const result = await deleteChallenge(challenge.id, challenge.slug);
    setBusy(false);
    if (!result.ok) {
      setError('Couldn’t delete the challenge.');
      return;
    }
    navigate('/new', { replace: true });
  };

  return (
    <>
      <Body>
        <Hero>
          <TopBar
            title="Settings"
            sub={challenge.name}
            left={
              <IconButton type="button" $onPanel aria-label="Back" onClick={back}>
                <Icon name="back" />
              </IconButton>
            }
            right={
              <IconButton type="button" $onPanel aria-label="Lock settings" onClick={exitAdminMode}>
                <Icon name="lock" />
              </IconButton>
            }
          />
          {stats?.pct !== null && stats?.pct !== undefined && stats.daysLeft !== null && (
            <HeroProgress
              label={stats.totalWeeks ? `Week ${stats.weekNumber} of ${stats.totalWeeks}` : `Week ${stats.weekNumber}`}
              value={`${Math.round(stats.pct)}% · ${stats.daysLeft}d left`}
              pct={stats.pct}
            />
          )}
          <Stats>
            <Stat value={activeMembers.length} caption="Members" />
            <Stat value={entries.length} caption="Entries" />
            <Stat value={rules.filter(isRuleActive).length} caption="Rules" hot />
          </Stats>
        </Hero>

        <Sheet>
          {error && <ErrorText role="alert">{error}</ErrorText>}

          <Section>
            <h2>Basics</h2>
            <Field>
              <label htmlFor="ch-name">Challenge name</label>
              <Input id="ch-name" $text value={liveName} onChange={e => setName(e.target.value)} />
            </Field>
            <Field>
              <label htmlFor="ch-end">End date</label>
              <Input id="ch-end" $text type="date" value={liveEnd} onChange={e => setEndDate(e.target.value)} />
              <Hint>
                Started {challenge.config.startDate}. Shortening the run keeps every point already
                logged. Leave it empty to run open-ended.
              </Hint>
            </Field>
            <Button type="button" $tone="ghost" $block disabled={!dirty || busy} onClick={saveBasics}>
              {busy ? 'Saving…' : dirty ? 'Save basics' : 'Saved'}
            </Button>
          </Section>

          <Section>
            <h2>Rules</h2>
            <List>
              {rules.map(rule => {
                const on = isRuleActive(rule);
                return (
                  <Row key={rule.id} $off={!on} style={{ paddingRight: 6 }}>
                    <RuleTile rule={rule} />
                    <Name
                      as="button"
                      type="button"
                      onClick={() => setEditingRule(rule)}
                      style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                    >
                      <b>{rule.name}</b>
                      <Meta>{formatRuleFormula(rule)}</Meta>
                    </Name>
                    <Switch
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${rule.name} in play`}
                      onClick={() =>
                        persistRules(
                          rules.map(r => (r.id === rule.id ? { ...r, active: !on } : r)),
                          on ? `${rule.name} retired` : `${rule.name} back in play`,
                        )
                      }
                    />
                    <IconButton type="button" aria-label={`Edit ${rule.name}`} onClick={() => setEditingRule(rule)}>
                      <Icon name="edit" />
                    </IconButton>
                  </Row>
                );
              })}
            </List>
            <AddRow type="button" onClick={() => setEditingRule('new')}>
              <Icon name="plus" />
              Add a rule
            </AddRow>
            <Hint>
              Retiring a rule takes it off the log from now on. Points already earned from it stay
              exactly where they are — editing a rule, on the other hand, re-scores its whole
              history.
            </Hint>
          </Section>

          <Section>
            <h2>Members</h2>
            <List>
              {members.map(m => (
                <Row key={m.id} $off={!m.active} style={{ paddingRight: 6 }}>
                  <MemberBadge member={m} />
                  <Name>
                    <b>{m.name}</b>
                    <Meta>
                      {m.active
                        ? `${entries.filter(e => e.memberId === m.id).length} days logged`
                        : 'Removed'}
                    </Meta>
                  </Name>
                  {m.active ? (
                    <>
                      <IconButton
                        type="button"
                        aria-label={`Rename ${m.name}`}
                        onClick={() => {
                          setRenamingMember(m);
                          setRenameValue(m.name);
                        }}
                      >
                        <Icon name="edit" />
                      </IconButton>
                      <IconButton
                        type="button"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => setConfirm({ kind: 'remove', member: m })}
                      >
                        <Icon name="trash" />
                      </IconButton>
                    </>
                  ) : (
                    <LinkButton type="button" onClick={() => restoreMember(challenge.id, m.id, actor)}>
                      Put back
                    </LinkButton>
                  )}
                </Row>
              ))}
            </List>
            <AddRow type="button" onClick={() => setAddingMember(true)}>
              <Icon name="plus" />
              Add a member
            </AddRow>
            <Hint>New members start at zero and can log from the day they join.</Hint>
          </Section>

          <Section>
            <h2>History log</h2>
            <Row as="button" type="button" onClick={() => setView('audit')}>
              <Name>
                <b>Every change, recorded</b>
                <Meta>Rules, members, logs and unlock attempts</Meta>
              </Name>
              <Icon name="next" />
            </Row>
          </Section>

          <Section>
            <h2>{challenge.status === 'ended' ? 'Reopen' : 'End the challenge'}</h2>
            <Danger>
              <Meta>
                {challenge.status === 'ended'
                  ? 'Reopening lets everyone log and edit again. Points pick up where they left off.'
                  : 'Ending freezes the leaderboard and locks every log. Nobody loses their history, and you can reopen it later.'}
              </Meta>
              <Button
                type="button"
                $tone={challenge.status === 'ended' ? 'ghost' : 'danger'}
                $sm
                onClick={() => (challenge.status === 'ended' ? toggleStatus() : setConfirm({ kind: 'end' }))}
              >
                <Icon name={challenge.status === 'ended' ? 'undo' : 'lock'} />
                {challenge.status === 'ended' ? 'Reopen challenge' : 'End challenge now'}
              </Button>
              <Sep />
              <Meta>
                Deleting wipes the challenge, every member and every logged day, for everyone. It
                cannot be undone.
              </Meta>
              <Button type="button" $tone="danger" $sm onClick={() => setConfirm({ kind: 'delete' })}>
                <Icon name="trash" />
                Delete challenge
              </Button>
            </Danger>
          </Section>

          <Button type="button" $tone="ghost" $block onClick={() => navigate('/new')}>
            <Icon name="plus" />
            Start a new challenge
          </Button>
        </Sheet>
      </Body>

      {editingRule && (
        <RuleEditor
          rule={editingRule === 'new' ? null : editingRule}
          allRules={rules}
          live={challenge.status === 'active'}
          onClose={() => setEditingRule(null)}
          onSave={saved => {
            const next =
              editingRule === 'new'
                ? [...rules, saved]
                : rules.map(r => (r.id === saved.id ? saved : r));
            setEditingRule(null);
            void persistRules(next, editingRule === 'new' ? 'Rule added' : 'Rule saved');
          }}
          {...(editingRule !== 'new'
            ? {
                onDelete: () => {
                  const target = editingRule;
                  setEditingRule(null);
                  void persistRules(rules.filter(r => r.id !== target.id), `${target.name} deleted`);
                },
              }
            : {})}
        />
      )}

      {addingMember && (
        <Dialog
          title="Add a member"
          onClose={() => {
            setAddingMember(false);
            setNewMemberName('');
          }}
          actions={
            <>
              <Button
                type="button"
                $tone="ghost"
                onClick={() => {
                  setAddingMember(false);
                  setNewMemberName('');
                }}
              >
                Cancel
              </Button>
              <Button type="button" disabled={newMemberName.trim().length < 2 || busy} onClick={doAddMember}>
                Add them
              </Button>
            </>
          }
        >
          <p>They start at zero points and can log from today. Share the challenge link so they can pick their name.</p>
          <Field>
            <label htmlFor="new-member">Name</label>
            <Input
              id="new-member"
              $text
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doAddMember()}
            />
          </Field>
        </Dialog>
      )}

      {renamingMember && (
        <Dialog
          title={`Rename ${renamingMember.name}`}
          onClose={() => setRenamingMember(null)}
          actions={
            <>
              <Button type="button" $tone="ghost" onClick={() => setRenamingMember(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={renameValue.trim().length < 2 || busy} onClick={doRename}>
                Rename
              </Button>
            </>
          }
        >
          <p>Everything they’ve logged stays with them.</p>
          <Field>
            <label htmlFor="rename-member">Name</label>
            <Input
              id="rename-member"
              $text
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doRename()}
            />
          </Field>
        </Dialog>
      )}

      {confirm?.kind === 'remove' && (
        <Dialog
          title={`Remove ${confirm.member.name}?`}
          onClose={() => setConfirm(null)}
          actions={
            <>
              <Button type="button" $tone="ghost" onClick={() => setConfirm(null)}>
                Keep them
              </Button>
              <Button type="button" $tone="danger" disabled={busy} onClick={() => doRemove(confirm.member)}>
                Remove
              </Button>
            </>
          }
        >
          <p>
            Their {entries.filter(e => e.memberId === confirm.member.id).length} logged days stay in
            history, but they drop off the leaderboard. You can undo this straight afterwards.
          </p>
        </Dialog>
      )}

      {confirm?.kind === 'end' && (
        <Dialog
          title="End the challenge?"
          onClose={() => setConfirm(null)}
          actions={
            <>
              <Button type="button" $tone="ghost" onClick={() => setConfirm(null)}>
                Keep going
              </Button>
              <Button type="button" $tone="danger" disabled={busy} onClick={toggleStatus}>
                End it
              </Button>
            </>
          }
        >
          <p>
            Points freeze where they are and logging closes for all {activeMembers.length} members.
            You can reopen it from here later.
          </p>
        </Dialog>
      )}

      {confirm?.kind === 'delete' && (
        <Dialog
          title="Delete this challenge?"
          onClose={() => {
            setConfirm(null);
            setDeleteInput('');
          }}
          actions={
            <>
              <Button
                type="button"
                $tone="ghost"
                onClick={() => {
                  setConfirm(null);
                  setDeleteInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                $tone="danger"
                disabled={deleteInput.trim().toLowerCase() !== challenge.name.trim().toLowerCase() || busy}
                onClick={doDelete}
              >
                {busy ? 'Deleting…' : 'Delete for everyone'}
              </Button>
            </>
          }
        >
          <p>
            This wipes {challenge.name}, all {members.length} members and all {entries.length} logged
            days, for everyone. There is no undo and no backup.
          </p>
          <Field>
            <label htmlFor="delete-confirm">Type “{challenge.name}” to confirm</label>
            <Input id="delete-confirm" $text value={deleteInput} onChange={e => setDeleteInput(e.target.value)} />
          </Field>
        </Dialog>
      )}

      {toast && (
        <Toast actionLabel={toast.undo ? 'Undo' : undefined} onAction={toast.undo}>
          {toast.msg}
        </Toast>
      )}
    </>
  );
}
