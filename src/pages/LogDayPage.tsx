import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import {
  activeRules, type Entry, type RawEntryValue, type Rule, type TrackerRule,
} from '@/types';
import { isWithinEditWindow, todayInTz } from '@/lib/dates';
import { evaluateEntry } from '@/lib/rules/evaluate';
import { getFreePassState } from '@/lib/rules/kinds';
import { buildWeeklySummary, getLoggedDayStreak } from '@/lib/rules/aggregate';
import { formatRuleFormula } from '@/lib/rules/ruleDocs';
import { formatPoints, formatRuleValue, isLogged } from '@/lib/rules/display';
import { upsertEntry } from '@/lib/entries';
import { setTrackerConfig } from '@/lib/members';
import { Body, FootBar, Sheet, TopBar } from '@/components/layout/Screen';
import { Count, Mark } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { RuleTile } from '@/components/ui/Tile';
import {
  Button, Card, ErrorText, Field, Hint, IconButton, Input, Label, List, Meta, Name,
  Note, Pill, Points, Row, Track, tnum,
} from '@/components/ui/primitives';
import { PointsPreview, RuleInput, hintFor, promptFor } from '@/components/log/RuleInput';

type Draft = Record<string, RawEntryValue | undefined>;

type Step =
  | { kind: 'rule'; rule: Rule }
  | { kind: 'trackerSetup'; rule: TrackerRule };

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const ProgressPad = styled.div`
  padding: 8px 20px 0;
  flex: 0 0 auto;
`;

const StepHead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  > div { min-width: 0; }
`;

const Spacer = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 8px;
`;

const Celebrate = styled(Sheet)`
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 24px;
  color: ${({ theme }) => theme.color.accent};
`;

const StatPair = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;

  > div { flex: 1; }

  b {
    display: block;
    font-family: ${({ theme }) => theme.font.display};
    font-size: 24px;
    font-weight: 600;
    line-height: 32px;
    color: ${({ theme }) => theme.color.ink};
    ${tnum}
  }
`;

const EditorRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const EditorHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
`;

// ---------------------------------------------------------------------------

function formatDayLabel(date: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC', ...opts,
  });
}

function saveErrorMessage(reason: string): string {
  switch (reason) {
    case 'challenge_ended':
      return 'This challenge has ended, so logs are locked. Ask the owner to reopen it if something needs fixing.';
    case 'edit_window_closed':
      return 'That day is outside the challenge dates, so it can’t be logged.';
    case 'member_not_found':
      return 'That member is no longer on the roster. Pick your name again to carry on.';
    default:
      return 'The save didn’t go through. Check your connection and try again.';
  }
}

// ---------------------------------------------------------------------------
// Tracker goal setup
// ---------------------------------------------------------------------------

interface GoalDraft {
  label: string;
  unit: string;
  startVal: string;
  goalVal: string;
}

/**
 * The prototype has no goal-setup screen at all — it puts start and goal on the
 * rule. They're per member here, so this is the step that collects them the
 * first time someone logs the tracker. See docs/REDESIGN_DECISIONS.md.
 */
function TrackerSetup({
  rule, draft, onChange,
}: { rule: TrackerRule; draft: GoalDraft; onChange: (d: GoalDraft) => void }) {
  const start = Number(draft.startVal);
  const goal = Number(draft.goalVal);
  const ready = draft.startVal !== '' && draft.goalVal !== '' && start !== goal;
  const direction = goal < start ? 'down' : 'up';

  return (
    <>
      <StepHead>
        <RuleTile rule={rule} size="lg" />
        <div>
          <h1>Set your goal</h1>
          <Meta>Worth up to {rule.maxPoints} points as you close the gap</Meta>
        </div>
      </StepHead>

      <Field>
        <label htmlFor="goal-label">What are you tracking?</label>
        <Input
          id="goal-label"
          $text
          value={draft.label}
          onChange={e => onChange({ ...draft, label: e.target.value })}
        />
        <Hint>Only you see this. “Weight”, “Squat”, “5k time” — whatever you’re moving.</Hint>
      </Field>

      <Field>
        <label htmlFor="goal-unit">Unit</label>
        <Input
          id="goal-unit"
          $text
          $w="sm"
          value={draft.unit}
          onChange={e => onChange({ ...draft, unit: e.target.value })}
        />
      </Field>

      <Field>
        <label htmlFor="goal-start">Starting at</label>
        <Input
          id="goal-start"
          $w="sm"
          type="number"
          inputMode="decimal"
          step={rule.decimals > 0 ? String(10 ** -rule.decimals) : '1'}
          value={draft.startVal}
          onChange={e => onChange({ ...draft, startVal: e.target.value })}
        />
      </Field>

      <Field>
        <label htmlFor="goal-target">Aiming for</label>
        <Input
          id="goal-target"
          $w="sm"
          type="number"
          inputMode="decimal"
          step={rule.decimals > 0 ? String(10 ** -rule.decimals) : '1'}
          value={draft.goalVal}
          onChange={e => onChange({ ...draft, goalVal: e.target.value })}
        />
        {ready ? (
          <Hint>
            Going {direction === 'down' ? 'down' : 'up'} from {draft.startVal} to {draft.goalVal}
            {draft.unit ? ` ${draft.unit}` : ''}.
          </Hint>
        ) : (
          <ErrorText>Pick a start and a goal that differ, so there's progress to measure.</ErrorText>
        )}
      </Field>

      <Note>Your goal locks once you set it. The owner can change it later if you need.</Note>
    </>
  );
}

