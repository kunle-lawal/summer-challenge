import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { activeRules, type Rule, type StreakRule, type TrackerRule } from '@/types';
import { diffDays, getWeekNumber, todayInTz } from '@/lib/dates';
import { evaluateEntry } from '@/lib/rules/evaluate';
import { buildLeaderboard, getLoggedDayStreak } from '@/lib/rules/aggregate';
import { getStreakRunAtDate } from '@/lib/rules/streakRun';
import { computeTrackerProgress } from '@/lib/rules/trackerProgress';
import { formatRuleFormula } from '@/lib/rules/ruleDocs';
import { formatPoints, formatRuleValue, isLogged } from '@/lib/rules/display';
import { resolveTrackerConfig } from '@/types/member';
import { Body, Hero, HeroProgress, Sheet, Stat, Stats, TopBar, WhoAmI } from '@/components/layout/Screen';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { RuleTile } from '@/components/ui/Tile';
import { Icon } from '@/components/ui/Icons';
import {
  Button, Enter, IconButton, LinkButton, List, Meta, Name,
  Pill, Points, Rank, Row, SectionHead, tnum,
} from '@/components/ui/primitives';

// ---------------------------------------------------------------------------
// Today's rule card
// ---------------------------------------------------------------------------

const LogCard = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`;

const LogMain = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  min-height: 66px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
  transition: background 0.16s ${({ theme }) => theme.ease.out};

  &:hover { background: ${({ theme }) => theme.color.surface2}; }
`;

const BigValue = styled.span<{ $muted?: boolean }>`
  font-family: ${({ theme }) => theme.font.display};
  font-weight: 600;
  font-size: ${({ $muted }) => ($muted ? '20px' : '22px')};
  line-height: 28px;
  letter-spacing: -0.03em;
  flex: 0 0 auto;
  color: ${({ theme, $muted }) => ($muted ? theme.color.ink3 : 'inherit')};
  ${tnum}
`;

const Strip = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-top: 1px dashed ${({ theme }) => theme.color.hair};
  background: ${({ theme }) => theme.color.surface2};

  > .nm {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.ink2};
    white-space: nowrap;
    svg { width: 14px; height: 14px; }
  }

  > .pips {
    display: flex;
    gap: 4px;
    flex: 1;
    min-width: 0;
    overflow: hidden;

    > i {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      border: 1px solid ${({ theme }) => theme.color.hair2};
      background: ${({ theme }) => theme.color.surface};
      flex: 0 0 auto;
    }
    > i.on {
      background: ${({ theme }) => theme.color.accent};
      border-color: ${({ theme }) => theme.color.accent};
    }
  }

  > .v {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.ink2};
    white-space: nowrap;
    flex: 0 0 auto;
    ${tnum}
  }
