import { useState } from 'react';
import type { TrackerRule, Member, TrackerDirection } from '@/types';
import { useDebouncedStepper } from './useDebouncedStepper';
import type { EvaluatedRule } from '@/types';
import styled from 'styled-components';
import {
  RuleShell, Stepper, StepBtn, StepVal, StepUnit,
  BodySm, FootRow, InputRow, InputSide,
} from './RuleCard';

const TrackLine = styled.div`
  position: relative;
  height: 4px;
  background: ${({ theme }) => theme.color.bg2};
  border-radius: ${({ theme }) => theme.radii.pill};
  margin: 8px 0 4px;
`;

const TrackFill = styled.div<{ $width: number }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${({ $width }) => Math.min(100, $width)}%;
  background: ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radii.pill};
`;

const TrackMark = styled.div<{ $left: number }>`
  position: absolute;
  top: 50%;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  border: 2px solid ${({ theme }) => theme.color.surface};
  transform: translate(-50%, -50%);
  left: ${({ $left }) => Math.min(100, $left)}%;
`;

const TrackLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const MidVal = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 13px;
  color: ${({ theme }) => theme.color.ink};
  text-transform: none;
  letter-spacing: 0;
`;

// ── Setup form styles ──────────────────────────────────────────────────────────

const SetupForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 0 4px;
`;

const SetupRow = styled.div`
  display: flex;
  gap: 8px;
  & > * { flex: 1; }
`;

const SetupLabel = styled.label`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  display: block;
  margin-bottom: 4px;
`;

const SetupInput = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.color.hair2};
  background: ${({ theme }) => theme.color.surface};
  font: 400 14px/1 ${({ theme }) => theme.font.body};
  color: ${({ theme }) => theme.color.ink};
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.color.ink}; }
`;

const DirBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  flex: 1;
  padding: 8px 6px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $active, theme }) => $active ? theme.color.ink : theme.color.hair2};
  background: ${({ $active, theme }) => $active ? theme.color.ink : theme.color.surface};
  color: ${({ $active, theme }) => $active ? theme.color.surface : theme.color.ink2};
  font: 500 12.5px/1.2 ${({ theme }) => theme.font.body};
  cursor: pointer;
  text-align: center;
`;

const SetupBtn = styled.button`
  appearance: none;
  width: 100%;
  padding: 11px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.ink};
  background: ${({ theme }) => theme.color.ink};
  color: ${({ theme }) => theme.color.surface};
  font: 500 14px/1 ${({ theme }) => theme.font.body};
  cursor: pointer;
  margin-top: 2px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ErrTxt = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.bad};
