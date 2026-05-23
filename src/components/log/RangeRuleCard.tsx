import type { RangeRule } from '@/types';
import type { EvaluatedRule } from '@/types';
import { resolveRangePoints } from '@/lib/rules/ruleDocs';
import {
  RuleShell, Stepper, StepBtn, StepVal, StepUnit,
  BodySm, Pill, FootRow, InputRow, InputSide,
} from './RuleCard';
import styled from 'styled-components';
import { useDebouncedStepper } from './useDebouncedStepper';

const RangeBand = styled.div`
  position: relative;
  height: 22px;
  display: flex;
  align-items: center;
  flex: 1;
`;

const Scale = styled.div`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => theme.color.hair2};
  position: relative;
`;

const Target = styled.div<{ $left: number; $width: number }>`
  position: absolute;
  top: -7px;
  bottom: -7px;
  left: ${({ $left }) => $left}%;
  width: ${({ $width }) => $width}%;
  background: ${({ theme }) => theme.color.accentTint};
  border-left: 1px dashed ${({ theme }) => theme.color.accent};
  border-right: 1px dashed ${({ theme }) => theme.color.accent};
`;

const Needle = styled.div<{ $left: number }>`
  position: absolute;
  top: -8px;
  bottom: -8px;
  width: 2px;
  background: ${({ theme }) => theme.color.ink};
  left: ${({ $left }) => $left}%;
`;

interface Props {
  rule: RangeRule;
  evaluated: EvaluatedRule | null;
  locked: boolean;
  lockedAt?: string;
  onChange: (value: number) => void;
}

export function RangeRuleCard({ rule, evaluated, locked, lockedAt, onChange }: Props) {
  const serverValue = evaluated?.rawValue as number | null ?? null;
  const { localValue: value, update } = useDebouncedStepper(serverValue, onChange);
  const points = evaluated?.points ?? null;

  // Visual range: extend 25% on each side of target range
  const range = rule.max - rule.min;
  const visMin = Math.max(0, rule.min - range * 0.25);
  const visMax = rule.max + range * 0.25;
  const visTotalRange = visMax - visMin;

  const toPercent = (v: number) => ((v - visMin) / visTotalRange) * 100;
  const targetLeft = toPercent(rule.min);
  const targetRight = toPercent(rule.max);
  const needlePos = value !== null ? toPercent(value) : null;

  const inBand = value !== null && value >= rule.min && value <= rule.max;
  const { atMin, atMax } = resolveRangePoints(rule);
  const bandPtsLabel =
    atMin === atMax
      ? `${atMin} pts in band`
      : `${atMin}→${atMax} pts in band`;

  const step = rule.decimals === 0 ? 1 : Math.pow(10, -rule.decimals);
  const decrement = () => update(Math.round(((value ?? rule.min) - step) * 1e6) / 1e6);
  const increment = () => update(Math.round(((value ?? rule.min) + step) * 1e6) / 1e6);

  return (
    <RuleShell
      rule={rule}
      points={points}
      locked={locked}
      lockedAt={lockedAt}
      footer={
        <FootRow>
          <BodySm>Target band: {rule.min}–{rule.max} {rule.unit} · {bandPtsLabel}</BodySm>
          {value !== null && (
            <Pill $variant={inBand ? 'good' : 'outline'}>{inBand ? 'In band' : 'Out of band'}</Pill>
          )}
        </FootRow>
      }
    >
      <InputRow>
        <Stepper>
          <StepBtn onClick={decrement} disabled={locked}>−</StepBtn>
          <StepVal>
            {value !== null ? value.toFixed(rule.decimals) : '—'}
            <StepUnit>{rule.unit}</StepUnit>
          </StepVal>
          <StepBtn onClick={increment} disabled={locked}>+</StepBtn>
        </Stepper>
        <InputSide style={{ paddingLeft: 12 }}>
          <RangeBand>
            <Scale>
              <Target $left={targetLeft} $width={targetRight - targetLeft} />
              {needlePos !== null && <Needle $left={Math.max(0, Math.min(100, needlePos))} />}
            </Scale>
          </RangeBand>
        </InputSide>
      </InputRow>
    </RuleShell>
  );
}
