import styled from 'styled-components';
import type { EvaluatedRule, RawEntryValue, Rule } from '@/types';
import type { FreePassState } from '@/lib/rules/kinds';
import { formatPoints } from '@/lib/rules/display';
import { Icon } from '@/components/ui/Icons';
import { Chip, Chips, Choice, Choices, Input, Meta, Pill } from '@/components/ui/primitives';

/**
 * The input for one rule, and the free-pass control that sits beneath it.
 *
 * The prototype hardcodes an input per rule id. These are per *kind*, and take
 * their unit, decimals and bounds from the rule itself.
 */

// ---------------------------------------------------------------------------
// Free pass
// ---------------------------------------------------------------------------

const FreePass = styled.button`
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font-weight: 600;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s, border-color 0.16s, color 0.16s;

  > .t { flex: 1; min-width: 0; }
  > .t small {
    display: block;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.ink2};
  }

  svg { width: 18px; height: 18px; flex: 0 0 auto; color: ${({ theme }) => theme.color.gold}; }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surface2};
    border-color: ${({ theme }) => theme.color.hair2};
  }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.color.ink};
    border-color: ${({ theme }) => theme.color.ink};
    color: ${({ theme }) => theme.color.onInk};
    svg { color: ${({ theme }) => theme.color.goldOnInk}; }
    > .t small { color: ${({ theme }) => theme.color.onInk2}; }
  }

  &:disabled {
    background: ${({ theme }) => theme.color.hair3};
    border-color: ${({ theme }) => theme.color.hair};
    color: ${({ theme }) => theme.color.ink3};
    cursor: not-allowed;
    svg { color: ${({ theme }) => theme.color.ink4}; }
  }
`;

