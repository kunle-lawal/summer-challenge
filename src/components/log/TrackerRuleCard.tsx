import { useState } from 'react';
import type { TrackerRule, Member, TrackerDirection } from '@/types';
import { resolveTrackerConfig } from '@/types/member';
import type { EvaluatedRule } from '@/types';
import styled from 'styled-components';
import {
  RuleShell,
  BodySm, FootRow,
} from './RuleCard';
import { NumericStepper } from './NumericStepper';
import { computeTrackerProgress } from '@/lib/rules/trackerProgress';
import { formatTrackerMemberMeta } from '@/lib/rules/ruleDocs';

const TRACKER_THUMB = '#2563eb';

const TrackerLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ProgressWrap = styled.div`
  width: 100%;
`;

const TrackLine = styled.div`
  position: relative;
  height: 6px;
  background: ${({ theme }) => theme.color.hair2};
  border-radius: ${({ theme }) => theme.radii.pill};
`;

const TrackFill = styled.div<{ $width: number }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${({ $width }) => Math.min(100, Math.max(0, $width))}%;
  background: ${({ theme }) => theme.color.ink};
  border-radius: ${({ theme }) => theme.radii.pill};
  transition: width 0.25s ease;
`;

const TrackMark = styled.div<{ $left: number }>`
  position: absolute;
  top: 50%;
  left: ${({ $left }) => Math.min(100, Math.max(0, $left))}%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${TRACKER_THUMB};
  transform: translate(-50%, -50%);
  z-index: 1;
  transition: left 0.25s ease;
`;

const TrackLabels = styled.div`
  position: relative;
  height: 24px;
  margin-top: 10px;
`;

const EdgeLabel = styled.span<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  ${({ $side }) => ($side === 'left' ? 'left: 0;' : 'right: 0;')}
  font-family: ${({ theme }) => theme.font.body};
  font-size: 11px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
`;

const CurrentLabel = styled.span<{ $left: number; $regressed?: boolean }>`
  position: absolute;
  top: -1px;
  left: ${({ $left }) => Math.min(100, Math.max(0, $left))}%;
  transform: translateX(-50%);
  font-family: ${({ theme }) => theme.font.body};
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme, $regressed }) => ($regressed ? theme.color.bad : theme.color.ink)};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: left 0.25s ease, color 0.15s ease;
`;

const SetupForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 0 4px;
`;

const SetupIntro = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.ink2};
  line-height: 1.45;
  margin: 0;
`;

const SetupRow = styled.div`
  display: flex;
  gap: 8px;
  & > * { flex: 1; }
`;

