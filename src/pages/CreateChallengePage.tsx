import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { nanoid } from 'nanoid';
import { createChallenge } from '@/lib/challenges';
import { classicPreset, minimalPreset } from '@/lib/rules/presets';
import { addMember } from '@/lib/members';
import { RuleEditor } from '@/components/admin/RuleEditor';
import { ArrowIcon, PlusIcon, XIcon, ChevRightIcon } from '@/components/ui/Icons';
import { MemberBadge, memberTone } from '@/components/ui/MemberBadge';
import { formatRuleFormula, RULE_KIND_INFO } from '@/lib/rules/ruleDocs';
import type { ChallengeConfig, Rule } from '@/types';

// ── Styled primitives ─────────────────────────────────────────────────────────

const Sheet = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.bg};
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
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
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 16px 120px;
  -webkit-overflow-scrolling: touch;
`;

const Step = styled.section`
  padding: 22px 0 8px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  &:last-child { border-bottom: 0; }
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const StepNum = styled.span`
  width: 24px; height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.ink};
  color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.display};
  font-size: 13px;
  font-style: italic;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const H3 = styled.h3`
  font-family: ${({ theme }) => theme.font.body};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.ink};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  font-weight: 500;
`;

const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.color.hair2};
  background: ${({ theme }) => theme.color.surface};
  font: 400 15px/1.3 ${({ theme }) => theme.font.body};
  color: ${({ theme }) => theme.color.ink};
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  outline: none;
  width: 100%;
  &:focus { border-color: ${({ theme }) => theme.color.ink}; }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
`;

const Btn = styled.button<{ $active?: boolean; $variant?: 'ghost' | 'k' | 'accent' }>`
  appearance: none;
  border: 1px solid ${({ theme, $active }) => $active ? theme.color.ink : theme.color.hair2};
  background: ${({ theme, $active, $variant }) => {
    if ($active || $variant === 'k') return theme.color.ink;
    if ($variant === 'accent') return theme.color.accent;
    if ($variant === 'ghost') return 'transparent';
    return theme.color.surface;
  }};
  color: ${({ theme, $active, $variant }) => {
    if ($active || $variant === 'k') return theme.color.surface;
    if ($variant === 'accent') return theme.color.accentInk;
    return theme.color.ink;
  }};
  font: 500 14px/1 ${({ theme }) => theme.font.body};
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  flex: 1;
  transition: opacity 0.08s;
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const LgBtn = styled(Btn)`
  padding: 16px 18px;
  font-size: 15px;
  width: 100%;
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

const SmIconBtn = styled(IconBtn)`
  width: 28px; height: 28px;
  svg { width: 12px; height: 12px; }
`;

const RuleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
  svg { width: 14px; height: 14px; stroke: ${({ theme }) => theme.color.ink3}; stroke-width: 1.6; fill: none; flex-shrink: 0; }
`;

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
`;

const GhostInput = styled.input`
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  font: 400 14.5px/1 ${({ theme }) => theme.font.body};
  color: ${({ theme }) => theme.color.ink};
  &::placeholder { color: ${({ theme }) => theme.color.ink3}; }
`;

const DashedBtn = styled(Btn)`
  border-style: dashed;
  color: ${({ theme }) => theme.color.ink2};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 1.8; fill: none; }
`;

const HintText = styled.p`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  color: ${({ theme }) => theme.color.ink3};
  text-align: center;
  margin-top: 10px;
  line-height: 1.5;
  font-style: italic;
`;

const Footer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 480px;
  margin: 0 auto;
  padding: 12px 16px 28px;
  border-top: 1px solid ${({ theme }) => theme.color.hair};
  background: ${({ theme }) => theme.color.surface};
`;

const ErrMsg = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.bad};
  margin-top: 8px;
`;


