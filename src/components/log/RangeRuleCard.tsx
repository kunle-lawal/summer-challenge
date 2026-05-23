import { useState } from 'react';
import type { RangeRule } from '@/types';
import type { EvaluatedRule } from '@/types';
import { resolveRangePoints } from '@/lib/rules/ruleDocs';
import {
  RuleShell,
  BodySm, Pill, FootRow, InputRow, InputSide,
} from './RuleCard';
import { NumericStepper } from './NumericStepper';
import styled from 'styled-components';

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
  const [displayValue, setDisplayValue] = useState<number | null>(serverValue);
  const points = evaluated?.points ?? null;

  const range = rule.max - rule.min;
  const visMin = Math.max(0, rule.min - range * 0.25);
  const visMax = rule.max + range * 0.25;
  const visTotalRange = visMax - visMin;

  const toPercent = (v: number) => ((v - visMin) / visTotalRange) * 100;
  const targetLeft = toPercent(rule.min);
  const targetRight = toPercent(rule.max);
  const needlePos = displayValue !== null ? toPercent(displayValue) : null;

  const inBand = displayValue !== null && displayValue >= rule.min && displayValue <= rule.max;
  const { atMin, atMax } = resolveRangePoints(rule);
  const bandPtsLabel =
    atMin === atMax
      ? `${atMin} pts in band`
      : `${atMin}→${atMax} pts in band`;

  return (
    <RuleShell
      rule={rule}
      points={points}
      locked={locked}
      lockedAt={lockedAt}
      footer={
        <FootRow>
          <BodySm>Target band: {rule.min}–{rule.max} {rule.unit} · {bandPtsLabel}</BodySm>
          {displayValue !== null && (
            <Pill $variant={inBand ? 'good' : 'outline'}>{inBand ? 'In band' : 'Out of band'}</Pill>
          )}
        </FootRow>
      }
    >
      <InputRow>
        <NumericStepper
          serverValue={serverValue}
          onChange={onChange}
          onLocalChange={setDisplayValue}
          decimals={rule.decimals}
          unit={rule.unit}
          locked={locked}
          stepBase={rule.min}
        />
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