// ---------------------------------------------------------------------------

export function LogDayPage() {
  const { challenge, members, entries } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const tz = challenge?.config.timezone ?? 'UTC';
  const today = todayInTz(tz);
  const date = params.get('date') ?? today;
  const focusRuleId = params.get('rule');

  const me = members.find(m => m.id === selectedMemberId) ?? null;
  const myEntries = useMemo(
    () => entries.filter(e => e.memberId === selectedMemberId),
    [entries, selectedMemberId],
  );
  const existing = myEntries.find(e => e.date === date) ?? null;

  const steps: Step[] = useMemo(() => {
    if (!challenge || !me) return [];
    const rules = activeRules(challenge.config.rules).filter(r => r.kind !== 'streak');
    const out: Step[] = [];
    for (const rule of rules) {
      if (rule.kind === 'tracker' && me.trackerConfig?.ruleId !== rule.id) {
        out.push({ kind: 'trackerSetup', rule });
      }
      out.push({ kind: 'rule', rule });
    }
    return out;
  }, [challenge, me]);

  // Server values sit underneath; anything the member has touched wins, so a
  // snapshot landing mid-edit can never overwrite what they just typed.
  const [edits, setEdits] = useState<Draft>({});
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<'log' | 'saved'>('log');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<GoalDraft>({ label: '', unit: '', startVal: '', goalVal: '' });

  useEffect(() => {
    setEdits({});
    setTouched(new Set());
    setPhase('log');
    setError(null);
  }, [date, selectedMemberId]);

  useEffect(() => {
    const idx = steps.findIndex(s => s.rule.id === focusRuleId);
    if (idx >= 0) setStepIdx(idx);
  }, [focusRuleId, steps]);

  const values: Draft = useMemo(() => {
    const merged: Draft = { ...(existing?.values ?? {}) };
    for (const id of touched) merged[id] = edits[id];
    return merged;
  }, [existing, edits, touched]);

  const setValue = (ruleId: string, value: RawEntryValue | undefined) => {
    setEdits(d => ({ ...d, [ruleId]: value }));
    setTouched(t => new Set(t).add(ruleId));
    setError(null);
  };

  // A synthetic entry so the live preview gets caps, waivers and free passes
  // right — the same evaluator that will score it once it's saved.
  const preview = useMemo(() => {
    if (!challenge || !me) return null;
    const draftEntry: Entry = {
      id: existing?.id ?? 'draft',
      memberId: me.id,
      date,
      values: values as Entry['values'],
      pts: 0,
      createdAt: existing?.createdAt ?? ({ seconds: 0, nanoseconds: 0 } as never),
      updatedAt: existing?.updatedAt ?? ({ seconds: 0, nanoseconds: 0 } as never),
      createdByMemberId: me.id,
    };
    const others = myEntries.filter(e => e.date !== date);
    return evaluateEntry(challenge, draftEntry, me, [...others, draftEntry]);
  }, [challenge, me, existing, date, values, myEntries]);

  if (!challenge || !me) return null;

  const editable =
    challenge.status !== 'ended' &&
    isWithinEditWindow(date, tz, {
      startDate: challenge.config.startDate,
      endDate: challenge.config.endDate,
    });

  const weekSummary = buildWeeklySummary(challenge, me, myEntries, date);
  const valueRules = steps.filter((s): s is { kind: 'rule'; rule: Rule } => s.kind === 'rule').map(s => s.rule);
  const dailyRules = valueRules.filter(r => r.kind !== 'tracker');
  const loggedCount = dailyRules.filter(r => isLogged(values[r.id])).length;
  const dayPoints = dailyRules.reduce((sum, r) => sum + (preview?.perRule[r.id]?.points ?? 0), 0);

  const persist = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined),
    ) as Entry['values'];

    const result = await upsertEntry(challenge.id, me.id, date, payload, {
      memberId: me.id,
      isOwner: false,
    });
    setSaving(false);
    if (!result.ok) {
      setError(saveErrorMessage(result.reason));
      return false;
    }
    return true;
  };

  const saveGoal = async (rule: TrackerRule): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const startVal = Number(goal.startVal);
    const goalVal = Number(goal.goalVal);
    const result = await setTrackerConfig(
      challenge.id,
      me.id,
      {
        ruleId: rule.id,
        label: goal.label.trim() || rule.name,
        unit: goal.unit.trim() || rule.unit,
        startVal,
        goalVal,
        direction: goalVal < startVal ? 'down' : 'up',
      },
      { memberId: me.id, isOwner: false },
    );
    setSaving(false);
    if (!result.ok) {
      setError('Couldn’t save your goal. Check your connection and try again.');
      return false;
    }
    return true;
  };

  // ── Celebration ──────────────────────────────────────────────────────────
  if (phase === 'saved') {
    // The save has just happened but the snapshot may not have landed yet, so
    // count this date in explicitly rather than waiting for it to arrive.
    const saved: Entry[] = myEntries.some(e => e.date === date)
      ? myEntries
      : [...myEntries, { ...(existing ?? ({} as Entry)), id: 'just-saved', memberId: me.id, date }];
    const streak = getLoggedDayStreak(saved, today);

    return (
      <Body>
        <Celebrate>
          <Mark size={80} happy />
          <div>
            <h1>Logged for {formatDayLabel(date)}</h1>
            <Meta>
              {loggedCount === dailyRules.length
                ? 'Everything’s in. Nothing left to do today.'
                : `${loggedCount} of ${dailyRules.length} in. You can finish the rest any time today.`}
            </Meta>
          </div>

          <StatPair>
            <Card $tint>
              <b>{formatPoints(dayPoints).startsWith('−') ? '' : '+'}<Count value={Math.abs(dayPoints)} decimals={1} ms={700} /></b>
              <Label>Points today</Label>
            </Card>
            <Card $tint>
              <b><Count value={streak} ms={600} /> days</b>
              <Label>Streak</Label>
            </Card>
          </StatPair>

          <List $gap={6} style={{ width: '100%' }}>
            {valueRules.map(rule => (
              <Row key={rule.id} style={{ minHeight: 56 }}>
                <RuleTile rule={rule} />
                <Name><b>{rule.name}</b></Name>
                <Meta>{formatRuleValue(rule, values[rule.id]) ?? 'Not logged'}</Meta>
              </Row>
            ))}
          </List>
        </Celebrate>

        <FootBar>
          <Button type="button" $tone="ghost" data-secondary onClick={() => setPhase('log')}>
            Edit
          </Button>
          <Button type="button" onClick={() => navigate(`/c/${challenge.slug}`)}>
            Done
          </Button>
        </FootBar>
      </Body>
    );
  }

  // ── Past-day editor ──────────────────────────────────────────────────────
  // A past day is reviewed as a whole, not stepped through: you're checking
  // what's already there against what you remember, and a wizard would hide
  // the other four answers behind Next.
  if (date !== today) {
    const dirty = touched.size > 0;
    return (
      <>
        <Body>
          <TopBar
            title={formatDayLabel(date)}
            sub={editable ? 'Editing a past day' : 'Locked — outside the challenge dates'}
            left={
              <IconButton type="button" aria-label="Back" onClick={() => navigate(-1)}>
                <Icon name="back" />
              </IconButton>
            }
            right={<Pill>{formatPoints(dayPoints)}</Pill>}
          />
          <Sheet>
            {valueRules.map(rule => (
              <EditorRow key={rule.id}>
                <EditorHead>
                  <RuleTile rule={rule} />
                  <Name>
                    <b>{rule.name}</b>
                    <Meta>{formatRuleFormula(rule)}</Meta>
                  </Name>
                  <Points>{formatPoints(preview?.perRule[rule.id]?.points ?? 0)}</Points>
                </EditorHead>
                <RuleInput
                  rule={rule}
                  value={values[rule.id]}
                  onChange={v => setValue(rule.id, v)}
                  freePass={getFreePassState(rule, myEntries, date)}
                  inputId={`past-${rule.id}`}
                  disabled={!editable}
                  compact
                />
              </EditorRow>
            ))}

            {error && <ErrorText role="alert">{error}</ErrorText>}

            <Note>
              {editable
                ? 'Editing a past day re-scores the leaderboard straight away, and the change is recorded in history under your name.'
                : 'This day sits outside the challenge dates, so it can no longer be changed.'}
            </Note>
          </Sheet>
        </Body>

        <FootBar>
          <Button type="button" $tone="ghost" data-secondary onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!dirty || !editable || saving}
            onClick={async () => {
              if (await persist()) navigate(-1);
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </FootBar>
      </>
    );
  }

  // ── Today's wizard ───────────────────────────────────────────────────────
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  if (!step) {
    return (
      <Body>
        <Sheet>
          <Note>This challenge has no rules to log yet. The owner can add some in settings.</Note>
          <Button type="button" $tone="ghost" $block onClick={() => navigate(`/c/${challenge.slug}`)}>
            Back to home
          </Button>
        </Sheet>
      </Body>
    );
  }

  const isLast = stepIdx === steps.length - 1;
  const rule = step.rule;
  const fieldId = `log-${rule.id}`;
  const labelId = `lbl-${rule.id}`;
  const usesChoices = rule.kind === 'binary' || rule.kind === 'penalty';
  const freePass = getFreePassState(rule, myEntries, date);
  const capUsage = weekSummary.perRule[rule.id];
  const weekly =
    capUsage && capUsage.cap !== null
      ? ` · ${capUsage.used} of ${capUsage.cap} this week`
      : '';

  const goalReady =
    step.kind !== 'trackerSetup' ||
    (goal.startVal !== '' && goal.goalVal !== '' && Number(goal.startVal) !== Number(goal.goalVal));

  const advance = async () => {
    if (step.kind === 'trackerSetup') {
      if (!(await saveGoal(step.rule))) return;
      setStepIdx(i => i + 1);
      return;
    }
    if (isLast) {
      if (await persist()) setPhase('saved');
      return;
    }
    setStepIdx(i => i + 1);
  };

  return (
    <>
      <Body>
        <TopBar
          center
          title={`Log ${formatDayLabel(today, { weekday: undefined })}`}
          sub={`Step ${stepIdx + 1} of ${steps.length}`}
          left={
            stepIdx > 0 ? (
              <IconButton type="button" aria-label="Previous rule" onClick={() => setStepIdx(i => i - 1)}>
                <Icon name="back" />
              </IconButton>
            ) : undefined
          }
          right={
            <IconButton type="button" aria-label="Close without saving" onClick={() => navigate(`/c/${challenge.slug}`)}>
              <Icon name="close" />
            </IconButton>
          }
        />

        <ProgressPad>
          <Track>
            <i style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }} />
          </Track>
        </ProgressPad>

        <Sheet key={`${step.kind}-${rule.id}`}>
          {step.kind === 'trackerSetup' ? (
            <TrackerSetup rule={step.rule} draft={goal} onChange={setGoal} />
          ) : (
            <>
              <StepHead>
                <RuleTile rule={rule} size="lg" />
                <div>
                  <h1>{rule.name}</h1>
                  <Meta>{formatRuleFormula(rule)}{weekly}</Meta>
                </div>
              </StepHead>

              <Field>
                {usesChoices ? (
                  <Label as="span" id={labelId}>{promptFor(rule)}</Label>
                ) : (
                  <label htmlFor={fieldId}>{promptFor(rule)}</label>
                )}
                <RuleInput
                  rule={rule}
                  value={values[rule.id]}
                  onChange={v => setValue(rule.id, v)}
                  freePass={freePass}
                  inputId={fieldId}
                  labelId={usesChoices ? labelId : undefined}
                  disabled={!editable}
                />
                {hintFor(rule) && <Hint>{hintFor(rule)}</Hint>}
              </Field>

              <PointsPreview rule={rule} evaluated={preview?.perRule[rule.id]} />

              {error && <ErrorText role="alert">{error}</ErrorText>}

              <Spacer>
                <Label as="span">Today so far</Label>
                <Meta>
                  {formatPoints(dayPoints)} points · {dailyRules.length - loggedCount} of {dailyRules.length} still open
                </Meta>
              </Spacer>
            </>
          )}
        </Sheet>
      </Body>

      <FootBar>
        {stepIdx > 0 && (
          <Button type="button" $tone="ghost" data-secondary onClick={() => setStepIdx(i => i - 1)}>
            <Icon name="back" />
            Back
          </Button>
        )}
        <Button type="button" disabled={saving || !editable || !goalReady} onClick={advance}>
          {saving
            ? 'Saving…'
            : step.kind === 'trackerSetup'
              ? 'Save goal'
              : isLast
                ? 'Save today’s log'
                : 'Next rule'}
          {step.kind !== 'trackerSetup' && !isLast && <Icon name="next" />}
        </Button>
      </FootBar>
    </>
  );
}