const SectionLbl = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  padding: 14px 0 6px;
`;

// ── Component ─────────────────────────────────────────────────────────────────

type Preset = 'classic' | 'minimal' | 'custom';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ninetyDaysStr() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

export function CreateChallengePage() {
  const navigate = useNavigate();

  const [name, setName] = useState('Summer Challenge');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(ninetyDaysStr());
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [preset, setPreset] = useState<Preset>('classic');
  const [rules, setRules] = useState<Rule[]>(() => classicPreset([nanoid(), nanoid(), nanoid(), nanoid()]));
  const [editingRule, setEditingRule] = useState<Rule | null | 'new'>(null);
  const [password, setPassword] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [newMember, setNewMember] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePresetChange(p: Preset) {
    setPreset(p);
    if (p === 'classic') setRules(classicPreset([nanoid(), nanoid(), nanoid(), nanoid()]));
    else if (p === 'minimal') setRules(minimalPreset(nanoid(), 'Daily Action', '✅'));
    else setRules([]);
  }

  function handleRuleSave(saved: Rule) {
    setRules(prev => {
      const idx = prev.findIndex(r => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, { ...saved, order: prev.length }];
    });
    setEditingRule(null);
  }

  function handleRuleDelete(id: string) {
    setRules(prev => prev.filter(r => r.id !== id).map((r, i) => ({ ...r, order: i })));
    setEditingRule(null);
  }

  const addMemberLocal = () => {
    const trimmed = newMember.trim();
    if (!trimmed) return;
    if (memberNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
    setMemberNames(prev => [...prev, trimmed]);
    setNewMember('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Challenge name is required.'); return; }
    if (!password.trim()) { setError('Owner password is required.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }

    setSubmitting(true);
    setError(null);

    try {
      const config: ChallengeConfig = {
        startDate,
        endDate: endDate || null,
        weekAnchor: startDate,
        timezone,
        rules,
      };

      const result = await createChallenge({ name: name.trim(), password, config });

      if (!result.ok) {
        if (result.reason === 'cooldown') {
          const mins = Math.ceil(result.remainingMs / 60000);
          setError(`Please wait ${mins} more minute${mins !== 1 ? 's' : ''} before creating another challenge.`);
        } else {
          setError('Could not generate a unique URL. Please try again.');
        }
        setSubmitting(false);
        return;
      }

      // Add members
      const actor = { memberId: null, isOwner: true };
      for (const mName of memberNames) {
        await addMember(result.challengeId, mName, actor);
      }

      navigate(`/c/${result.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <Sheet>
      <Header>
        <IconBtn onClick={() => navigate(-1)} aria-label="Back">
          <ArrowIcon />
        </IconBtn>
        <div>
          <Eyebrow>New challenge</Eyebrow>
          <H2>Set it up</H2>
        </div>
      </Header>

      <Body>
        {/* Step 1: Name & dates */}
        <Step>
          <StepHeader>
            <StepNum>1</StepNum>
            <H3>Name &amp; dates</H3>
          </StepHeader>
          <Col>
            <Field>
              <Label>Challenge name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Summer Challenge" />
            </Field>
            <Row>
              <Field style={{ flex: 1 }}>
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </Field>
              <Field style={{ flex: 1 }}>
                <Label>End date (optional)</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </Field>
            </Row>
            <Field>
              <Label>Timezone</Label>
              <Input value={timezone} onChange={e => setTimezone(e.target.value)} />
            </Field>
          </Col>
        </Step>

        {/* Step 2: Rules */}
        <Step>
          <StepHeader>
            <StepNum>2</StepNum>
            <H3>Rules</H3>
          </StepHeader>
          <Eyebrow style={{ marginBottom: 8 }}>Start from a preset</Eyebrow>
          <BtnRow>
            {(['classic', 'minimal', 'custom'] as Preset[]).map(p => (
              <Btn key={p} $active={preset === p} onClick={() => handlePresetChange(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Btn>
            ))}
          </BtnRow>
          <HintText style={{ marginTop: 0, marginBottom: 10, textAlign: 'left', fontStyle: 'normal' }}>
            Tap a rule to edit, or add one and use &ldquo;Load example&rdquo; to see what each type looks like.
          </HintText>
          <SectionLbl>Rules · {rules.length}</SectionLbl>
          <Col>
            {rules.map(r => (
              <RuleRow key={r.id} onClick={() => setEditingRule(r)} style={{ cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>
                    {r.emoji ? `${r.emoji} ` : ''}<strong>{r.name}</strong>
                  </div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                    {RULE_KIND_INFO[r.kind].subtitle} · {formatRuleFormula(r)}
                  </div>
                </div>
                <ChevRightIcon />
              </RuleRow>
            ))}
            <DashedBtn onClick={() => setEditingRule('new')}>
              <PlusIcon />
              Add rule
            </DashedBtn>
          </Col>
        </Step>

        {/* Step 3: Password & members */}
        <Step>
          <StepHeader>
            <StepNum>3</StepNum>
            <H3>Owner password &amp; members</H3>
          </StepHeader>
          <Field>
            <Label>Owner password</Label>
            <Input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Pick something memorable"
            />
          </Field>
          <SectionLbl>Members ({memberNames.length})</SectionLbl>
          <Col>
            {memberNames.map((n, i) => (
              <MemberRow key={i}>
                <MemberBadge member={{ name: n }} size="sm" />
                <span style={{ flex: 1, fontSize: 14 }}>{n}</span>
                <SmIconBtn onClick={() => setMemberNames(prev => prev.filter((_, idx) => idx !== i))}>
                  <XIcon />
                </SmIconBtn>
              </MemberRow>
            ))}
            <MemberRow>
              <span
                className="mbadge-placeholder"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${memberTone(newMember || 'X')}30`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, opacity: 0.4, flexShrink: 0,
                }}
              >??</span>
              <GhostInput
                value={newMember}
                onChange={e => setNewMember(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMemberLocal(); } }}
                placeholder="Add a member"
              />
              <Btn onClick={addMemberLocal} disabled={!newMember.trim()} style={{ flex: 'unset', padding: '8px 12px', fontSize: 13 }}>
                Add
              </Btn>
            </MemberRow>
          </Col>
          <HintText>More members can join later via the challenge link.</HintText>
          {error && <ErrMsg>{error}</ErrMsg>}
        </Step>
      </Body>

      <Footer>
        <LgBtn $variant="k" disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'Creating…' : 'Create & share'}
        </LgBtn>
      </Footer>

      {editingRule !== null && (
        <RuleEditor
          rule={editingRule === 'new' ? null : editingRule}
          allRules={rules}
          onSave={handleRuleSave}
          onDelete={editingRule !== 'new' ? () => handleRuleDelete((editingRule as Rule).id) : undefined}
          onClose={() => setEditingRule(null)}
        />
      )}
    </Sheet>
  );
}
