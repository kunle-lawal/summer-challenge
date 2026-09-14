import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { getWeekNumber, todayInTz } from '@/lib/dates';
import { Body, Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { List, Meta, Name, Pill, Row } from '@/components/ui/primitives';

/**
 * Who's using this device. Full screen, no tab bar — nothing else is reachable
 * until a name is picked, because every other screen is personal.
 *
 * This is an honour system, not authentication: anyone with the link can pick
 * any name. See APP_REFERENCE "Identity & trust model".
 */

const Pane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px 20px calc(32px + env(safe-area-inset-bottom, 0px));

  h1 { font-size: 28px; line-height: 35px; }
`;

const Top = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const Sub = styled.p`
  font-size: 14px;
  line-height: 21px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.ink2};
`;

const Foot = styled.p`
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: auto;
`;

export function PickMemberPage() {
  const { challenge, activeMembers, entries } = useChallenge();
  const { selectedMemberId, setSelectedMemberId } = useSelectedMember();
  const navigate = useNavigate();

  const daysByMember = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.memberId, (counts.get(e.memberId) ?? 0) + 1);
    return counts;
  }, [entries]);

  if (!challenge) return null;

  const week = Math.max(1, getWeekNumber(todayInTz(challenge.config.timezone), challenge.config.weekAnchor));

  const choose = (id: string) => {
    setSelectedMemberId(id);
    navigate(`/c/${challenge.slug}`, { replace: true });
  };

  if (activeMembers.length === 0) {
    return (
      <Screen>
        <Body>
          <EmptyState
            title="No one on the roster yet"
            body="This challenge has no members. Whoever set it up needs to add names in settings before anyone can log."
            action={{ label: 'Open settings', onClick: () => navigate(`/c/${challenge.slug}/admin`) }}
          />
        </Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <Body>
        <Pane>
          <Top>
            <Pill>{challenge.name}</Pill>
            <Meta>Week {week}</Meta>
          </Top>

          <div>
            <h1>Who’s logging in?</h1>
            <Sub>Pick yourself to start logging. You can switch any time from the header.</Sub>
          </div>

          <List>
            {activeMembers.map(m => {
              const days = daysByMember.get(m.id) ?? 0;
              const current = m.id === selectedMemberId;
              return (
                <Row as="button" type="button" key={m.id} $you={current} onClick={() => choose(m.id)}>
                  <MemberBadge member={m} size="lg" />
                  <Name>
                    <b>{m.name}</b>
                    <Meta>
                      {[
                        current ? 'This device' : null,
                        days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} logged` : 'Nothing logged yet',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Meta>
                  </Name>
                  <Icon name="next" />
                </Row>
              );
            })}
          </List>

          <Foot>Not on the list? Ask whoever set the challenge up to add you.</Foot>
        </Pane>
      </Body>
    </Screen>
  );
}
