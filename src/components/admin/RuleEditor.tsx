import { useState } from 'react';
import { nanoid } from 'nanoid';
import styled from 'styled-components';
import {
  RULE_KINDS, type Rule, type RuleKind,
} from '@/types';
import {
  RULE_KIND_INFO, defaultForKind, exampleRuleForKind, normalizeRuleForEdit,
} from '@/lib/rules/ruleDocs';
import { FootBar, Sheet, TopBar } from '@/components/layout/Screen';
import { Icon } from '@/components/ui/Icons';
import {
  Button, Card, Choice, Choices, ErrorText, Field, Hint, IconButton, Input, Label, LinkButton,
  Meta, Name, Note, Select, Switch, riseAnim,
} from '@/components/ui/primitives';

/**
 * Create or edit one rule.
 *
 * A full-screen surface rather than a dialog: there are up to seven fields and
 * a type picker, which is more than a bottom sheet can hold without becoming a
 * modal with extra steps (§8).
 */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 70;
  background: ${({ theme }) => theme.color.bg};
  display: flex;
  flex-direction: column;
  max-width: ${({ theme }) => theme.size.contentMax};
  margin: 0 auto;
  animation: ${riseAnim} 0.24s ${({ theme }) => theme.ease.out};
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const Grid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  gap: 8px;
`;

const KindCard = styled.button`
  min-height: 62px;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  padding: 4px;
  transition: background 0.16s, border-color 0.16s, color 0.16s;

  span {
    font-size: 10px;
    line-height: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.ink2};
    white-space: nowrap;
  }

  &:hover { background: ${({ theme }) => theme.color.surface2}; border-color: ${({ theme }) => theme.color.hair2}; }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.color.ink};
    border-color: ${({ theme }) => theme.color.ink};
    color: ${({ theme }) => theme.color.onInk};
    span { color: ${({ theme }) => theme.color.onInk2}; }
  }
`;

const ToggleCard = styled(Card)`
  padding: 8px 14px;

  > .row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 56px;
  }
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

// ---------------------------------------------------------------------------

interface NumFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
  min?: number;
}

