import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useAdminMode } from '@/context/AdminModeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { addMember, removeMember, renameMember } from '@/lib/members';
import { updateChallengeConfig, deleteChallenge } from '@/lib/challenges';
import { RuleEditor } from '@/components/admin/RuleEditor';
import { formatRuleFormula } from '@/lib/rules/ruleDocs';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { ArrowIcon, XIcon, ChevRightIcon, LockIcon, PlusIcon } from '@/components/ui/Icons';
import type { Member, Rule, AuditLogEntry, Entry } from '@/types';

// ── Shared styled components ──────────────────────────────────────────────────

const Sheet = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.color.bg};
  display: flex;
  flex-direction: column;
`;

const WizHd = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  background: ${({ theme }) => theme.color.bg};
  position: sticky;
  top: 0;
  z-index: 10;
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
  flex-shrink: 0;
  svg { width: 18px; height: 18px; stroke: ${({ theme }) => theme.color.ink}; stroke-width: 1.6; fill: none; }
`;

const Eyebrow = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

const H2 = styled.h2`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  font-weight: 400;
  color: ${({ theme }) => theme.color.ink};
  margin: 0;
`;

const OwnerPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.color.ink};
  color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-left: auto;
`;

const ScreenBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px calc(72px + 16px);
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const SectionLbl = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  font-weight: 500;
  padding: 18px 0 10px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`;

const AdminCardBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 16px 14px;
  text-align: left;
  cursor: pointer;
  width: 100%;
  transition: background 0.08s;
  &:hover { background: ${({ theme }) => theme.color.surface2}; }
`;

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  &:last-child { border-bottom: 0; }
`;

const H3 = styled.span`
  font-family: ${({ theme }) => theme.font.body};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.ink};
`;

const BodySm = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
`;

const SmIconBtn = styled.button`
  width: 28px; height: 28px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  svg { width: 14px; height: 14px; stroke: ${({ theme }) => theme.color.ink3}; stroke-width: 1.6; fill: none; }
`;

const BtnSm = styled.button`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.hair2};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: 500 12.5px/1 ${({ theme }) => theme.font.body};
  cursor: pointer;
`;

const BtnK = styled.button`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.ink};
  background: ${({ theme }) => theme.color.ink};
  color: ${({ theme }) => theme.color.surface};
  font: 500 14px/1 ${({ theme }) => theme.font.body};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const BtnGhost = styled.button`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.hair2};
  background: transparent;
  color: ${({ theme }) => theme.color.ink2};
  font: 500 12.5px/1 ${({ theme }) => theme.font.body};
  cursor: pointer;
`;

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  label {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.ink3};
    font-weight: 500;
  }
  input {
    border: 1px solid ${({ theme }) => theme.color.hair2};
    background: ${({ theme }) => theme.color.surface};
    font: 400 15px/1.3 ${({ theme }) => theme.font.body};
    color: ${({ theme }) => theme.color.ink};
    padding: 11px 12px;
    border-radius: ${({ theme }) => theme.radii.md};
    outline: none;
    width: 100%;
    &:focus { border-color: ${({ theme }) => theme.color.ink}; }
  }
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.color.bad};
  font-size: 12.5px;
  margin-top: 4px;
`;

const ConflictBox = styled.div`
  margin-top: 20px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accentTint};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const ConflictHd = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const RuleItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const DangerBtn = styled.button`
  width: 100%;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.badTint};
  background: transparent;
  color: ${({ theme }) => theme.color.bad};
  font: 500 14px/1 ${({ theme }) => theme.font.body};
  cursor: pointer;
`;

const LockMark = styled.div`
  width: 64px; height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  display: flex;
  align-items: center;
  justify-content: center;
  svg { width: 28px; height: 28px; stroke: ${({ theme }) => theme.color.ink}; stroke-width: 1.6; fill: none; }
`;

const H1 = styled.h1`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 28px;
  font-weight: 400;
  margin: 18px 0 0;
  em { font-style: italic; }
`;

export const AuditRowWrap = styled.div`
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  &:last-child { border-bottom: 0; }
`;

export const AuditDot = styled.div`
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.ink};
  margin: 8px 0 0 5px;
`;

// ── Audit card styled components ──────────────────────────────────────────────

const AuditCard = styled.div`
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  margin-bottom: 8px;
`;

const AuditCardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 9px;
`;

const AuditLeftCol = styled.div`
  flex: 1;
  min-width: 0;
`;

const AuditActionTitle = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.ink};
  line-height: 1.3;
`;

const AuditMetaLine = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 3px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
`;

const AdminBadge = styled.span`
  padding: 1px 5px;
  border-radius: 4px;
  background: ${({ theme }) => theme.color.accent}22;
  color: ${({ theme }) => theme.color.accent};
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const CatTag = styled.span<{ $cat: string }>`
  padding: 2px 7px;
  border-radius: 4px;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
  align-self: flex-start;
  background: ${({ $cat }) => {
    if ($cat === 'Entries') return '#7c3aed22';
    if ($cat === 'Members') return '#16a34a22';
    if ($cat === 'Owner') return '#dc262622';
    return '#71717a22';
  }};
  color: ${({ $cat }) => {
    if ($cat === 'Entries') return '#7c3aed';
    if ($cat === 'Members') return '#16a34a';
    if ($cat === 'Owner') return '#dc2626';
    return '#71717a';
  }};
`;

const DetailBlock = styled.div`
  border-top: 1px solid ${({ theme }) => theme.color.hair};
  background: ${({ theme }) => theme.color.surface};
  padding: 9px 12px 11px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-height: 18px;
`;

