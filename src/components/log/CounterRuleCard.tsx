import { useState, useEffect } from 'react';
import type { CounterRule } from '@/types';
import type { EvaluatedRule } from '@/types';
import {
  RuleShell, CounterInput, CounterInputField, StepUnit,
  Bar, BarFill, BodySm, FootRow, InputRow, InputSide,
} from './RuleCard';

interface Props {
  rule: CounterRule;
  evaluated: EvaluatedRule | null;
  locked: boolean;
  lockedAt?: string;
  onChange: (value: number) => void;
}

export function CounterRuleCard({ rule, evaluated, locked, lockedAt, onChange }: Props) {
  const raw = evaluated?.rawValue as number | null ?? null;
  const [inputVal, setInputVal] = useState(raw !== null ? String(raw) : '');

  useEffect(() => {
    setInputVal(raw !== null ? String(raw) : '');
  }, [raw]);

  const pct = raw !== null ? Math.min(1, raw / rule.target) : 0;
  const points = evaluated?.points ?? null;

  const handleBlur = () => {
    const n = parseFloat(inputVal.replace(/[^0-9.]/g, ''));
    if (!isNaN(n) && n !== raw) onChange(n);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value.replace(/[^0-9.]/g, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const n = parseFloat(inputVal.replace(/[^0-9.]/g, ''));
      if (!isNaN(n)) onChange(n);
    }
  };

  return (
    <RuleShell
      rule={rule}
      points={points}
      locked={locked}
      lockedAt={lockedAt}
      footer={
        <FootRow>
          <BodySm>
            {raw !== null
              ? `${raw.toLocaleString()} / ${rule.target.toLocaleString()} ${rule.unit}`
              : `Target ${rule.target.toLocaleString()} ${rule.unit}`}
          </BodySm>
          <BodySm>{Math.round(pct * 100)}%</BodySm>
        </FootRow>
      }
    >
      <InputRow>
        <CounterInput>
          <CounterInputField
            type="text"
            inputMode="decimal"
            value={inputVal}
            placeholder="0"
            disabled={locked}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          <StepUnit>{rule.unit}</StepUnit>
        </CounterInput>
        <InputSide>
          <Bar>
            <BarFill $width={pct * 100} />
          </Bar>
        </InputSide>
      </InputRow>
    </RuleShell>
  );
}