function NumField({ id, label, value, onChange, step = '1', min }: NumFieldProps) {
  return (
    <Field>
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        {...(min !== undefined ? { min } : {})}
        value={Number.isFinite(value) ? value : 0}
        onChange={e => {
          const n = parseFloat(e.target.value);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
      />
    </Field>
  );
}

interface Props {
  /** The rule being edited, or null to create one. */
  rule: Rule | null;
  /** Every rule in the challenge — the streak picker needs them. */
  allRules: Rule[];
  onSave: (rule: Rule) => void;
  /** Omit to hide the delete action. */
  onDelete?: () => void;
  onClose: () => void;
  /** True when the challenge is already running, which changes the warning. */
  live?: boolean;
}

export function RuleEditor({ rule, allRules, onSave, onDelete, onClose, live }: Props) {
  const isNew = rule === null;
  const [draft, setDraft] = useState<Rule>(() =>
    normalizeRuleForEdit(rule ?? defaultForKind('binary', nanoid(), allRules.length)),
  );
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (field: string, value: any) => {
    setDraft(d => ({ ...d, [field]: value }) as Rule);
    setError(null);
  };

  const changeKind = (k: RuleKind) => {
    // Only offered while creating: switching kind on a live rule would orphan
    // every value already logged against it.
    setDraft(defaultForKind(k, draft.id, draft.order));
    setError(null);
  };

  const loadExample = () => {
    const ref =
      allRules.find(r => r.kind === 'binary' && r.id !== draft.id)?.id ??
      allRules.find(r => r.id !== draft.id && r.kind !== 'streak')?.id ??
      '';
    setDraft(exampleRuleForKind(draft.kind, draft.id, draft.order, ref));
    setError(null);
  };

  const trackable = allRules.filter(r => r.id !== draft.id && r.kind !== 'streak');
  const watched = draft.kind === 'streak' ? allRules.find(r => r.id === draft.ruleRef) : undefined;
  const watchedIsCounter = watched?.kind === 'counter';
  const watchedIsCapped = watched?.kind === 'binary' && !!watched.weeklyCap;

  const save = () => {
    const name = draft.name.trim();
    if (!name) {
      setError('Give the rule a name so people know what they’re logging.');
      return;
    }
    if (draft.kind === 'streak' && !draft.ruleRef) {
      setError('Pick which rule this streak watches.');
      return;
    }
    if (draft.kind === 'range' && draft.min >= draft.max) {
      setError(`The top of the band must be above the bottom — right now it's ${draft.min} to ${draft.max}.`);
      return;
    }
    if (draft.kind === 'counter' && draft.target <= 0) {
      setError('The target needs to be above zero, or nothing can score.');
      return;
    }
    onSave({ ...draft, name });
  };

  const fields = () => {
    switch (draft.kind) {
      case 'binary':
        return (
          <>
            <Label>Scoring</Label>
            <Grid $cols={3}>
              <NumField id="r-yes" label="Yes" value={draft.pointsYes} step="0.5" onChange={n => set('pointsYes', n)} />
              <NumField id="r-no" label="No" value={draft.pointsNo} step="0.5" onChange={n => set('pointsNo', n)} />
              <NumField id="r-free" label="Free" value={draft.pointsFree} step="0.5" onChange={n => set('pointsFree', n)} />
            </Grid>

            <Label>Limits</Label>
            <Grid $cols={2}>
              <NumField
                id="r-cap"
                label="Weekly cap"
                min={0}
                value={draft.weeklyCap?.maxScoringDays ?? 0}
                onChange={n => set('weeklyCap', n > 0 ? { maxScoringDays: n } : null)}
              />
              <NumField
                id="r-passes"
                label="Free passes"
                min={0}
                value={draft.freePasses?.count ?? 0}
                onChange={n => set('freePasses', n > 0 ? { count: n, lifetime: true } : null)}
              />
            </Grid>
            <Hint>
              Zero turns a limit off. Free passes score like a yes and come from one pot for the
              whole challenge.
            </Hint>
          </>
        );

      case 'counter': {
        const overflow = draft.overflow ?? 'cap';
        return (
          <>
            <Label>Scoring</Label>
            <Grid $cols={2}>
              <NumField id="r-target" label="Target" min={0} step="1" value={draft.target} onChange={n => set('target', n)} />
              <NumField id="r-max" label="Points at target" step="0.5" value={draft.maxPoints} onChange={n => set('maxPoints', n)} />
            </Grid>
            <Grid $cols={2}>
              <Field>
                <label htmlFor="r-unit">Unit</label>
                <Input id="r-unit" $text value={draft.unit} onChange={e => set('unit', e.target.value)} />
              </Field>
              <NumField id="r-dec" label="Decimals" min={0} value={draft.decimals} onChange={n => set('decimals', Math.max(0, Math.round(n)))} />
            </Grid>

            <Label>Beating the target</Label>
            <Choices role="group" aria-label="Beating the target">
              <Choice type="button" aria-pressed={overflow === 'cap'} onClick={() => set('overflow', 'cap')}>
                Stops there
                <small>Target is the most</small>
              </Choice>
              <Choice type="button" aria-pressed={overflow === 'linear'} onClick={() => set('overflow', 'linear')}>
                Keeps paying
                <small>Double it, double the points</small>
              </Choice>
            </Choices>

            {overflow === 'linear' && (
              <>
                <NumField
                  id="r-daily-max"
                  label="Most in one day (0 for no limit)"
                  min={0}
                  step="0.5"
                  value={draft.dailyMax ?? 0}
                  onChange={n => set('dailyMax', n > 0 ? n : null)}
                />
                {draft.dailyMax == null ? (
                  <ErrorText role="alert">
                    With no limit, one enormous day can outscore a whole week of everyone else.
                    That may be exactly what you want — just know it before you start.
                  </ErrorText>
                ) : (
                  <Hint>
                    {(draft.dailyMax / draft.maxPoints).toFixed(1)}× the target is the most a
                    single day can earn.
                  </Hint>
                )}
              </>
            )}

            <Hint>
              {overflow === 'linear'
                ? `Every ${draft.target.toLocaleString()} ${draft.unit} is worth ${draft.maxPoints} points, however many you do.`
                : 'Points scale up to the target and stop — half the target earns half the points.'}
            </Hint>
          </>
        );
      }

      case 'range':
        return (
          <>
            <Label>Target band</Label>
            <Grid $cols={2}>
              <NumField id="r-min" label="From" step="0.5" value={draft.min} onChange={n => set('min', n)} />
              <NumField id="r-max2" label="To" step="0.5" value={draft.max} onChange={n => set('max', n)} />
            </Grid>
            <Label>Scoring</Label>
            <Grid $cols={3}>
              <NumField id="r-atmin" label="At bottom" step="0.5" value={draft.pointsAtMin} onChange={n => set('pointsAtMin', n)} />
              <NumField id="r-atmax" label="At top" step="0.5" value={draft.pointsAtMax} onChange={n => set('pointsAtMax', n)} />
              <NumField id="r-out" label="Outside" step="0.5" value={draft.pointsOutside} onChange={n => set('pointsOutside', n)} />
            </Grid>
            <Grid $cols={2}>
              <Field>
                <label htmlFor="r-unit2">Unit</label>
                <Input id="r-unit2" $text value={draft.unit} onChange={e => set('unit', e.target.value)} />
              </Field>
              <NumField id="r-dec2" label="Decimals" min={0} value={draft.decimals} onChange={n => set('decimals', Math.max(0, Math.round(n)))} />
            </Grid>
            <Hint>Set the same points at both ends for a flat band. Outside can be negative if you want it to cost.</Hint>
          </>
        );

      case 'penalty':
        return (
          <>
            <Label>Scoring</Label>
            <Grid $cols={3}>
              <NumField id="r-clean" label="Clean" step="0.5" value={draft.pointsClean} onChange={n => set('pointsClean', n)} />
              <NumField id="r-slip" label="Per slip" step="0.5" value={draft.pointsPerInfraction} onChange={n => set('pointsPerInfraction', n)} />
              <NumField id="r-pfree" label="Free" step="0.5" value={draft.pointsFree} onChange={n => set('pointsFree', n)} />
            </Grid>
            <NumField
              id="r-ppasses"
              label="Free passes"
              min={0}
              value={draft.freePasses?.count ?? 0}
              onChange={n => set('freePasses', n > 0 ? { count: n, lifetime: true } : null)}
            />
            <ToggleCard>
              <div className="row">
                <Name>
                  <b>Waive the first slip each week</b>
                  <Meta>One bad night costs nothing</Meta>
                </Name>
                <Switch
                  type="button"
                  role="switch"
                  aria-checked={draft.weeklyFirstWaived}
                  aria-label="Waive the first slip each week"
                  onClick={() => set('weeklyFirstWaived', !draft.weeklyFirstWaived)}
                />
              </div>
            </ToggleCard>
          </>
        );

      case 'streak':
        return (
          <>
            <Field>
              <label htmlFor="r-ref">Rule to watch</label>
              <Select id="r-ref" $text value={draft.ruleRef} onChange={e => set('ruleRef', e.target.value)}>
                <option value="">Choose a rule…</option>
                {trackable.map(r => (
                  <option key={r.id} value={r.id}>{r.name || 'Untitled rule'}</option>
                ))}
              </Select>
              {trackable.length === 0 && (
                <Hint>Add another rule first — a streak needs something to watch.</Hint>
              )}
            </Field>
            <Grid $cols={2}>
              <NumField id="r-days" label="Days in a row" min={1} value={draft.daysRequired} onChange={n => set('daysRequired', Math.max(1, Math.round(n)))} />
              <NumField id="r-bonus" label="Bonus points" step="0.5" value={draft.bonusPoints} onChange={n => set('bonusPoints', n)} />
            </Grid>

            <Label>What counts as a day</Label>
            <Choices role="group" aria-labelledby="qualifier-label">
              <Choice
                type="button"
                aria-pressed={(draft.qualifier ?? 'positive') === 'positive'}
                onClick={() => set('qualifier', 'positive')}
              >
                Any scoring day
                <small>Scored above zero</small>
              </Choice>
              <Choice
                type="button"
                aria-pressed={draft.qualifier === 'full'}
                onClick={() => set('qualifier', 'full')}
              >
                Only full days
                <small>Earned the maximum</small>
              </Choice>
            </Choices>
            {watchedIsCounter && (draft.qualifier ?? 'positive') === 'positive' ? (
              <ErrorText role="alert">
                {watched?.name} is a counter, so any value above zero scores — a single unit
                logged would keep this streak alive. Pick “Only full days”.
              </ErrorText>
            ) : (
              <Hint>
                {draft.qualifier === 'full'
                  ? 'A day only counts if it earned everything the watched rule can award. A free pass still counts.'
                  : 'A day counts whenever the watched rule scored anything at all.'}
              </Hint>
            )}

            {watchedIsCapped && (
              <ErrorText role="alert">
                {watched?.name} has a weekly cap. Capped days score zero, so this streak would
                break every time the cap is reached. Remove the cap or watch another rule.
              </ErrorText>
            )}
            <ToggleCard>
              <div className="row">
                <Name>
                  <b>Repeatable</b>
                  <Meta>Pays again every {draft.daysRequired} days</Meta>
                </Name>
                <Switch
                  type="button"
                  role="switch"
                  aria-checked={draft.repeatable}
                  aria-label="Repeatable"
                  onClick={() => set('repeatable', !draft.repeatable)}
                />
              </div>
            </ToggleCard>
          </>
        );

      case 'tracker':
        return (
          <>
            <Grid $cols={2}>
              <NumField id="r-tmax" label="Max points" step="1" value={draft.maxPoints} onChange={n => set('maxPoints', n)} />
              <NumField id="r-tdec" label="Decimals" min={0} value={draft.decimals} onChange={n => set('decimals', Math.max(0, Math.round(n)))} />
            </Grid>
            <Field>
              <label htmlFor="r-tunit">Default unit</label>
              <Input id="r-tunit" $text $w="sm" value={draft.unit} onChange={e => set('unit', e.target.value)} />
            </Field>
            <Hint>
              Each member sets their own start and goal the first time they log this, and can pick
              their own unit. This is just the suggestion they start from.
            </Hint>
          </>
        );
    }
  };

  return (
    <Overlay role="dialog" aria-modal="true" aria-label={isNew ? 'New rule' : `Edit ${rule.name}`}>
      <Scroll>
        <TopBar
          title={draft.name || (isNew ? 'New rule' : rule.name)}
          sub={isNew ? 'Add a rule' : live ? 'Editing a rule that’s live' : 'Edit rule'}
          left={
            <IconButton type="button" aria-label="Close without saving" onClick={onClose}>
              <Icon name="back" />
            </IconButton>
          }
        />

        <Sheet>
          {isNew && (
            <Group>
              <Label>Rule type</Label>
              <Grid $cols={3}>
                {RULE_KINDS.map(k => (
                  <KindCard key={k} type="button" aria-pressed={draft.kind === k} onClick={() => changeKind(k)}>
                    {RULE_KIND_INFO[k].label}
                    <span>{RULE_KIND_INFO[k].subtitle}</span>
                  </KindCard>
                ))}
              </Grid>
              <Note>{RULE_KIND_INFO[draft.kind].description}</Note>
              <LinkButton type="button" onClick={loadExample}>
                Fill in an example
              </LinkButton>
            </Group>
          )}

          <Group>
            <Label>Basics</Label>
            <Field>
              <label htmlFor="r-name">Name</label>
              <Input id="r-name" $text value={draft.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field>
              <label htmlFor="r-emoji">Emoji</label>
              <Input
                id="r-emoji"
                $text
                $w="sm"
                maxLength={4}
                value={draft.emoji ?? ''}
                onChange={e => set('emoji', e.target.value)}
              />
              <Hint>Optional. Replaces the rule’s icon everywhere it appears.</Hint>
            </Field>
          </Group>

          <Group>{fields()}</Group>

          {error && <ErrorText role="alert">{error}</ErrorText>}

          {!isNew && (
            <Note>
              Changing a rule re-scores every day already logged against it, including past weeks.
              If that isn’t what you want, retire this rule and add a new one instead.
            </Note>
          )}
        </Sheet>
      </Scroll>

      <FootBar>
        {!isNew && onDelete && (
          <Button type="button" $tone="danger" data-secondary onClick={onDelete}>
            <Icon name="trash" />
            Delete
          </Button>
        )}
        <Button type="button" onClick={save}>
          {isNew ? 'Add rule' : 'Save rule'}
        </Button>
      </FootBar>
    </Overlay>
  );
}
