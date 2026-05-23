import type { PenaltyRule } from '@/types';
import type { PenaltyEntryValue } from '@/types';
import type { EvaluatedRule } from '@/types';
import { CheckIcon, StarIcon } from '@/components/ui/Icons';
import {
  RuleShell, Choices, Choice, BodySm, Pill, FootRow,
} from './RuleCard';

interface Props {
  rule: PenaltyRule;
  evaluated: EvaluatedRule | null;
  locked: boolean;
  lockedAt?: string;
  freeUsed: number;
  weekInfractions: number;
  onChange: (value: PenaltyEntryValue) => void;
}

export function PenaltyRuleCard({ rule, evaluated, locked, lockedAt, freeUsed, weekInfractions, onChange }: Props) {
  const value = evaluated?.rawValue as PenaltyEntryValue | null ?? null;
  const points = evaluated?.points ?? null;
  const waived = evaluated?.waivedFromPenalty ?? false;
  const usedFree = evaluated?.usedFreePass ?? false;
  const freeTotal = rule.freePasses?.count ?? null;

  const displayPoints = waived ? 0 : points;

  return (
    <RuleShell
      rule={rule}
      points={displayPoints}
      locked={locked}
      lockedAt={lockedAt}
      footer={
        <FootRow>
          {waived && value === 'infraction' ? (
            <Pill $variant="outline">First slip/week — scored 0</Pill>
          ) : (
            <BodySm>
              {freeTotal !== null ? `${freeTotal - freeUsed}/${freeTotal} free left` : ''}
              {rule.weeklyFirstWaived && ' · 1st slip/week waived'}
            </BodySm>
          )}
          {usedFree && <Pill $variant="accent">Free pass used ★</Pill>}
          {!waived && weekInfractions === 0 && value === null && (
            <BodySm>1st slip this week = 0 pts</BodySm>
          )}
        </FootRow>
      }
    >
      <Choices aria-disabled={locked}>
        <Choice
          $variant={undefined}
          $pressed={value === 'clean'}
          $disabled={locked}
          onClick={() => !locked && onChange('clean')}
        >
          <CheckIcon style={{ width: 14, height: 14, stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }} />
          Clean
        </Choice>
        <Choice
          $variant="bad"
          $pressed={value === 'infraction'}
          $disabled={locked}
          onClick={() => !locked && onChange('infraction')}
        >
          Slipped
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