`;

interface Props {
  rule: TrackerRule;
  member: Member;
  evaluated: EvaluatedRule | null;
  locked: boolean;
  lockedAt?: string;
  onChange: (value: number) => void;
  onSetGoal?: (config: { ruleId: string; startVal: number; goalVal: number; direction: TrackerDirection }) => Promise<void>;
}

export function TrackerRuleCard({ rule, member, evaluated, locked, lockedAt, onChange, onSetGoal }: Props) {
  const config = member.trackerConfig;
  const value = evaluated?.rawValue as number | null ?? null;
  const points = evaluated?.points ?? null;

  // Setup form state (shown when no config yet)
  const [startInput, setStartInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [direction, setDirection] = useState<TrackerDirection>('down');
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const serverValue = value ?? (config ? config.startVal : null);
  const { localValue: displayValue, update } = useDebouncedStepper(serverValue, onChange);

  const startVal = config?.startVal ?? 0;
  const goalVal = config?.goalVal ?? 0;
  const configDir = config?.direction ?? 'down';

  const total = Math.abs(goalVal - startVal);
  const done = total > 0 && displayValue !== null
    ? Math.min(1, Math.abs(displayValue - startVal) / total)
    : 0;
  const remaining = displayValue !== null ? Math.abs(goalVal - displayValue) : null;

  const step = rule.decimals === 0 ? 1 : Math.pow(10, -rule.decimals);
  const decrement = () => update(Math.round(((displayValue ?? startVal) - step) * 1e6) / 1e6);
  const increment = () => update(Math.round(((displayValue ?? startVal) + step) * 1e6) / 1e6);

  if (!config) {
    const startNum = parseFloat(startInput);
    const goalNum = parseFloat(goalInput);
    const canSave = !isNaN(startNum) && !isNaN(goalNum) && startNum !== goalNum && onSetGoal;

    const handleSetGoal = async () => {
      if (!canSave) return;
      setSetupError(null);
      setSaving(true);
      try {
        await onSetGoal!({ ruleId: rule.id, startVal: startNum, goalVal: goalNum, direction });
      } catch {
        setSetupError('Could not save goal. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <RuleShell rule={rule} points={0} locked={false} footer={
        <FootRow>
          <BodySm>Set once — your goal locks in and can't be changed later.</BodySm>
        </FootRow>
      }>
        <SetupForm>
          <SetupRow>
            <div>
              <SetupLabel>Starting {rule.unit}</SetupLabel>
              <SetupInput
                type="number"
                step={step}
                placeholder="e.g. 185"
                value={startInput}
                onChange={e => setStartInput(e.target.value)}
              />
            </div>
            <div>
              <SetupLabel>Goal {rule.unit}</SetupLabel>
              <SetupInput
                type="number"
                step={step}
                placeholder="e.g. 170"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
              />
            </div>
          </SetupRow>
          <div>
            <SetupLabel>Direction</SetupLabel>
            <SetupRow>
              <DirBtn $active={direction === 'down'} onClick={() => setDirection('down')}>
                ↓ Decreasing
                <span style={{ display: 'block', fontSize: 10, opacity: 0.65, marginTop: 2 }}>weight, time</span>
              </DirBtn>
              <DirBtn $active={direction === 'up'} onClick={() => setDirection('up')}>
                ↑ Increasing
                <span style={{ display: 'block', fontSize: 10, opacity: 0.65, marginTop: 2 }}>reps, distance</span>
              </DirBtn>
            </SetupRow>
          </div>
          {setupError && <ErrTxt>{setupError}</ErrTxt>}
          {onSetGoal ? (
            <SetupBtn onClick={handleSetGoal} disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Set goal'}
            </SetupBtn>
          ) : (
            <BodySm>Log in as a member to set your goal.</BodySm>
          )}
        </SetupForm>
      </RuleShell>
    );
  }

  return (
    <RuleShell
      rule={rule}
      points={points}
      locked={locked}
      lockedAt={lockedAt}
      footer={
        <FootRow>
          <BodySm>
            {remaining !== null ? `${remaining.toFixed(rule.decimals)} ${rule.unit} ${configDir === 'down' ? 'to lose' : 'to gain'}` : ''}
            {' · '}{Math.round(done * 100)}% there
          </BodySm>
        </FootRow>
      }
    >
      <InputRow>
        <Stepper>
          <StepBtn onClick={decrement} disabled={locked}>−</StepBtn>
          <StepVal>
            {displayValue !== null ? displayValue.toFixed(rule.decimals) : '—'}
            <StepUnit>{rule.unit}</StepUnit>
          </StepVal>
          <StepBtn onClick={increment} disabled={locked}>+</StepBtn>
        </Stepper>
        <InputSide style={{ flexDirection: 'column', gap: 0, paddingLeft: 4 }}>
          <TrackLine>
            <TrackFill $width={done * 100} />
            <TrackMark $left={done * 100} />
          </TrackLine>
          <TrackLabels>
            <span>{startVal}</span>
            <MidVal>{displayValue ?? '—'}</MidVal>
            <span>{goalVal}</span>
          </TrackLabels>
        </InputSide>
      </InputRow>
    </RuleShell>
  );
}