const SetupLabel = styled.label`
  font-family: ${({ theme }) => theme.font.body};
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

export interface TrackerGoalInput {
  ruleId: string;
  label: string;
  unit: string;
  startVal: number;
  goalVal: number;
  direction: TrackerDirection;
}

interface Props {
  rule: TrackerRule;
  member: Member;
  evaluated: EvaluatedRule | null;
  locked: boolean;
  lockedAt?: string;
  onChange: (value: number) => void;
  onSetGoal?: (config: TrackerGoalInput) => Promise<void>;
}

function fmtVal(n: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(n)) : n.toFixed(decimals);
}

export function TrackerRuleCard({ rule, member, evaluated, locked, lockedAt, onChange, onSetGoal }: Props) {
  const rawConfig = member.trackerConfig?.ruleId === rule.id ? member.trackerConfig : null;
  const config = rawConfig
    ? resolveTrackerConfig(rawConfig, rule.unit, rule.name)
    : null;

  const value = evaluated?.rawValue as number | null ?? null;
  const points = evaluated?.points ?? null;

  const [labelInput, setLabelInput] = useState('');
  const [unitInput, setUnitInput] = useState(rule.unit);
  const [startInput, setStartInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [direction, setDirection] = useState<TrackerDirection>('down');
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const serverValue = value ?? (config ? config.startVal : null);
  const startVal = config?.startVal ?? 0;
  const goalVal = config?.goalVal ?? 0;
  const configDir = config?.direction ?? 'down';
  const memberUnit = config?.unit ?? rule.unit;
  const [displayValue, setDisplayValue] = useState<number | null>(serverValue);

  const trackerProgress = config && displayValue !== null
    ? computeTrackerProgress(
        { startVal, goalVal, direction: configDir },
        displayValue,
      )
    : null;
  const progressPct = trackerProgress?.barPct ?? 0;
  const remaining = trackerProgress?.remainingToGoal ?? null;
  const regressed = trackerProgress?.regressed ?? false;

  const step = rule.decimals === 0 ? 1 : Math.pow(10, -rule.decimals);

  if (!config) {
    const startNum = parseFloat(startInput);
    const goalNum = parseFloat(goalInput);
    const labelTrim = labelInput.trim();
    const unitTrim = unitInput.trim() || rule.unit;
    const canSave =
      labelTrim.length > 0 &&
      !isNaN(startNum) &&
      !isNaN(goalNum) &&
      startNum !== goalNum &&
      !!onSetGoal;

    const handleSetGoal = async () => {
      if (!canSave) return;
      setSetupError(null);
      setSaving(true);
      try {
        await onSetGoal!({
          ruleId: rule.id,
          label: labelTrim,
          unit: unitTrim,
          startVal: startNum,
          goalVal: goalNum,
          direction,
        });
      } catch {
        setSetupError('Could not save goal. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <RuleShell
        rule={rule}
        points={0}
        locked={false}
        footer={
          <FootRow>
            <BodySm>Locks in once saved — ask the owner if you need to change it later.</BodySm>
          </FootRow>
        }
      >
        <SetupForm>
          <SetupIntro>
            What do you want to track? Pick a direction and set your starting and goal values.
          </SetupIntro>
          <FieldBlock>
            <SetupLabel htmlFor={`tracker-label-${rule.id}`}>What are you tracking?</SetupLabel>
            <SetupInput
              id={`tracker-label-${rule.id}`}
              type="text"
              placeholder="e.g. Weight loss, Squat PR, Waist"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
            />
          </FieldBlock>
          <SetupRow>
            <FieldBlock>
              <SetupLabel htmlFor={`tracker-unit-${rule.id}`}>Unit</SetupLabel>
              <SetupInput
                id={`tracker-unit-${rule.id}`}
                type="text"
                placeholder={rule.unit}
                value={unitInput}
                onChange={e => setUnitInput(e.target.value)}
              />
            </FieldBlock>
            <FieldBlock>
              <SetupLabel htmlFor={`tracker-start-${rule.id}`}>Starting value</SetupLabel>
              <SetupInput
                id={`tracker-start-${rule.id}`}
                type="number"
                step={step}
                placeholder="e.g. 190"
                value={startInput}
                onChange={e => setStartInput(e.target.value)}
              />
            </FieldBlock>
            <FieldBlock>
              <SetupLabel htmlFor={`tracker-goal-${rule.id}`}>Goal value</SetupLabel>
              <SetupInput
                id={`tracker-goal-${rule.id}`}
                type="number"
                step={step}
                placeholder="e.g. 170"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
              />
            </FieldBlock>
          </SetupRow>
          <FieldBlock>
            <SetupLabel>Direction</SetupLabel>
            <SetupRow>
              <DirBtn type="button" $active={direction === 'down'} onClick={() => setDirection('down')}>
                ↓ Decreasing
                <span style={{ display: 'block', fontSize: 10, opacity: 0.65, marginTop: 2 }}>loss, time, measurements</span>
              </DirBtn>
              <DirBtn type="button" $active={direction === 'up'} onClick={() => setDirection('up')}>
                ↑ Increasing
                <span style={{ display: 'block', fontSize: 10, opacity: 0.65, marginTop: 2 }}>strength, mass, reps</span>
              </DirBtn>
            </SetupRow>
          </FieldBlock>
          {setupError && <ErrTxt>{setupError}</ErrTxt>}
          {onSetGoal ? (
            <SetupBtn type="button" onClick={handleSetGoal} disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Set my goal'}
            </SetupBtn>
          ) : (
            <BodySm>Pick a member to set your goal.</BodySm>
          )}
        </SetupForm>
      </RuleShell>
    );
  }

  const metaLine = formatTrackerMemberMeta(config, rule);

  return (
    <RuleShell
      rule={rule}
      metaLine={metaLine}
      points={points}
      locked={locked}
      lockedAt={lockedAt}
      footer={
        <FootRow>
          <BodySm>
            {remaining !== null
              ? `${remaining.toFixed(rule.decimals)} ${memberUnit} ${configDir === 'down' ? 'to lose' : 'to gain'}`
              : ''}
            {regressed
              ? configDir === 'down'
                ? ' · above start'
                : ' · below start'
              : ''}
            {' · '}{Math.round(progressPct)}% there
          </BodySm>
        </FootRow>
      }
    >
      <TrackerLayout>
        <NumericStepper
          serverValue={serverValue}
          onChange={onChange}
          onLocalChange={setDisplayValue}
          decimals={rule.decimals}
          unit={memberUnit}
          locked={locked}
          stepBase={startVal}
        />

        <ProgressWrap>
          <TrackLine>
            <TrackFill $width={progressPct} />
            <TrackMark $left={progressPct} />
          </TrackLine>
          <TrackLabels>
            <EdgeLabel $side="left">{fmtVal(startVal, rule.decimals)}</EdgeLabel>
            <CurrentLabel $left={progressPct} $regressed={regressed}>
              {displayValue !== null ? fmtVal(displayValue, rule.decimals) : '—'}
            </CurrentLabel>
            <EdgeLabel $side="right">{fmtVal(goalVal, rule.decimals)}</EdgeLabel>
          </TrackLabels>
        </ProgressWrap>
      </TrackerLayout>
    </RuleShell>
  );
}

const FieldBlock = styled.div``;
