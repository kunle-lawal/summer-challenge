import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { activeRules, type Rule } from '@/types';
import { todayInTz } from '@/lib/dates';
import { getFreePassState } from '@/lib/rules/kinds';
import { getStreakRunAtDate } from '@/lib/rules/streakRun';
import { explainRule, formatRuleFormula } from '@/lib/rules/ruleDocs';
import { formatRuleValue } from '@/lib/rules/display';
import { Body, Sheet, TopBar } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { RuleTile } from '@/components/ui/Tile';
import { Card, IconButton, List, Meta, Name, Note, Row } from '@/components/ui/primitives';

const Chevron = styled.span<{ $open: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  color: ${({ theme }) => theme.color.ink3};
  transition: transform 0.2s ${({ theme }) => theme.ease.out};
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);

  svg { width: 18px; height: 18px; }
`;

const Detail = styled(Card)`
  margin-top: 4px;
  border-radius: 4px 4px ${({ theme }) => theme.radii.lg} ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.color.surface2};

  p {
    font-size: 14px;
    line-height: 23px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.ink2};
  }
`;

const Head = styled(Row)<{ $open: boolean }>`
  border-radius: ${({ theme, $open }) =>
    $open ? `${theme.radii.lg} ${theme.radii.lg} 4px 4px` : theme.radii.lg};
`;

export function RulesReferencePage() {
  const { challenge, members, entries } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const navigate = useNavigate();
  // One at a time — multiple open panels break the layout and lose the
  // reader's place (§8).
  const [open, setOpen] = useState<string | null>(null);

  const data = useMemo(() => {
    if (!challenge) return null;
    const rules = activeRules(challenge.config.rules);
    const all = challenge.config.rules;
    const me = members.find(m => m.id === selectedMemberId) ?? null;
    const today = todayInTz(challenge.config.timezone);
    const myEntries = me ? entries.filter(e => e.memberId === me.id) : [];
    const todayEntry = myEntries.find(e => e.date === today) ?? null;

    /** What this rule is doing for you right now, if anything. */
    const stateOf = (rule: Rule): string | null => {
      if (!me) return null;
      if (rule.kind === 'streak') {
        const run = getStreakRunAtDate(challenge, me, myEntries, rule, today);
        return `${run.count} of ${rule.daysRequired} days`;
      }
      if (rule.kind === 'tracker') {
        return me.trackerConfig?.ruleId === rule.id ? 'Goal set' : 'No goal set yet';
      }
      const logged = formatRuleValue(rule, todayEntry?.values[rule.id]);
      if (logged) return logged;
      const passes = getFreePassState(rule, myEntries);
      return passes.offered ? `${passes.left} of ${passes.quota} free passes left` : 'Not logged today';
    };

    return { rules, all, stateOf };
  }, [challenge, members, entries, selectedMemberId]);

  if (!challenge || !data) return null;
  const { rules, all, stateOf } = data;

  const back = (
    <IconButton type="button" aria-label="Back" onClick={() => navigate(`/c/${challenge.slug}`)}>
      <Icon name="back" />
    </IconButton>
  );

  if (rules.length === 0) {
    return (
      <Body>
        <TopBar center title="Rules" left={back} />
        <EmptyState
          title="No rules yet"
          body="This challenge doesn't have any rules set up. The owner can add them in settings."
          action={{ label: 'Open settings', onClick: () => navigate(`/c/${challenge.slug}/admin`) }}
        />
      </Body>
    );
  }

  return (
    <Body>
      <TopBar
        center
        title="Rules"
        sub={`${rules.length} ${rules.length === 1 ? 'rule' : 'rules'} in play`}
        left={back}
      />
      <Sheet>
        <List>
          {rules.map(rule => {
            const isOpen = open === rule.id;
            const state = stateOf(rule);
            const panelId = `rule-detail-${rule.id}`;
            return (
              <div key={rule.id}>
                <Head
                  as="button"
                  type="button"
                  $open={isOpen}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : rule.id)}
                >
                  <RuleTile rule={rule} />
                  <Name>
                    <b>{rule.name}</b>
                    <Meta>{[formatRuleFormula(rule), state].filter(Boolean).join(' · ')}</Meta>
                  </Name>
                  <Chevron $open={isOpen}>
                    <Icon name="down" />
                  </Chevron>
                </Head>
                {isOpen && (
                  <Detail id={panelId}>
                    <p>{rule.description?.trim() || explainRule(rule, all)}</p>
                  </Detail>
                )}
              </div>
            );
          })}
        </List>

        <Note>
          Only the owner can change the rules, and every change is written to history.
        </Note>
      </Sheet>
    </Body>
  );
}