const DK = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9.5px;
  color: ${({ theme }) => theme.color.ink3};
  min-width: 64px;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 1px;
`;

const DV = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  color: ${({ theme }) => theme.color.ink};
  word-break: break-word;
  line-height: 1.45;
`;

const Arr = styled.span`
  color: ${({ theme }) => theme.color.ink3};
  margin: 0 2px;
  font-size: 10px;
`;

const PtsLine = styled.div<{ $sign: 'pos' | 'neg' | 'zero' }>`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11.5px;
  font-weight: 700;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed ${({ theme }) => theme.color.hair};
  color: ${({ theme, $sign }) =>
    $sign === 'pos' ? theme.color.good :
    $sign === 'neg' ? theme.color.bad :
    theme.color.ink3};
`;

const RulesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 2px 0 2px 8px;
`;

const RuleDetailRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const RN = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink2};
  min-width: 90px;
  flex-shrink: 0;
`;

const RV = styled.span<{ $changed?: boolean }>`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme, $changed }) => $changed ? theme.color.accent : theme.color.ink};
  font-weight: ${({ $changed }) => $changed ? '600' : '400'};
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

const ChipsRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-top: 8px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

// ── Admin Gate ────────────────────────────────────────────────────────────────

function AdminGate({ onClose }: { onClose: () => void }) {
  const [pw, setPw] = useState('');
  const { enterAdminMode, entering, lastError } = useAdminMode();
  const { selectedMemberId } = useSelectedMember();

  const handleSubmit = async () => {
    if (!pw.trim()) return;
    await enterAdminMode(pw, selectedMemberId);
  };

  return (
    <Sheet>
      <WizHd>
        <div style={{ flex: 1 }}>
          <Eyebrow>Admin · challenge</Eyebrow>
        </div>
        <IconBtn onClick={onClose} aria-label="Close">
          <XIcon />
        </IconBtn>
      </WizHd>

      <ScreenBody style={{ display: 'flex', flexDirection: 'column', padding: '40px 24px' }}>
        <LockMark>
          <LockIcon />
        </LockMark>
        <H1>Owner <em>only</em>.</H1>
        <p style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 14 }}>
          Enter the password to manage members, rules, and dates.
        </p>

        <FieldWrap style={{ marginTop: 24 }}>
          <label>Password</label>
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="set when challenge was created"
          />
          {lastError === 'wrong_password' && (
            <ErrorMsg>Incorrect password. Try again.</ErrorMsg>
          )}
        </FieldWrap>

        <BtnK
          style={{ width: '100%', marginTop: 16, padding: '16px 18px', fontSize: 15 }}
          onClick={handleSubmit}
          disabled={entering || !pw.trim()}
        >
          {entering ? 'Checking…' : 'Unlock'}
        </BtnK>

        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 20, lineHeight: 1.5, textAlign: 'center' }}>
          Lost it? Ask another owner to reset it.
        </p>
      </ScreenBody>
    </Sheet>
  );
}

// ── Admin Home ────────────────────────────────────────────────────────────────

function AdminHome({ onPick, onClose }: { onPick: (id: 'members' | 'config' | 'audit') => void; onClose: () => void }) {
  const { challenge, members, auditLog } = useChallenge();
  const auditLogCount = auditLog.length;
  const activeCount = members.filter(m => m.active).length;
  const removedCount = members.filter(m => !m.active).length;
  const ruleCount = challenge?.config.rules.length ?? 0;

  const cards = [
    { id: 'members' as const, title: 'Members', count: `${activeCount} active · ${removedCount} removed`, note: 'Add, remove, rename' },
    { id: 'config' as const, title: 'Rules & dates', count: `${ruleCount} rules`, note: 'Edit configuration' },
    { id: 'audit' as const, title: 'Audit log', count: `${auditLogCount} actions`, note: 'Every state change' },
  ];

  return (
    <Sheet>
      <WizHd>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>Admin</Eyebrow>
          <H2>Settings</H2>
        </div>
        <OwnerPill>owner</OwnerPill>
        <IconBtn onClick={onClose} aria-label="Close">
          <XIcon />
        </IconBtn>
      </WizHd>

      <ScreenBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {cards.map(c => (
            <AdminCardBtn key={c.id} onClick={() => onPick(c.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <H3 style={{ display: 'block' }}>{c.title}</H3>
                <BodySm style={{ display: 'block', marginTop: 2 }}>{c.count}</BodySm>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-2)' }}>{c.note}</div>
              </div>
              <ChevRightIcon style={{ width: 18, height: 18, stroke: 'var(--ink-3)', strokeWidth: 1.6, fill: 'none', flexShrink: 0 }} />
            </AdminCardBtn>
          ))}
        </div>

        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--ink-3)', padding: '22px 4px', lineHeight: 1.5, fontStyle: 'italic' }}>
          Admin actions write to the audit log automatically.
        </p>
      </ScreenBody>
    </Sheet>
  );
}

// ── Admin Members ─────────────────────────────────────────────────────────────

function AdminMembers({ onBack }: { onBack: () => void }) {
  const { challenge, members } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const [newName, setNewName] = useState('');
  const [conflict, setConflict] = useState<{ suggested: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline rename state: memberId → draft name
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);

  if (!challenge) return null;

  const activeMembers = members.filter(m => m.active);
  const removedMembers = members.filter(m => !m.active);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    setConflict(null);
    try {
      const result = await addMember(
        challenge.id,
        newName.trim(),
        { memberId: selectedMemberId, isOwner: true },
      );
      if (result.ok) {
        setNewName('');
      } else if (result.reason === 'name_taken') {
        setConflict({ suggested: result.suggested ?? `${newName.trim()} 2` });
      } else {
        setError('Could not add member. Try again.');
      }
    } catch {
      setError('Error adding member.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (m: Member) => {
    if (!window.confirm(`Remove ${m.name}? Their entries will be preserved.`)) return;
    try {
      await removeMember(challenge.id, m.id, { memberId: selectedMemberId, isOwner: true });
    } catch {
      setError('Could not remove member.');
    }
  };

  const startRename = (m: Member) => {
    setRenaming(m.id);
    setRenameDraft(m.name);
    setError(null);
  };

  const cancelRename = () => {
    setRenaming(null);
    setRenameDraft('');
  };

  const commitRename = async (m: Member) => {
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === m.name) { cancelRename(); return; }
    setRenameBusy(true);
    setError(null);
    try {
      const result = await renameMember(
        challenge.id,
        m.id,
        trimmed,
        { memberId: selectedMemberId, isOwner: true },
      );
      if (result.ok) {
        cancelRename();
      } else if (result.reason === 'name_taken') {
        setError(`"${trimmed}" is taken. Try a different name.`);
      } else {
        setError('Member not found.');
      }
    } catch {
      setError('Could not rename member.');
    } finally {
      setRenameBusy(false);
    }
  };

  const handleRestore = (m: Member) => {
    // Restore = add the member back under a (possibly different) name
    setNewName(m.name);
    setError('To restore, use the Add form above. Their original entries will reappear on the leaderboard once their name matches.');
  };

  return (
    <Sheet>
      <WizHd>
        <IconBtn onClick={onBack} aria-label="Back">
          <ArrowIcon />
        </IconBtn>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>Admin · Members</Eyebrow>
          <H2>Members</H2>
        </div>
      </WizHd>

      <ScreenBody>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 }}>
          <Eyebrow>Active · {activeMembers.length}</Eyebrow>
        </div>

        <Card>
          {activeMembers.map((m, i) => (
            <MemberRow key={m.id} style={i === activeMembers.length - 1 ? { borderBottom: 0 } : {}}>
              <MemberBadge member={m} isYou={m.id === selectedMemberId} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {renaming === m.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <FieldWrap style={{ flex: 1 }}>
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={e => setRenameDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(m);
                          if (e.key === 'Escape') cancelRename();
                        }}
                      />
                    </FieldWrap>
                    <BtnSm onClick={() => commitRename(m)} disabled={renameBusy || !renameDraft.trim()}>
                      Save
                    </BtnSm>
                    <SmIconBtn onClick={cancelRename} aria-label="Cancel">
                      <XIcon />
                    </SmIconBtn>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <H3>{m.name}</H3>
                    {m.id === selectedMemberId && (
                      <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--ink)', color: 'var(--surface)', borderRadius: 999, fontFamily: 'var(--f-mono)', letterSpacing: '.04em', textTransform: 'uppercase' }}>you</span>
                    )}
                  </div>
                )}
              </div>
              {renaming !== m.id && (
                <>
                  <BtnSm onClick={() => startRename(m)}>Rename</BtnSm>
                  <BtnSm onClick={() => handleRemove(m)} style={{ color: 'var(--bad)', borderColor: 'var(--bad-tint)' }}>
                    Remove
                  </BtnSm>
                </>
              )}
            </MemberRow>
          ))}
        </Card>

        {/* Add member */}
        <SectionLbl>Add member</SectionLbl>
        <div style={{ display: 'flex', gap: 8 }}>
          <FieldWrap style={{ flex: 1 }}>
            <input
              placeholder="Member name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </FieldWrap>
          <BtnK onClick={handleAdd} disabled={adding || !newName.trim()} style={{ alignSelf: 'flex-end' }}>
            Add
          </BtnK>
        </div>
        {error && <ErrorMsg>{error}</ErrorMsg>}

        {conflict && (
          <ConflictBox>
            <ConflictHd>
              <Eyebrow>Name conflict</Eyebrow>
              <SmIconBtn onClick={() => setConflict(null)} style={{ width: 26, height: 26 }}>
                <XIcon />
              </SmIconBtn>
            </ConflictHd>
            <H3 style={{ display: 'block' }}>"{newName}" already exists.</H3>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-2)' }}>
              We suggest <b>{conflict.suggested}</b>. You can also type a different name.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                style={{ flex: 1, border: '1px solid var(--hair-2)', borderRadius: 8, padding: '10px 12px', font: '400 14px var(--f-body)', background: 'var(--surface)' }}
                defaultValue={conflict.suggested}
                onChange={e => setNewName(e.target.value)}
              />
              <BtnK onClick={() => { setConflict(null); handleAdd(); }}>Add</BtnK>
            </div>
          </ConflictBox>
        )}

        {removedMembers.length > 0 && (
          <>
            <SectionLbl>Removed · {removedMembers.length}</SectionLbl>
            <Card style={{ opacity: 0.7 }}>
              {removedMembers.map((m, i) => (
                <MemberRow key={m.id} style={i === removedMembers.length - 1 ? { borderBottom: 0 } : {}}>
                  <MemberBadge member={m} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <H3>{m.name}</H3>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 999, border: '1px solid var(--hair-2)', fontFamily: 'var(--f-mono)', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>removed</span>
                    </div>
                  </div>
                  <BtnGhost onClick={() => handleRestore(m)}>Restore</BtnGhost>
                </MemberRow>
              ))}
            </Card>
          </>
        )}
      </ScreenBody>
    </Sheet>
  );
}

// ── Admin Config (Rules & Dates) ──────────────────────────────────────────────

function ruleFormula(r: Rule): string {
  return formatRuleFormula(r);
}

function AdminConfig({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { challenge } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const [editingRule, setEditingRule] = useState<Rule | null | 'new'>(null);
  const [saving, setSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  // Delete confirmation state
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!challenge) return null;

  const { config } = challenge;
  const rules = [...config.rules].sort((a, b) => a.order - b.order);

  const weekCount = config.endDate
    ? Math.ceil((new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (7 * 86400000))
    : null;
  const dayCount = config.endDate
    ? Math.ceil((new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / 86400000)
    : null;

  async function persistRules(newRules: Rule[]) {
    if (!challenge) return;
    setSaving(true);
    setConfigError(null);
    try {
      const result = await updateChallengeConfig(
        challenge.id,
        { ...config, rules: newRules },
        { memberId: selectedMemberId, isOwner: true },
      );
      if (!result.ok) setConfigError('Could not save. Challenge not found.');
    } catch {
      setConfigError('Error saving rules. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRuleSave(saved: Rule) {
    const idx = rules.findIndex(r => r.id === saved.id);
    let newRules: Rule[];
    if (idx >= 0) {
      newRules = rules.map(r => r.id === saved.id ? saved : r);
    } else {
      newRules = [...rules, { ...saved, order: rules.length }];
    }
    setEditingRule(null);
    await persistRules(newRules);
  }

  async function handleRuleDelete(id: string) {
    const newRules = rules
      .filter(r => r.id !== id)
      .map((r, i) => ({ ...r, order: i }));
    setEditingRule(null);
    await persistRules(newRules);
  }

  async function handleDeleteChallenge() {
    if (!challenge) return;
    if (deleteInput.trim().toLowerCase() !== challenge.name.trim().toLowerCase()) {
      setDeleteError('Name doesn\'t match. Please type the challenge name exactly.');
      return;
    }
    const { id, slug } = challenge;
    setDeletePhase('deleting');
    setDeleteError(null);
    try {
      const result = await deleteChallenge(id, slug);
      if (result.ok) {
        navigate('/', { replace: true });
      } else {
        setDeleteError('Challenge not found — it may have already been deleted.');
        setDeletePhase('confirm');
      }
    } catch {
      setDeleteError('Something went wrong. Please try again.');
      setDeletePhase('confirm');
    }
  }

  return (
    <>
      <Sheet>
        <WizHd>
          <IconBtn onClick={onBack} aria-label="Back">
            <ArrowIcon />
          </IconBtn>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Admin · Config</Eyebrow>
            <H2>Rules & dates</H2>
          </div>
        </WizHd>

        <ScreenBody>
          <SectionLbl style={{ paddingTop: 14 }}>Dates</SectionLbl>
          <Card style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Eyebrow>Window</Eyebrow>
              {weekCount !== null && dayCount !== null && (
                <BodySm>{weekCount} weeks · {dayCount} days</BodySm>
              )}
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <Eyebrow style={{ display: 'block' }}>Start</Eyebrow>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--ink)' }}>{config.startDate}</span>
              </div>
              <div style={{ flex: 1 }}>
                <Eyebrow style={{ display: 'block' }}>End</Eyebrow>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--ink)' }}>
                  {config.endDate ?? '—'}
                </span>
              </div>
            </div>
          </Card>

          <SectionLbl>Rules · {rules.length}</SectionLbl>
          {configError && <BodySm style={{ color: 'var(--bad)', marginBottom: 4 }}>{configError}</BodySm>}
          {saving && <BodySm style={{ marginBottom: 4 }}>Saving…</BodySm>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rules.map(r => (
              <RuleItem key={r.id} onClick={() => setEditingRule(r)} style={{ cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <H3 style={{ display: 'block' }}>{r.emoji ? `${r.emoji} ${r.name}` : r.name}</H3>
                  <BodySm style={{ display: 'block', marginTop: 2 }}>{r.kind} · {ruleFormula(r)}</BodySm>
                </div>
                <ChevRightIcon style={{ width: 14, height: 14, stroke: 'var(--ink-3)', strokeWidth: 1.6, fill: 'none', flexShrink: 0 }} />
              </RuleItem>
            ))}
            <BtnGhost
              onClick={() => setEditingRule('new')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0' }}
            >
              <PlusIcon style={{ width: 14, height: 14, stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }} />
              Add rule
            </BtnGhost>
          </div>

          <SectionLbl>Danger zone</SectionLbl>
          {deletePhase === 'idle' && (
            <DangerBtn onClick={() => setDeletePhase('confirm')}>
              Delete challenge…
            </DangerBtn>
          )}
          {(deletePhase === 'confirm' || deletePhase === 'deleting') && (
            <div style={{
              border: '1px solid var(--bad)',
              borderRadius: 10,
              padding: 16,
              background: 'rgba(var(--bad-rgb, 220 38 38) / 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <H3 style={{ color: 'var(--bad)' }}>Delete this challenge?</H3>
              <BodySm style={{ color: 'var(--ink-2)' }}>
                This permanently deletes <strong>{challenge.name}</strong> and all its members, entries, and history. This cannot be undone.
              </BodySm>
              <BodySm style={{ color: 'var(--ink-2)' }}>
                Type <strong>{challenge.name}</strong> to confirm:
              </BodySm>
              <FieldWrap>
                <input
                  autoFocus
                  placeholder={challenge.name}
                  value={deleteInput}
                  onChange={e => { setDeleteInput(e.target.value); setDeleteError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleDeleteChallenge()}
                  disabled={deletePhase === 'deleting'}
                />
              </FieldWrap>
              {deleteError && <ErrorMsg>{deleteError}</ErrorMsg>}
              <div style={{ display: 'flex', gap: 8 }}>
                <BtnGhost
                  onClick={() => { setDeletePhase('idle'); setDeleteInput(''); setDeleteError(null); }}
                  disabled={deletePhase === 'deleting'}
                  style={{ flex: 1 }}
                >
                  Cancel
                </BtnGhost>
                <DangerBtn
                  onClick={handleDeleteChallenge}
                  disabled={deletePhase === 'deleting' || !deleteInput.trim()}
                  style={{ flex: 1 }}
                >
                  {deletePhase === 'deleting' ? 'Deleting…' : 'Delete forever'}
                </DangerBtn>
              </div>
            </div>
          )}
        </ScreenBody>
      </Sheet>

      {editingRule !== null && (
        <RuleEditor
          rule={editingRule === 'new' ? null : editingRule}
          allRules={rules}
          onSave={handleRuleSave}
          onDelete={editingRule !== 'new' ? () => handleRuleDelete((editingRule as Rule).id) : undefined}
          onClose={() => setEditingRule(null)}
        />
      )}
    </>
  );
}

// ── Admin Audit ───────────────────────────────────────────────────────────────

const AUDIT_FILTERS = ['All', 'Members', 'Entries', 'Config', 'Owner'] as const;
type AuditFilter = (typeof AUDIT_FILTERS)[number];

function auditCategory(action: string): AuditFilter {
  if (action.startsWith('member.')) return 'Members';
  if (action.startsWith('entry.')) return 'Entries';
  if (action.startsWith('challenge.')) return 'Config';
  if (action.startsWith('owner.')) return 'Owner';
  return 'Config';
}

function auditActionTitle(a: AuditLogEntry, memberById: Record<string, Member>): string {
  const aft = a.after as Record<string, unknown> | null;
  const bef = a.before as Record<string, unknown> | null;
  switch (a.action) {
    case 'challenge.create': return 'Challenge created';
    case 'challenge.config_change': return 'Challenge settings updated';
    case 'challenge.status_change': {
      const ns = typeof a.after === 'string' ? a.after : String(aft?.status ?? '');
      return `Challenge ${ns === 'ended' ? 'ended' : 'reopened'}`;
    }
    case 'member.add':   return `${String(aft?.name ?? 'Member')} added`;
    case 'member.remove': {
      const name = typeof bef === 'object' && bef ? String((bef as Record<string,unknown>).name ?? '') : '';
      return `${name || 'Member'} removed`;
    }
    case 'member.rename': {
      const oldN = typeof a.before === 'string' ? a.before : '';
      const newN = typeof a.after  === 'string' ? a.after  : '';
      return `${oldN} renamed → ${newN}`;
    }
    case 'entry.create': {
      const memberId = String(aft?.memberId ?? '');
      const who = memberById[memberId]?.name ?? 'Unknown';
      return `${who} logged entry for ${String(aft?.date ?? '')}`;
    }
    case 'entry.update': {
      const actor = a.actorMemberId ? (memberById[a.actorMemberId]?.name ?? 'Unknown') : 'Owner';
      return `${actor} updated an entry`;
    }
    case 'entry.delete': {
      const memberId = typeof bef === 'object' && bef ? String((bef as Record<string,unknown>).memberId ?? '') : '';
      const who = memberById[memberId]?.name ?? 'Unknown';
      return `${who}'s entry deleted`;
    }
    case 'owner.login': return 'Admin mode unlocked';
    case 'owner.login_failed': return 'Admin login attempt failed';
    default: return a.action;
  }
}