`;

// ---------------------------------------------------------------------------
// Personal goal card
// ---------------------------------------------------------------------------

const GoalCard = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 14px;
  cursor: pointer;
  color: inherit;
  transition: background 0.16s ${({ theme }) => theme.ease.out}, border-color 0.16s;

  &:hover { background: ${({ theme }) => theme.color.surface2}; border-color: ${({ theme }) => theme.color.hair2}; }

  > .hd { display: flex; align-items: flex-start; gap: 12px; }

  .val {
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 600;
    font-size: 26px;
    line-height: 30px;
    letter-spacing: -0.03em;
    flex: 0 0 auto;
    ${tnum}

    i { font-style: normal; font-size: 12px; font-weight: 600; color: ${({ theme }) => theme.color.ink3}; margin-left: 3px; }
  }

  > .track {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: ${({ theme }) => theme.color.hair3};
    margin: 16px 0 9px;

    > i {
      display: block;
      height: 100%;
      border-radius: 3px;
      background: ${({ theme }) => theme.color.ink};
      transition: width 0.6s ${({ theme }) => theme.ease.out};
    }
    > .knob {
      position: absolute;
      top: 50%;
      width: 14px;
      height: 14px;
      margin-left: -7px;
      border-radius: 50%;
      background: ${({ theme }) => theme.color.accent};
      border: 2px solid ${({ theme }) => theme.color.onInk};
      transform: translateY(-50%);
      transition: left 0.6s ${({ theme }) => theme.ease.out};
    }
  }

  > .ft {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.ink3};
    ${tnum}
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// ---------------------------------------------------------------------------

function StreakStrip({ rule, filled }: { rule: StreakRule; filled: number }) {
  const done = Math.min(filled, rule.daysRequired);
  return (
    <Strip>
      <span className="nm">
        <Icon name="flame" />
        {rule.name}
      </span>
      <span className="pips" aria-hidden="true">
        {Array.from({ length: rule.daysRequired }).map((_, i) => (
          <i key={i} className={i < done ? 'on' : ''} />
        ))}
      </span>
      <span className="v">
        {done}/{rule.daysRequired} · {formatPoints(rule.bonusPoints)}
      </span>
    </Strip>
  );
}

export function ChallengeHomePage() {
  const { challenge, members, entries, activeMembers } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const navigate = useNavigate();

  const view = useMemo(() => {
    if (!challenge || !selectedMemberId) return null;
    const me = members.find(m => m.id === selectedMemberId);
    if (!me) return null;

    const { timezone, weekAnchor, startDate, endDate } = challenge.config;
    const today = todayInTz(timezone);
    const myEntries = entries.filter(e => e.memberId === me.id);
    const todayEntry = myEntries.find(e => e.date === today) ?? null;

    const rules = activeRules(challenge.config.rules);
    const daily = rules.filter(r => r.kind !== 'streak' && r.kind !== 'tracker');
    const tracker = rules.find((r): r is TrackerRule => r.kind === 'tracker') ?? null;
    const streaks = rules.filter((r): r is StreakRule => r.kind === 'streak');

    const evaluated = todayEntry ? evaluateEntry(challenge, todayEntry, me, myEntries) : null;
    const pointsFor = (rule: Rule) => evaluated?.perRule[rule.id]?.points ?? 0;
    const todayPoints = daily.reduce((sum, r) => sum + pointsFor(r), 0);

    const loggedCount = daily.filter(r => isLogged(todayEntry?.values[r.id])).length;

    const board = buildLeaderboard(challenge, members, entries);
    const mine = board.standings.find(s => s.memberId === me.id);

    const elapsed = diffDays(today, startDate);
    const span = endDate ? diffDays(endDate, startDate) + 1 : null;
    const pct = span && span > 0 ? Math.max(0, Math.min(100, ((elapsed + 1) / span) * 100)) : null;

    return {
      me,
      today,
      todayEntry,
      myEntries,
      daily,
      tracker,
      streaks,
      pointsFor,
      todayPoints,
      loggedCount,
      total: mine?.totalPoints ?? 0,
      rank: mine?.rank ?? activeMembers.length,
      streakDays: getLoggedDayStreak(myEntries, today),
      weekNumber: Math.max(1, getWeekNumber(today, weekAnchor)),
      totalWeeks: span ? Math.ceil(span / 7) : null,
      daysLeft: endDate ? Math.max(0, diffDays(endDate, today)) : null,
      pct,
      top: board.standings.slice(0, 3),
      notStarted: elapsed < 0,
    };
  }, [challenge, members, entries, activeMembers, selectedMemberId]);

  if (!challenge || !view) return null;

  const {
    me, today, todayEntry, myEntries, daily, tracker, streaks, pointsFor,
    todayPoints, loggedCount, total, rank, streakDays, weekNumber, totalWeeks,
    daysLeft, pct, top, notStarted,
  } = view;

  const ended = challenge.status === 'ended';
  const allLogged = daily.length > 0 && loggedCount === daily.length;
  const remaining = daily.length - loggedCount;

  const ctaLabel = ended
    ? 'Challenge ended'
    : notStarted
      ? 'Starts soon'
      : allLogged
        ? 'Edit today’s log'
        : loggedCount > 0
          ? `Finish today’s log · ${remaining} left`
          : 'Log today';

  const ordinal = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';

  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });

  const goalConfig = tracker && me.trackerConfig?.ruleId === tracker.id ? me.trackerConfig : null;
  const goal = goalConfig && tracker ? resolveTrackerConfig(goalConfig, tracker.unit, tracker.name) : null;
  const latestTrackerValue = tracker
    ? [...myEntries].sort((a, b) => a.date.localeCompare(b.date))
        .reduce<number | null>((acc, e) => {
          const v = e.values[tracker.id];
          return typeof v === 'number' ? v : acc;
        }, null)
    : null;
  const progress = goal
    ? computeTrackerProgress(goal, latestTrackerValue ?? goal.startVal)
    : null;

  return (
    <>
      <Body>
        <Hero>
          <TopBar
            title={challenge.name}
            sub={[
              totalWeeks ? `Week ${weekNumber} of ${totalWeeks}` : `Week ${weekNumber}`,
              dateLabel,
            ].join(' · ')}
            left={
              <MemberBadge
                member={me}
                size="lg"
                onClick={() => navigate(`/c/${challenge.slug}/pick`)}
                label="Switch member"
              />
            }
            right={
              <IconButton
                type="button"
                $onPanel
                aria-label="Challenge settings"
                onClick={() => navigate(`/c/${challenge.slug}/admin`)}
              >
                <Icon name="gear" />
              </IconButton>
            }
          />

          <WhoAmI type="button" onClick={() => navigate(`/c/${challenge.slug}/pick`)}>
            Logging as <b>{me.name}</b>
            <Icon name="down" />
          </WhoAmI>

          {pct !== null && daysLeft !== null && (
            <HeroProgress label="Progress" value={`${Math.round(pct)}% · ${daysLeft}d left`} pct={pct} />
          )}

          <Stats>
            <Stat value={total} decimals={1} caption="Points" />
            <Stat value={streakDays} unit=" days" caption="Streak" hot={streakDays > 0} />
            <Stat value={rank} unit={ordinal} caption="Rank" />
          </Stats>
        </Hero>

        <Sheet>
          <Button
            type="button"
            $block
            disabled={ended || notStarted}
            onClick={() => navigate(`/c/${challenge.slug}/log`)}
          >
            <Icon name={allLogged ? 'check' : 'plus'} />
            {ctaLabel}
          </Button>

          {daily.length > 0 && (
            <Section>
              <SectionHead>
                <h2>Today</h2>
                <Meta>{formatPoints(todayPoints)} pts so far</Meta>
              </SectionHead>
              <List>
                {daily.map((rule, i) => {
                  const value = todayEntry?.values[rule.id];
                  const logged = isLogged(value);
                  const shown = formatRuleValue(rule, value);
                  const carried = streaks.filter(s => s.ruleRef === rule.id);

                  return (
                    <Enter key={rule.id} $delay={20 + i * 22}>
                      <LogCard>
                        <LogMain type="button" onClick={() => navigate(`/c/${challenge.slug}/log?rule=${rule.id}`)}>
                          <RuleTile rule={rule} />
                          <Name>
                            <b>{rule.name}</b>
                            <Meta>{shown ?? formatRuleFormula(rule)}</Meta>
                          </Name>
                          <BigValue $muted={!logged}>
                            {logged ? formatPoints(pointsFor(rule)) : '—'}
                          </BigValue>
                        </LogMain>
                        {carried.map(s => {
                          const run = getStreakRunAtDate(challenge, me, myEntries, s, today);
                          return <StreakStrip key={s.id} rule={s} filled={run.count} />;
                        })}
                      </LogCard>
                    </Enter>
                  );
                })}
              </List>
            </Section>
          )}

          {tracker && (
            <Section>
              <SectionHead>
                <h2>Personal goal</h2>
                {progress && <Pill $tone="accent">{Math.round(progress.barPct)}% there</Pill>}
              </SectionHead>
              <GoalCard type="button" onClick={() => navigate(`/c/${challenge.slug}/log?rule=${tracker.id}`)}>
                <div className="hd">
                  <Name>
                    <b>{goal?.label ?? tracker.name}</b>
                    <Meta>
                      {goal
                        ? `${goal.startVal} → ${goal.goalVal} ${goal.unit} · up to ${tracker.maxPoints} pts`
                        : `Set your goal · worth up to ${tracker.maxPoints} pts`}
                    </Meta>
                  </Name>
                  <span className="val">
                    {latestTrackerValue !== null ? latestTrackerValue.toFixed(tracker.decimals) : '—'}
                    {goal && <i>{goal.unit}</i>}
                  </span>
                </div>
                {progress && goal && (
                  <>
                    <div className="track">
                      <i style={{ width: `${progress.barPct}%` }} />
                      <span className="knob" style={{ left: `${progress.barPct}%` }} />
                    </div>
                    <div className="ft">
                      <span>{goal.startVal} {goal.unit}</span>
                      <Meta>{progress.remainingToGoal.toFixed(tracker.decimals)} {goal.unit} to go</Meta>
                      <span>{goal.goalVal} {goal.unit}</span>
                    </div>
                  </>
                )}
              </GoalCard>
            </Section>
          )}

          <Section>
            <SectionHead>
              <h2>Leaderboard</h2>
              <LinkButton type="button" onClick={() => navigate(`/c/${challenge.slug}/board`)}>
                See all {activeMembers.length}
              </LinkButton>
            </SectionHead>
            <List>
              {top.map((s, i) => (
                <Enter key={s.memberId} $delay={120 + i * 26}>
                  <Row
                    as={Link}
                    to={`/c/${challenge.slug}/m/${s.memberId}`}
                    $you={s.memberId === me.id}
                  >
                    <Rank $first={i === 0}>{s.rank}</Rank>
                    <MemberBadge member={{ name: s.memberName }} isYou={s.memberId === me.id} />
                    <Name>
                      <b>{s.memberName}</b>
                      <Meta>{s.daysLogged} {s.daysLogged === 1 ? 'day' : 'days'}</Meta>
                    </Name>
                    <Points>{s.totalPoints.toFixed(1)}</Points>
                  </Row>
                </Enter>
              ))}
            </List>
          </Section>

          <Button type="button" $tone="ghost" $block onClick={() => navigate(`/c/${challenge.slug}/rules`)}>
            <Icon name="rules" />
            Read the rules
          </Button>
        </Sheet>
      </Body>
    </>
  );
}
