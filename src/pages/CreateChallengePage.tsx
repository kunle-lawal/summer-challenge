import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import styled from 'styled-components';
import type { ChallengeConfig, Rule } from '@/types';
import { createChallenge } from '@/lib/challenges';
import { addMember } from '@/lib/members';
import { getCooldownRemainingMs, isOnCooldown } from '@/lib/createCooldown';
import { CHALLENGE_TEMPLATES, DEFAULT_TEMPLATE_ID } from '@/lib/rules/templates';
import { formatRuleFormula } from '@/lib/rules/ruleDocs';
import { addDays, todayInTz } from '@/lib/dates';
import { Body, FootBar, Screen, Sheet, TopBar } from '@/components/layout/Screen';
import { Dialog, Mark } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { RuleTile, Tile } from '@/components/ui/Tile';
import { RuleEditor } from '@/components/admin/RuleEditor';
import {
  AddRow, Button, Card, ErrorText, Field, Hint, IconButton, Input, List,
  Meta, Name, Pill, Row, Select, tnum,
} from '@/components/ui/primitives';

/**
 * Setting up a new challenge: one scrolling form, three numbered sections.
 *
 * The prototype's third step invites people by toggling names from a global
 * roster. There is no global roster — members exist only inside one challenge —
 * so names are typed here instead, and the challenge link is what gets shared.
 */

const NumHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  > .n {
    width: 26px;
    height: 26px;
    flex: 0 0 auto;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 600;
    font-size: 13px;
    background: ${({ theme }) => theme.color.ink};
    color: ${({ theme }) => theme.color.onInk};
    ${tnum}
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const TemplateCard = styled.button`
  width: 100%;
  text-align: left;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.color.surface};
  padding: 14px;
  cursor: pointer;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: background 0.16s ${({ theme }) => theme.ease.out}, border-color 0.16s;

  > .hd {
    display: flex;
    align-items: baseline;
    gap: 8px;

    b { font-family: ${({ theme }) => theme.font.display}; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
  }

  &:hover { background: ${({ theme }) => theme.color.surface2}; border-color: ${({ theme }) => theme.color.hair2}; }

  &[aria-pressed='true'] {
    border-color: ${({ theme }) => theme.color.ink};
    background: ${({ theme }) => theme.color.surface};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.color.ink};
  }
`;

const Facts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`;

const Done = styled(Sheet)`
  align-items: center;
  text-align: center;
  justify-content: center;
  gap: 20px;
  color: ${({ theme }) => theme.color.accent};
`;

const LinkCard = styled(Card)`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
`;

const TIMEZONES = [
  'America/Chicago', 'America/New_York', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Asia/Tokyo', 'Australia/Sydney',
];

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  } catch {
    return 'America/Chicago';
  }
}

export function CreateChallengePage() {
  const navigate = useNavigate();

  const tzGuess = useMemo(browserTimezone, []);
  const today = useMemo(() => todayInTz(tzGuess), [tzGuess]);
  const defaultTemplateWeeks =
    CHALLENGE_TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE_ID)?.weeks ?? 9;

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => addDays(today, defaultTemplateWeeks * 7 - 1));
  const [timezone, setTimezone] = useState(tzGuess);
  const defaultTemplate = CHALLENGE_TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE_ID)!;
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [rules, setRules] = useState<Rule[]>(() => defaultTemplate.build(nanoid));
  const [password, setPassword] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [nameDraft, setNameDraft] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const nameOk = name.trim().length >= 3;
  const passwordOk = password.trim().length >= 4;
  const datesOk = !endDate || endDate >= startDate;
  const ready = nameOk && passwordOk && rules.length > 0 && datesOk;

  const weeks = endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 604_800_000))
    : null;

  /** Picking a template sets both its rules and its suggested end date. */
  const useTemplate = (id: string) => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === id);
    if (!template) return;
    setTemplateId(id);
    setRules(template.build(nanoid));
    setEndDate(addDays(startDate, template.weeks * 7 - 1));
    setError(null);
  };

  /** Any hand edit means the rules are no longer that template's. */
  const markCustomised = () => setTemplateId('');

  const addName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) return;
    if (names.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setError(`${trimmed} is already on the list.`);
      return;
    }
    setNames(n => [...n, trimmed]);
    setNameDraft('');
    setAddingMember(false);
    setError(null);
  };

  const submit = async () => {
    if (!ready) return;
    if (isOnCooldown()) {
      const mins = Math.ceil(getCooldownRemainingMs() / 60_000);
      setError(`You've just made a challenge. You can make another in about ${mins} minute${mins === 1 ? '' : 's'}.`);
      return;
    }

    setBusy(true);
    setError(null);

    const config: ChallengeConfig = {
      startDate,
      endDate: endDate || null,
      weekAnchor: startDate,
      timezone,
      rules: rules.map((r, i) => ({ ...r, order: i })),
    };

    const result = await createChallenge({ name: name.trim(), password: password.trim(), config });
    if (!result.ok) {
      setBusy(false);
      setError(
        result.reason === 'cooldown'
          ? `You've just made a challenge. You can make another in about ${Math.ceil(result.remainingMs / 60_000)} minutes.`
          : 'Couldn’t create the challenge. Check your connection and try again.',
      );
      return;
    }

    for (const memberName of names) {
      await addMember(result.challengeId, memberName, { memberId: null, isOwner: true });
    }

    setBusy(false);
    setCreated({ slug: result.slug });
  };

  // ── Created ──────────────────────────────────────────────────────────────
  if (created) {
    const url = `${window.location.origin}/c/${created.slug}`;
    return (
      <Screen>
        <Body>
          <Done>
            <Mark size={72} happy />
            <div>
              <h1>{name.trim()} is live</h1>
              <Meta>
                {[
                  `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}`,
                  weeks ? `${weeks} weeks` : 'open-ended',
                  `${names.length} ${names.length === 1 ? 'person' : 'people'}`,
                ].join(' · ')}
              </Meta>
            </div>

            <LinkCard $tint>
              <Tile tone="sand" icon="share" />
              <Name>
                <b>/c/{created.slug}</b>
                <Meta>Anyone with this link can log and see the board</Meta>
              </Name>
            </LinkCard>

            <Button
              type="button"
              $tone="ghost"
              $block
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setError('Couldn’t copy automatically — the link is shown above.');
                }
              }}
            >
              <Icon name="copy" />
              {copied ? 'Link copied' : 'Copy the link'}
            </Button>

            <Hint>
              That link is the only way in, and the only thing protecting the challenge. Share it
              with the people playing and nobody else.
            </Hint>
          </Done>
        </Body>
        <FootBar>
          <Button type="button" $block onClick={() => navigate(`/c/${created.slug}`)}>
            Open {name.trim()}
            <Icon name="next" />
          </Button>
        </FootBar>
      </Screen>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <Body>
        <TopBar
          title="Set it up"
          sub="New challenge"
          left={
            <IconButton type="button" aria-label="Cancel" onClick={() => navigate(-1)}>
              <Icon name="close" />
            </IconButton>
          }
          right={weeks ? <Pill>{weeks} wks</Pill> : undefined}
        />

        <Sheet>
          <Section>
            <NumHead>
              <span className="n">1</span>
              <div>
                <h2>Name and dates</h2>
                <Meta>All of this stays editable later.</Meta>
              </div>
            </NumHead>
            <Stack>
              <Field>
                <label htmlFor="c-name">Challenge name</label>
                <Input id="c-name" $text value={name} onChange={e => setName(e.target.value)} />
                {name.length > 0 && !nameOk && (
                  <ErrorText>
                    That’s {name.trim().length} characters. Add {3 - name.trim().length} more.
                  </ErrorText>
                )}
              </Field>
              <Grid2>
                <Field>
                  <label htmlFor="c-start">Starts</label>
                  <Input id="c-start" $text type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </Field>
                <Field>
                  <label htmlFor="c-end">Ends</label>
                  <Input id="c-end" $text type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </Field>
              </Grid2>
              {!datesOk && <ErrorText>The end date needs to be on or after the start date.</ErrorText>}
              <Field>
                <label htmlFor="c-tz">Time zone</label>
                <Select id="c-tz" $text value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {[...new Set([tzGuess, ...TIMEZONES])].map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </Select>
                <Hint>Days roll over at midnight in this zone, for everyone.</Hint>
              </Field>
            </Stack>
          </Section>

          <Section>
            <NumHead>
              <span className="n">2</span>
              <div>
                <h2>Rules</h2>
                <Meta>Start from a ready-made set, then change anything.</Meta>
              </div>
            </NumHead>
            <Stack>
              <div role="group" aria-label="Starting rules" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CHALLENGE_TEMPLATES.map(t => (
                  <TemplateCard
                    key={t.id}
                    type="button"
                    aria-pressed={templateId === t.id}
                    onClick={() => useTemplate(t.id)}
                  >
                    <span className="hd">
                      <b>{t.name}</b>
                      <Meta>{t.weeks} weeks</Meta>
                    </span>
                    <Meta>{t.tagline}</Meta>
                    {t.ceiling > 0 && (
                      <Facts>
                        <Pill $tone="flat">{t.ceiling} pts if perfect</Pill>
                        <Pill $tone="flat">{t.forgiveness}</Pill>
                      </Facts>
                    )}
                  </TemplateCard>
                ))}
              </div>

              {templateId !== '' && (
                <Hint>{CHALLENGE_TEMPLATES.find(t => t.id === templateId)?.blurb}</Hint>
              )}

              {rules.length === 0 ? (
                <Hint>No rules yet — add at least one before you can create the challenge.</Hint>
              ) : (
                <List>
                  {rules.map(rule => (
                    <Row key={rule.id} style={{ paddingRight: 6 }}>
                      <RuleTile rule={rule} />
                      <Name
                        as="button"
                        type="button"
                        onClick={() => setEditingRule(rule)}
                        style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                      >
                        <b>{rule.name}</b>
                        <Meta>{formatRuleFormula(rule)}</Meta>
                      </Name>
                      <IconButton type="button" aria-label={`Edit ${rule.name}`} onClick={() => setEditingRule(rule)}>
                        <Icon name="edit" />
                      </IconButton>
                      <IconButton
                        type="button"
                        aria-label={`Remove ${rule.name}`}
                        onClick={() => {
                          setRules(rs => rs.filter(r => r.id !== rule.id));
                          markCustomised();
                        }}
                      >
                        <Icon name="trash" />
                      </IconButton>
                    </Row>
                  ))}
                </List>
              )}

              <AddRow type="button" onClick={() => setEditingRule('new')}>
                <Icon name="plus" />
                Add a rule
              </AddRow>
            </Stack>
          </Section>

          <Section>
            <NumHead>
              <span className="n">3</span>
              <div>
                <h2>Password and people</h2>
                <Meta>The password is what lets you change things later.</Meta>
              </div>
            </NumHead>
            <Stack>
              <Field>
                <label htmlFor="c-pw">Owner password</label>
                <Input
                  id="c-pw"
                  $text
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                {password.length > 0 && !passwordOk ? (
                  <ErrorText>
                    That’s {password.trim().length} characters. Add {4 - password.trim().length} more.
                  </ErrorText>
                ) : (
                  <Hint>
                    Four characters or more. There’s no way to reset it, so pick something you’ll
                    remember.
                  </Hint>
                )}
              </Field>

              {names.length > 0 && (
                <List>
                  {names.map(n => (
                    <Row key={n} style={{ paddingRight: 6 }}>
                      <MemberBadge member={{ name: n }} />
                      <Name><b>{n}</b></Name>
                      <IconButton
                        type="button"
                        aria-label={`Remove ${n}`}
                        onClick={() => setNames(list => list.filter(x => x !== n))}
                      >
                        <Icon name="trash" />
                      </IconButton>
                    </Row>
                  ))}
                </List>
              )}

              <AddRow type="button" onClick={() => setAddingMember(true)}>
                <Icon name="plus" />
                Add someone
              </AddRow>
              <Hint>
                You can add people later too. Everyone picks their own name from this list when they
                open the link.
              </Hint>
            </Stack>
          </Section>

          {error && <ErrorText role="alert">{error}</ErrorText>}
        </Sheet>
      </Body>

      <FootBar>
        <Button type="button" $tone="ghost" data-secondary onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="button" disabled={!ready || busy} onClick={submit}>
          {busy ? 'Creating…' : 'Create challenge'}
        </Button>
      </FootBar>

      {editingRule && (
        <RuleEditor
          rule={editingRule === 'new' ? null : editingRule}
          allRules={rules}
          onClose={() => setEditingRule(null)}
          onSave={saved => {
            setRules(rs => (editingRule === 'new' ? [...rs, saved] : rs.map(r => (r.id === saved.id ? saved : r))));
            markCustomised();
            setEditingRule(null);
          }}
          {...(editingRule !== 'new'
            ? {
                onDelete: () => {
                  setRules(rs => rs.filter(r => r.id !== editingRule.id));
                  markCustomised();
                  setEditingRule(null);
                },
              }
            : {})}
        />
      )}

      {addingMember && (
        <Dialog
          title="Add someone"
          onClose={() => {
            setAddingMember(false);
            setNameDraft('');
          }}
          actions={
            <>
              <Button
                type="button"
                $tone="ghost"
                onClick={() => {
                  setAddingMember(false);
                  setNameDraft('');
                }}
              >
                Cancel
              </Button>
              <Button type="button" disabled={nameDraft.trim().length < 2} onClick={addName}>
                Add them
              </Button>
            </>
          }
        >
          <p>Just their name — they pick it themselves when they open the link.</p>
          <Field>
            <label htmlFor="c-member">Name</label>
            <Input
              id="c-member"
              $text
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addName()}
            />
          </Field>
        </Dialog>
      )}
    </Screen>
  );
}