interface FreePassControlProps {
  state: FreePassState;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * Kept out of the main choice row on purpose: spending a pass is a rescue, not
 * a peer of actually doing the thing. The balance rides on the control so it's
 * readable at the moment of the decision.
 */
export function FreePassControl({ state, selected, onSelect, disabled }: FreePassControlProps) {
  if (!state.offered) return null;

  const exhausted = state.left <= 0 && !selected;

  return (
    <FreePass
      type="button"
      aria-pressed={selected}
      disabled={disabled || exhausted}
      onClick={onSelect}
    >
      <Icon name="star" />
      <span className="t">
        {selected ? 'Free pass used' : exhausted ? 'No free passes left' : 'Use a free pass'}
        <small>
          {exhausted ? `All ${state.quota} used` : `${state.left} of ${state.quota} left`}
        </small>
      </span>
    </FreePass>
  );
}

// ---------------------------------------------------------------------------
// Points preview
// ---------------------------------------------------------------------------

export function PointsPreview({ rule, evaluated }: { rule: Rule; evaluated: EvaluatedRule | undefined }) {
  if (!evaluated || evaluated.rawValue === null || evaluated.rawValue === undefined) {
    return <Meta>Nothing logged yet</Meta>;
  }

  const { points } = evaluated;
  const notes: string[] = [];
  if (evaluated.cappedFromWeekly) notes.push('weekly cap reached');
  if (evaluated.waivedFromPenalty) notes.push('first slip this week — waived');
  if (evaluated.usedFreePass) notes.push('free pass');

  const label = rule.kind === 'tracker'
    ? `${points.toFixed(1)} of ${rule.maxPoints} goal points`
    : `${formatPoints(points)} points`;

  return (
    <PreviewRow>
      <Pill $tone={points > 0 ? 'good' : points < 0 ? 'plain' : 'plain'}>{label}</Pill>
      {notes.length > 0 && <Meta>{notes.join(' · ')}</Meta>}
    </PreviewRow>
  );
}

const PreviewRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const Inline = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/** Quick values around the target — always exact multiples, never odd numbers. */
function quickValues(target: number, decimals: number): number[] {
  const raw = [0.5, 0.75, 1, 1.25].map(f => target * f);
  const round = (n: number) => {
    if (decimals > 0) return Number(n.toFixed(decimals));
    if (n >= 1000) return Math.round(n / 100) * 100;
    if (n >= 100) return Math.round(n / 10) * 10;
    return Math.round(n);
  };
  return [...new Set(raw.map(round))];
}

interface RuleInputProps {
  rule: Rule;
  value: RawEntryValue | undefined;
  onChange: (value: RawEntryValue | undefined) => void;
  freePass: FreePassState;
  /** Binds the control to its visible label. */
  inputId: string;
  labelId?: string;
  disabled?: boolean;
  /** Hides quick-value chips where space is tight. */
  compact?: boolean;
}

export function RuleInput({
  rule, value, onChange, freePass, inputId, labelId, disabled, compact,
}: RuleInputProps) {
  const named = labelId ? { 'aria-labelledby': labelId } : {};

  if (rule.kind === 'binary' || rule.kind === 'penalty') {
    const opts = rule.kind === 'binary'
      ? [
          { v: 'yes' as const, t: 'Yes', s: `${formatPoints(rule.pointsYes)} points` },
          { v: 'no' as const, t: 'No', s: rule.pointsNo === 0 ? 'No points' : `${formatPoints(rule.pointsNo)} points` },
        ]
      : [
          { v: 'clean' as const, t: 'Clean', s: rule.pointsClean === 0 ? 'No change' : `${formatPoints(rule.pointsClean)} points` },
          {
            v: 'infraction' as const,
            t: 'Slipped',
            s: rule.weeklyFirstWaived ? 'First this week is waived' : `${formatPoints(rule.pointsPerInfraction)} points`,
          },
        ];

    return (
      <Stack>
        <Choices role="group" {...named}>
          {opts.map(o => (
            <Choice
              key={o.v}
              type="button"
              aria-pressed={value === o.v}
              disabled={disabled}
              onClick={() => onChange(o.v)}
            >
              {o.t}
              <small>{o.s}</small>
            </Choice>
          ))}
        </Choices>
        <FreePassControl
          state={freePass}
          selected={value === 'free'}
          disabled={disabled}
          onSelect={() => onChange(value === 'free' ? undefined : 'free')}
        />
      </Stack>
    );
  }

  if (rule.kind === 'streak') return null;

  const numeric = typeof value === 'number' ? value : '';
  const setNumber = (raw: string) => onChange(raw === '' ? undefined : Number(raw));
  const step = rule.decimals > 0 ? String(10 ** -rule.decimals) : '1';

  if (rule.kind === 'counter') {
    return (
      <Stack>
        <Inline>
          <Input
            id={inputId}
            $w="md"
            type="number"
            inputMode={rule.decimals > 0 ? 'decimal' : 'numeric'}
            min={0}
            step={step}
            value={numeric}
            disabled={disabled}
            onChange={e => setNumber(e.target.value)}
            {...named}
          />
          {rule.unit && <Meta>{rule.unit}</Meta>}
        </Inline>
        {!compact && (
          <Chips>
            {quickValues(rule.target, rule.decimals).map(n => (
              <Chip
                key={n}
                type="button"
                aria-pressed={value === n}
                disabled={disabled}
                onClick={() => onChange(n)}
              >
                {n.toLocaleString('en-US')}
              </Chip>
            ))}
          </Chips>
        )}
      </Stack>
    );
  }

  // range + tracker: a single measurement with its unit beside it.
  return (
    <Inline>
      <Input
        id={inputId}
        $w="sm"
        type="number"
        inputMode={rule.decimals > 0 ? 'decimal' : 'numeric'}
        step={step}
        {...(rule.kind === 'range' ? { min: 0 } : {})}
        value={numeric}
        disabled={disabled}
        onChange={e => setNumber(e.target.value)}
        {...named}
      />
      {rule.unit && <Meta>{rule.unit}</Meta>}
    </Inline>
  );
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** The visible label above the input. Says what to enter, never a placeholder. */
export function promptFor(rule: Rule): string {
  switch (rule.kind) {
    case 'binary': return 'Did you do it today?';
    case 'penalty': return 'How did today go?';
    case 'counter': return rule.unit ? `${rule.name} (${rule.unit})` : rule.name;
    case 'range': return rule.unit ? `${rule.name} (${rule.unit})` : rule.name;
    case 'tracker': return 'Today’s reading';
    case 'streak': return rule.name;
  }
}

/** Extra guidance under the input, when the rule has a quirk worth stating. */
export function hintFor(rule: Rule): string | null {
  switch (rule.kind) {
    case 'range':
      return `Anything from ${rule.min} to ${rule.max} ${rule.unit} scores. Outside that range scores ${
        rule.pointsOutside === 0 ? 'nothing — it is never a penalty' : `${formatPoints(rule.pointsOutside)} points`
      }.`;
    case 'counter':
      return `Points scale with the count — half of ${rule.target.toLocaleString()} earns half the points.`;
    case 'penalty':
      // The waiver is already stated on the Slipped choice — §6, every value
      // appears exactly once.
      return null;
    default:
      return null;
  }
}
