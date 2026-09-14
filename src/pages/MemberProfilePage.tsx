import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { useAdminMode } from '@/context/AdminModeContext';
import { activeRules } from '@/types';
import { addDays, getWeekWindow, todayInTz } from '@/lib/dates';
import { buildLeaderboard, getLoggedDayStreak } from '@/lib/rules/aggregate';
import { formatPoints } from '@/lib/rules/display';
import { removeMember, restoreMember } from '@/lib/members';
import { Body, Sheet, TopBar } from '@/components/layout/Screen';
import { Bar, Count, Dialog, EmptyState, Ring, Toast } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { RuleTile } from '@/components/ui/Tile';
import {
  Button, Card, IconButton, Label, List, Meta, SectionHead, tnum,
} from '@/components/ui/primitives';

const HeadCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 16px;

  > .tot {
    flex: 1;
    min-width: 0;

    b {
      display: block;
      font-family: ${({ theme }) => theme.font.display};
      font-weight: 600;
      font-size: 26px;
      line-height: 32px;
      letter-spacing: -0.02em;
      ${tnum}
    }
  }
`;

const RingLabel = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  ${tnum}

  small { font-size: 10px; color: ${({ theme }) => theme.color.ink2}; }
`;

const RuleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;

  > .nm {
    flex: 1;
    min-width: 0;

    > span {
      display: block;
      font-weight: 600;
      font-size: 14px;
      line-height: 20px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  > .pts {
    width: 52px;
    text-align: right;
    font-weight: 700;
    font-size: 14px;
    flex: 0 0 auto;
    ${tnum}
  }
`;

const WeekGrid = styled.div`
  display: flex;
  gap: 6px;
`;

const Day = styled.div<{ $on: boolean; $future: boolean }>`
  flex: 1;
  min-width: 0;
  height: 56px;
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $on }) => ($on ? theme.color.ink : theme.color.surface)};
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.ink : theme.color.hair)};
  color: ${({ theme, $on }) => ($on ? '#fff' : theme.color.ink3)};
  opacity: ${({ $future }) => ($future ? 0.45 : 1)};

  b { font-family: ${({ theme }) => theme.font.display}; font-weight: 600; font-size: 13px; }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export function MemberProfilePage() {
  const { challenge, members, entries } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const { isAdmin } = useAdminMode();
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const data = useMemo(() => {
    if (!challenge || !memberId) return null;
    const member = members.find(m => m.id === memberId);
    if (!member) return null;

    const { timezone, weekAnchor } = challenge.config;
    const today = todayInTz(timezone);
    const memberEntries = entries.filter(e => e.memberId === member.id);
    const board = buildLeaderboard(challenge, members, entries);
    const standing = board.standings.find(s => s.memberId === member.id) ?? null;
    const rules = activeRules(challenge.config.rules);

    const week = getWeekWindow(today, weekAnchor);
    const loggedDates = new Set(memberEntries.map(e => e.date));
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(week.start, i);
      return {
        date,
        letter: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }),
        on: loggedDates.has(date),
        future: date > today,
      };
    });

    const perRule = rules.map(r => ({ rule: r, points: standing?.perRule[r.id] ?? 0 }));
    const maxAbs = Math.max(1, ...perRule.map(p => Math.abs(p.points)));

    return {
      member,
      standing,
      perRule,
      maxAbs,
      days,
      streak: getLoggedDayStreak(memberEntries, today),
      hasEntries: memberEntries.length > 0,
    };
  }, [challenge, members, entries, memberId]);

  if (!challenge) return null;

  if (!data) {
    return (
      <Body>
        <EmptyState
          title="No such member"
          body="They may have been removed from this challenge, or the link may be out of date."
          action={{ label: 'Back to the leaderboard', onClick: () => navigate(`/c/${challenge.slug}/board`) }}
        />
      </Body>
    );
  }

  const { member, standing, perRule, maxAbs, days, streak, hasEntries } = data;
  const isYou = member.id === selectedMemberId;

  const doRemove = async () => {
    setBusy(true);
    const result = await removeMember(challenge.id, member.id, { memberId: selectedMemberId, isOwner: true });
    setBusy(false);
    setConfirmRemove(false);
    if (!result.ok) {
      setToast({ msg: 'Couldn’t remove them. Check your connection and try again.' });
      return;
    }
    setToast({
      msg: `${member.name} removed`,
      undo: async () => {
        setToast(null);
        const back = await restoreMember(challenge.id, member.id, { memberId: selectedMemberId, isOwner: true });
        setToast({
          msg: back.ok
            ? `${member.name} is back`
            : back.reason === 'name_taken'
              ? `Someone else is using that name now. Re-add them as “${back.suggested}”.`
              : 'Couldn’t undo that.',
        });
      },
    });
  };

  return (
    <>
      <Body>
        <TopBar
          center
          title={isYou ? 'You' : member.name}
          sub={`${standing?.daysLogged ?? 0} ${standing?.daysLogged === 1 ? 'day' : 'days'} logged${member.active ? '' : ' · removed'}`}
          left={
            <IconButton type="button" aria-label="Back" onClick={() => navigate(-1)}>
              <Icon name="back" />
            </IconButton>
          }
          right={
            isAdmin && !isYou ? (
              <IconButton type="button" aria-label={`Actions for ${member.name}`} onClick={() => setMenuOpen(true)}>
                <Icon name="more" />
              </IconButton>
            ) : undefined
          }
        />

        <Sheet>
          <HeadCard $tint>
            <MemberBadge member={member} size="xl" isYou={isYou} />
            <div className="tot">
              <b><Count value={standing?.totalPoints ?? 0} decimals={1} /></b>
              <Label>Points</Label>
            </div>
            <Ring value={Math.min(streak, 7)} max={7} size={58} stroke={6} track="#efece6" color="#cf5230">
              <RingLabel>
                {streak}<small>/7</small>
              </RingLabel>
            </Ring>
          </HeadCard>

          {!hasEntries ? (
            <EmptyState
              title={isYou ? 'You haven’t logged anything yet' : `${member.name} hasn’t logged anything yet`}
              body={
                isYou
                  ? 'Log a day and your points will start showing up here, broken down by rule.'
                  : 'Once they log a day, their breakdown shows up here.'
              }
              {...(isYou ? { action: { label: 'Log today', onClick: () => navigate(`/c/${challenge.slug}/log`) } } : {})}
            />
          ) : (
            <>
              <Section>
                <SectionHead>
                  <h2>Where the points came from</h2>
                </SectionHead>
                <List $gap={4}>
                  {perRule.map(({ rule, points }) => (
                    <RuleRow key={rule.id}>
                      <RuleTile rule={rule} />
                      <span className="nm">
                        <span>{rule.name}</span>
                        <Bar
                          value={Math.abs(points)}
                          max={maxAbs}
                          color={points < 0 ? '#a83226' : '#17181c'}
                        />
                      </span>
                      <span className="pts">{formatPoints(points)}</span>
                    </RuleRow>
                  ))}
                </List>
              </Section>

              <Section>
                <SectionHead>
                  <h2>This week</h2>
                  <Meta>{days.filter(d => d.on).length} of 7 logged</Meta>
                </SectionHead>
                <WeekGrid>
                  {days.map(d => (
                    <Day key={d.date} $on={d.on} $future={d.future}>
                      <b>{d.letter}</b>
                      {d.on ? <Icon name="check" style={{ width: 12, height: 12 }} /> : '—'}
                    </Day>
                  ))}
                </WeekGrid>
              </Section>
            </>
          )}
        </Sheet>
      </Body>

      {menuOpen && (
        <Dialog
          title={member.name}
          onClose={() => setMenuOpen(false)}
          actions={
            <>
              <Button type="button" $tone="ghost" onClick={() => setMenuOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                $tone="danger"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmRemove(true);
                }}
              >
                Remove
              </Button>
            </>
          }
        >
          <p>
            Removing {member.name} keeps every day they logged in history, but takes them off the
            leaderboard and out of the member picker.
          </p>
        </Dialog>
      )}

      {confirmRemove && (
        <Dialog
          title={`Remove ${member.name}?`}
          onClose={() => setConfirmRemove(false)}
          actions={
            <>
              <Button type="button" $tone="ghost" onClick={() => setConfirmRemove(false)}>
                Keep them
              </Button>
              <Button type="button" $tone="danger" disabled={busy} onClick={doRemove}>
                {busy ? 'Removing…' : 'Remove'}
              </Button>
            </>
          }
        >
          <p>They drop off the leaderboard straight away. You can undo this right afterwards.</p>
        </Dialog>
      )}

      {toast && (
        <Toast actionLabel={toast.undo ? 'Undo' : undefined} onAction={toast.undo}>
          {toast.msg}
        </Toast>
      )}
    </>
  );
}