function formatFullTs(ts: { seconds: number; nanoseconds: number } | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts.seconds * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const h = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const sec = d.getSeconds().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h % 12 || 12}:${min}:${sec} ${ampm}`;
}

function fmtVal(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'number') return String(v);
  const labels: Record<string, string> = {
    yes: '✓ yes', no: '✗ no', free: 'free pass',
    clean: '✓ clean', infraction: '✗ slip',
    active: 'active', ended: 'ended',
  };
  return labels[String(v)] ?? String(v);
}

function renderAuditDetail(
  a: AuditLogEntry,
  ruleById: Record<string, Rule>,
  memberById: Record<string, Member>,
  entryById: Record<string, Entry>,
): ReactNode {
  const bef = a.before as Record<string, unknown> | null;
  const aft = a.after  as Record<string, unknown> | null;

  switch (a.action) {
    // ── Entry: create ───────────────────────────────────────────────────────
    case 'entry.create': {
      if (!aft) return null;
      const memberId = String(aft.memberId ?? '');
      const member   = memberById[memberId];
      const values   = (aft.values ?? {}) as Record<string, unknown>;
      const pts      = Number(aft.pts ?? 0);
      return (
        <>
          <DetailRow><DK>Member</DK><DV>{member?.name ?? memberId}</DV></DetailRow>
          <DetailRow><DK>Date</DK><DV>{String(aft.date ?? '—')}</DV></DetailRow>
          <DetailRow><DK>Entry ID</DK><DV style={{ fontSize: 9.5, opacity: 0.5 }}>{String(aft.id ?? a.target.id)}</DV></DetailRow>
          {Object.keys(values).length > 0 && (
            <>
              <DetailRow><DK>Values</DK><DV /></DetailRow>
              <RulesList>
                {Object.entries(values).map(([rId, v]) => {
                  const rule = ruleById[rId];
                  return (
                    <RuleDetailRow key={rId}>
                      <RN>{rule?.emoji ? `${rule.emoji} ` : ''}{rule?.name ?? rId}</RN>
                      <RV>{fmtVal(v)}</RV>
                    </RuleDetailRow>
                  );
                })}
              </RulesList>
            </>
          )}
          <PtsLine $sign={pts > 0 ? 'pos' : pts < 0 ? 'neg' : 'zero'}>
            {pts >= 0 ? '+' : ''}{pts.toFixed(1)} pts earned
          </PtsLine>
        </>
      );
    }

    // ── Entry: update ───────────────────────────────────────────────────────
    case 'entry.update': {
      const befVals = (bef?.values ?? {}) as Record<string, unknown>;
      const aftVals = (aft?.values ?? {}) as Record<string, unknown>;
      const befPts  = Number(bef?.pts ?? 0);
      const aftPts  = Number(aft?.pts ?? 0);

      const allRuleIds = Array.from(new Set([...Object.keys(befVals), ...Object.keys(aftVals)]));
      const changed   = allRuleIds.filter(id => befVals[id] !== aftVals[id]);
      const unchanged = allRuleIds.filter(id => befVals[id] === aftVals[id]);

      // Try to look up the current entry for member + date context
      const entry = entryById[a.target.id];

      return (
        <>
          {entry ? (
            <>
              <DetailRow><DK>Member</DK><DV>{memberById[entry.memberId]?.name ?? entry.memberId}</DV></DetailRow>
              <DetailRow><DK>Date</DK><DV>{entry.date}</DV></DetailRow>
            </>
          ) : (
            <DetailRow><DK>Entry ID</DK><DV style={{ fontSize: 9.5, opacity: 0.5 }}>{a.target.id}</DV></DetailRow>
          )}
          {changed.length > 0 && (
            <>
              <DetailRow><DK>Changed</DK><DV style={{ color: '#7c3aed', fontWeight: 600 }}>{changed.length} rule{changed.length > 1 ? 's' : ''}</DV></DetailRow>
              <RulesList>
                {changed.map(rId => (
                  <RuleDetailRow key={rId}>
                    <RN>{ruleById[rId]?.name ?? rId}</RN>
                    <RV $changed>
                      {fmtVal(befVals[rId])}<Arr> → </Arr>{fmtVal(aftVals[rId])}
                    </RV>
                  </RuleDetailRow>
                ))}
              </RulesList>
            </>
          )}
          {unchanged.length > 0 && (
            <>
              <DetailRow><DK>Unchanged</DK><DV style={{ opacity: 0.6 }}>{unchanged.length} rule{unchanged.length > 1 ? 's' : ''}</DV></DetailRow>
              <RulesList>
                {unchanged.map(rId => (
                  <RuleDetailRow key={rId}>
                    <RN>{ruleById[rId]?.name ?? rId}</RN>
                    <RV>{fmtVal(befVals[rId])}</RV>
                  </RuleDetailRow>
                ))}
              </RulesList>
            </>
          )}
          <PtsLine $sign={aftPts > befPts ? 'pos' : aftPts < befPts ? 'neg' : 'zero'}>
            Pts: {befPts.toFixed(1)} <Arr>→</Arr> {aftPts.toFixed(1)}
            {aftPts !== befPts && ` (${aftPts > befPts ? '+' : ''}${(aftPts - befPts).toFixed(1)})`}
          </PtsLine>
        </>
      );
    }

    // ── Entry: delete ───────────────────────────────────────────────────────
    case 'entry.delete': {
      if (!bef) return null;
      const memberId = String(bef.memberId ?? '');
      const values   = (bef.values ?? {}) as Record<string, unknown>;
      const pts      = Number(bef.pts ?? 0);
      return (
        <>
          <DetailRow><DK>Member</DK><DV>{memberById[memberId]?.name ?? memberId}</DV></DetailRow>
          <DetailRow><DK>Date</DK><DV>{String(bef.date ?? '—')}</DV></DetailRow>
          <DetailRow><DK>Entry ID</DK><DV style={{ fontSize: 9.5, opacity: 0.5 }}>{a.target.id}</DV></DetailRow>
          {Object.keys(values).length > 0 && (
            <>
              <DetailRow><DK>Deleted</DK><DV /></DetailRow>
              <RulesList>
                {Object.entries(values).map(([rId, v]) => (
                  <RuleDetailRow key={rId}>
                    <RN>{ruleById[rId]?.name ?? rId}</RN>
                    <RV style={{ textDecoration: 'line-through', opacity: 0.6 }}>{fmtVal(v)}</RV>
                  </RuleDetailRow>
                ))}
              </RulesList>
            </>
          )}
          <PtsLine $sign="neg">−{pts.toFixed(1)} pts removed</PtsLine>
        </>
      );
    }

    // ── Member: add ─────────────────────────────────────────────────────────
    case 'member.add': {
      if (!aft) return null;
      return (
        <>
          <DetailRow><DK>Name</DK><DV>{String(aft.name ?? '—')}</DV></DetailRow>
          <DetailRow><DK>Member ID</DK><DV style={{ fontSize: 9.5, opacity: 0.5 }}>{String(aft.id ?? a.target.id)}</DV></DetailRow>
        </>
      );
    }

    // ── Member: remove ──────────────────────────────────────────────────────
    case 'member.remove': {
      const name = typeof bef === 'object' && bef ? String((bef as Record<string, unknown>).name ?? '') : '';
      return (
        <>
          <DetailRow><DK>Name</DK><DV>{name || '—'}</DV></DetailRow>
          <DetailRow><DK>Member ID</DK><DV style={{ fontSize: 9.5, opacity: 0.5 }}>{a.target.id}</DV></DetailRow>
          <DetailRow><DK>Note</DK><DV style={{ opacity: 0.6 }}>History preserved · can be restored</DV></DetailRow>
        </>
      );
    }

    // ── Member: rename ──────────────────────────────────────────────────────
    case 'member.rename': {
      const oldName = typeof a.before === 'string' ? a.before : '';
      const newName = typeof a.after  === 'string' ? a.after  : '';
      return (
        <>
          <DetailRow><DK>Old name</DK><DV>"{oldName}"</DV></DetailRow>
          <DetailRow><DK>New name</DK><DV>"{newName}"</DV></DetailRow>
          <DetailRow><DK>Member ID</DK><DV style={{ fontSize: 9.5, opacity: 0.5 }}>{a.target.id}</DV></DetailRow>
        </>
      );
    }

    // ── Challenge: create ────────────────────────────────────────────────────
    case 'challenge.create': {
      if (!aft) return null;
      const cfg = aft.config as Record<string, unknown> | undefined;
      const rules = (cfg?.rules as Rule[] | undefined) ?? [];
      return (
        <>
          <DetailRow><DK>Name</DK><DV>{String(aft.name ?? '—')}</DV></DetailRow>
          <DetailRow><DK>Slug</DK><DV>{String(aft.slug ?? '—')}</DV></DetailRow>
          <DetailRow><DK>Start</DK><DV>{String(cfg?.startDate ?? '—')}</DV></DetailRow>
          <DetailRow><DK>End</DK><DV>{cfg?.endDate ? String(cfg.endDate) : 'open-ended'}</DV></DetailRow>
          <DetailRow><DK>Timezone</DK><DV>{String(cfg?.timezone ?? '—')}</DV></DetailRow>
          <DetailRow><DK>Rules ({rules.length})</DK><DV /></DetailRow>
          <RulesList>
            {rules.map(r => (
              <RuleDetailRow key={r.id}>
                <RN>{r.emoji ? `${r.emoji} ` : ''}{r.name}</RN>
                <RV style={{ opacity: 0.5, fontSize: 10 }}>{r.kind}</RV>
              </RuleDetailRow>
            ))}
          </RulesList>
        </>
      );
    }

    // ── Challenge: config change ─────────────────────────────────────────────
    case 'challenge.config_change': {
      if (!bef || !aft) return null;
      const lines: ReactNode[] = [];

      if (bef.startDate !== aft.startDate)
        lines.push(<DetailRow key="sd"><DK>Start</DK><DV>{String(bef.startDate)} <Arr>→</Arr> {String(aft.startDate)}</DV></DetailRow>);
      if (bef.endDate !== aft.endDate)
        lines.push(<DetailRow key="ed"><DK>End</DK><DV>{bef.endDate ? String(bef.endDate) : 'open'} <Arr>→</Arr> {aft.endDate ? String(aft.endDate) : 'open'}</DV></DetailRow>);
      if (bef.timezone !== aft.timezone)
        lines.push(<DetailRow key="tz"><DK>Timezone</DK><DV>{String(bef.timezone)} <Arr>→</Arr> {String(aft.timezone)}</DV></DetailRow>);
      if (bef.weekAnchor !== aft.weekAnchor)
        lines.push(<DetailRow key="wa"><DK>Week anchor</DK><DV>{String(bef.weekAnchor)} <Arr>→</Arr> {String(aft.weekAnchor)}</DV></DetailRow>);

      const oldRules = (bef.rules as Rule[] | undefined) ?? [];
      const newRules = (aft.rules  as Rule[] | undefined) ?? [];
      const oldMap   = Object.fromEntries(oldRules.map(r => [r.id, r]));
      const newMap   = Object.fromEntries(newRules.map(r => [r.id, r]));
      const added    = newRules.filter(r => !oldMap[r.id]);
      const removed  = oldRules.filter(r => !newMap[r.id]);
      const modified = newRules.filter(r => oldMap[r.id] && JSON.stringify(oldMap[r.id]) !== JSON.stringify(r));

      if (added.length > 0)
        lines.push(
          <DetailRow key="added">
            <DK>Added</DK>
            <DV style={{ color: '#16a34a' }}>{added.map(r => (r.emoji ? `${r.emoji} ` : '') + r.name).join(', ')}</DV>
          </DetailRow>
        );
      if (removed.length > 0)
        lines.push(
          <DetailRow key="removed">
            <DK>Removed</DK>
            <DV style={{ color: '#dc2626' }}>{removed.map(r => r.name).join(', ')}</DV>
          </DetailRow>
        );
      if (modified.length > 0) {
        lines.push(<DetailRow key="mod-hd"><DK>Modified</DK><DV>{modified.map(r => r.name).join(', ')}</DV></DetailRow>);
        for (const nr of modified) {
          const or = oldMap[nr.id];
          if (!or) continue;
          const fieldChanges: string[] = [];
          if (or.name    !== nr.name)    fieldChanges.push(`name: "${or.name}" → "${nr.name}"`);
          if (or.emoji   !== nr.emoji)   fieldChanges.push(`emoji: ${or.emoji ?? '—'} → ${nr.emoji ?? '—'}`);
          if (JSON.stringify(or as unknown) !== JSON.stringify(nr as unknown))
            if (or.name === nr.name && or.emoji === nr.emoji) fieldChanges.push('settings changed');
          if (fieldChanges.length > 0)
            lines.push(
              <DetailRow key={`mod-${nr.id}`}>
                <DK style={{ paddingLeft: 8 }}>{nr.name}</DK>
                <DV style={{ opacity: 0.7, fontSize: 10 }}>{fieldChanges.join(' · ')}</DV>
              </DetailRow>
            );
        }
      }

      if (lines.length === 0)
        lines.push(<DetailRow key="none"><DK>Note</DK><DV style={{ opacity: 0.5 }}>No structural differences detected</DV></DetailRow>);

      return <>{lines}</>;
    }

    // ── Challenge: status change ─────────────────────────────────────────────
    case 'challenge.status_change': {
      const oldStatus = typeof a.before === 'string' ? a.before : '';
      const newStatus = typeof a.after  === 'string' ? a.after  : '';
      return (
        <DetailRow>
          <DK>Status</DK>
          <DV>{fmtVal(oldStatus)} <Arr>→</Arr> {fmtVal(newStatus)}</DV>
        </DetailRow>
      );
    }

    case 'owner.login':
    case 'owner.login_failed':
      return null;

    default:
      return null;
  }
}

function AdminAudit({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<AuditFilter>('All');
  const { auditLog, members, entries, challenge } = useChallenge();

  const memberById = Object.fromEntries(members.map(m => [m.id, m]));
  const ruleById   = Object.fromEntries((challenge?.config?.rules ?? []).map(r => [r.id, r]));
  const entryById  = Object.fromEntries(entries.map(e => [e.id, e]));

  const filtered = filter === 'All'
    ? auditLog
    : auditLog.filter(a => auditCategory(a.action) === filter);

  const counts: Record<AuditFilter, number> = {
    All: auditLog.length,
    Members: auditLog.filter(a => auditCategory(a.action) === 'Members').length,
    Entries: auditLog.filter(a => auditCategory(a.action) === 'Entries').length,
    Config:  auditLog.filter(a => auditCategory(a.action) === 'Config').length,
    Owner:   auditLog.filter(a => auditCategory(a.action) === 'Owner').length,
  };

  return (
    <Sheet>
      <WizHd>
        <IconBtn onClick={onBack} aria-label="Back"><ArrowIcon /></IconBtn>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>Admin · Audit</Eyebrow>
          <H2>Audit log</H2>
        </div>
      </WizHd>

      <ScreenBody>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)', marginBottom: 10 }}>
          {auditLog.length} total events · newest first
        </div>
        <ChipsRow>
          {AUDIT_FILTERS.map(f => (
            <Chip key={f} $active={filter === f} onClick={() => setFilter(f)}>
              {f}{counts[f] > 0 ? ` (${counts[f]})` : ''}
            </Chip>
          ))}
        </ChipsRow>

        <div style={{ marginTop: 14 }}>
          {filtered.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13.5, padding: '20px 0', textAlign: 'center' }}>
              No events in this category
            </div>
          ) : (
            filtered.map(a => {
              const actor = a.actorMemberId ? (memberById[a.actorMemberId]?.name ?? 'Unknown') : 'Owner';
              const ts    = a.timestamp as unknown as { seconds: number; nanoseconds: number } | null;
              const cat   = auditCategory(a.action);
              const detail = renderAuditDetail(a, ruleById, memberById, entryById);
              return (
                <AuditCard key={a.id}>
                  <AuditCardHead>
                    <AuditLeftCol>
                      <AuditActionTitle>{auditActionTitle(a, memberById)}</AuditActionTitle>
                      <AuditMetaLine>
                        {a.actorIsOwner && <AdminBadge>admin</AdminBadge>}
                        <span>{actor}</span>
                        <span>·</span>
                        <span>{formatFullTs(ts)}</span>
                      </AuditMetaLine>
                    </AuditLeftCol>
                    <CatTag $cat={cat}>{cat}</CatTag>
                  </AuditCardHead>
                  {detail && <DetailBlock>{detail}</DetailBlock>}
                </AuditCard>
              );
            })
          )}
        </div>
      </ScreenBody>
    </Sheet>
  );
}

// ── Admin page (state machine) ────────────────────────────────────────────────

type AdminView = 'gate' | 'home' | 'members' | 'config' | 'audit';

export function AdminPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAdminMode();
  const [view, setView] = useState<AdminView>(isAdmin ? 'home' : 'gate');

  // When admin unlocks via the gate, auto-advance to home
  useEffect(() => {
    if (isAdmin && view === 'gate') setView('home');
  }, [isAdmin, view]);

  const handleClose = () => navigate(`/c/${slug}`);

  if (view === 'gate') {
    return <AdminGate onClose={handleClose} />;
  }

  if (view === 'members') return <AdminMembers onBack={() => setView('home')} />;
  if (view === 'config') return <AdminConfig onBack={() => setView('home')} />;
  if (view === 'audit') return <AdminAudit onBack={() => setView('home')} />;
  return <AdminHome onPick={v => setView(v)} onClose={handleClose} />;
}
