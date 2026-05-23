import type { BinaryRule } from '@/types';
import type { BinaryEntryValue } from '@/types';
import type { EvaluatedRule } from '@/types';
import { CheckIcon, XIcon, StarIcon } from '@/components/ui/Icons';
import {
  RuleShell, Choices, Choice, BodySm, Pill, FootRow,
} from './RuleCard';

interface Props {
  rule: BinaryRule;
  evaluated: EvaluatedRule | null;
  locked: boolean;
  lockedAt?: string;
  weekUsed: number;
  freeUsed: number;
  onChange: (value: BinaryEntryValue) => void;
}

export function BinaryRuleCard({ rule, evaluated, locked, lockedAt, weekUsed, freeUsed, onChange }: Props) {
  const value = evaluated?.rawValue as BinaryEntryValue | null ?? null;
  const points = evaluated?.cappedFromWeekly ? 0 : (evaluated?.points ?? null);
  const cap = rule.weeklyCap?.maxScoringDays ?? null;
  const freeTotal = rule.freePasses?.count ?? null;
  const isCapped = evaluated?.cappedFromWeekly ?? false;
  const usedFree = evaluated?.usedFreePass ?? false;

  return (
    <RuleShell
      rule={rule}
      points={points}
      locked={locked}
      lockedAt={lockedAt}
      footer={
        <FootRow>
          <BodySm>
            {cap !== null ? `${weekUsed}/${cap} this week · ` : ''}
            {freeTotal !== null ? `${freeTotal - freeUsed}/${freeTotal} free left` : ''}
          </BodySm>
          {isCapped && <Pill $variant="bad">Weekly cap reached</Pill>}
          {usedFree && !isCapped && <Pill $variant="accent">Free pass used ★</Pill>}
        </FootRow>
      }
    >
      <Choices aria-disabled={locked}>
        <Choice
          $variant={undefined}
          $pressed={value === 'yes'}
          $disabled={locked}
          onClick={() => !locked && onChange('yes')}
        >
          <CheckIcon style={{ width: 14, height: 14, stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }} />
          Yes
        </Choice>
        <Choice
          $variant="bad"
          $pressed={value === 'no'}
          $disabled={locked}
          onClick={() => !locked && onChange('no')}
        >
          <XIcon style={{ width: 14, height: 14, stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }} />
          No
        </Choice>
        <Choice
          $variant="free"
          $pressed={value === 'free'}
          $disabled={locked || (freeTotal !== null && freeUsed >= freeTotal && value !== 'free')}
          onClick={() => !locked && onChange('free')}
        >
          <StarIcon style={{ width: 14, height: 14, stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }} />
          Free
        </Choice>
      </Choices>
    </RuleShell>
  );
}
