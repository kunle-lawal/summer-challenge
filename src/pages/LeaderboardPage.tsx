import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import type { MemberStanding } from '@/types';
import { getWeekNumber, getWeekWindow, todayInTz } from '@/lib/dates';
import { buildLeaderboard } from '@/lib/rules/aggregate';
import { Body, Sheet, TopBar } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { MemberBadge } from '@/components/ui/MemberBadge';
import {
  IconButton, Label, Meta, Name, Pill, Points, Rank, Row,
  Segmented, Skeleton, tnum,
} from '@/components/ui/primitives';

type Scope = 'all' | 'week';

// ---------------------------------------------------------------------------
// Podium
// ---------------------------------------------------------------------------

const Podium = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 4px;
`;

const Plinth = styled(Link)<{ $place: 1 | 2 | 3 }>`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 0;
  background: none;
  padding: 0;
  text-decoration: none;
  color: inherit;
  font-weight: 400;

  &:hover { text-decoration: none; color: inherit; }

  > .who {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
    width: 100%;

    b {
      font-weight: 600;
      font-size: 13px;
      line-height: 18px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sc {
      font-family: ${({ theme }) => theme.font.display};
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -0.02em;
      ${tnum}
    }
  }

  > .blk {
    width: 100%;
    border: 1px solid ${({ theme, $place }) => ($place === 1 ? theme.color.accentLine : theme.color.hair)};
    border-bottom: 0;
    border-radius: ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0 0;
    background: ${({ theme, $place }) => ($place === 1 ? theme.color.accentSoft : theme.color.surface)};
    color: ${({ theme, $place }) => ($place === 1 ? theme.color.accent : theme.color.ink3)};
    display: grid;
    place-items: center;
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 600;
    font-size: ${({ $place }) => ($place === 1 ? '30px' : '26px')};
    height: ${({ $place }) => ($place === 1 ? '96px' : $place === 2 ? '70px' : '54px')};
    transition: height 0.5s ${({ theme }) => theme.ease.out}, background 0.16s;
    ${tnum}
  }

  &:hover > .blk {
    background: ${({ theme, $place }) => ($place === 1 ? theme.color.accentSoftHover : theme.color.surface2)};
  }
`;

const PodiumLine = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.hair};
  margin-top: -1px;
`;

/*
 * The prototype animates rank changes by absolutely positioning each row at
 * `index * 66px`. That relies on every row being exactly one fixed height, and
 * at 200% text zoom they aren't — the rows overlap each other. `ui-design-
 * patterns.md` §13 requires the layout to survive that zoom, so rows are laid
 * out normally and the reorder is not animated.
 */
const Standings = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// ---------------------------------------------------------------------------

export function LeaderboardPage() {
  const { challenge, members, entries, activeMembers, loading, error } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>('all');

  const data = useMemo(() => {
    if (!challenge) return null;
    const { timezone, weekAnchor } = challenge.config;
    const today = todayInTz(timezone);
    const week = getWeekWindow(today, weekAnchor);

    const all = buildLeaderboard(challenge, members, entries);
    const scoped = scope === 'week'
      ? buildLeaderboard(challenge, members, entries, week)
      : all;

    // Where each member sits on the all-time board, so the weekly view can
    // show which way they've moved.
    const allTimeRank = new Map(all.standings.map(s => [s.memberId, s.rank]));

    return {
      today,
      week,
      weekNumber: Math.max(1, getWeekNumber(today, weekAnchor)),
      standings: scoped.standings,
      allTimeRank,
      hasAnyEntries: all.totalEntries > 0,
    };
  }, [challenge, members, entries, scope]);

  if (!challenge) return null;

  const back = (
    <IconButton type="button" aria-label="Back" onClick={() => navigate(`/c/${challenge.slug}`)}>
      <Icon name="back" />
    </IconButton>
  );

  if (loading) {
    return (
      <Body>
        <TopBar center title="Leaderboard" left={back} />
        <Sheet>
          <Skeleton $h={52} />
          {activeMembers.map((m, i) => (
            <Skeleton key={m.id} $h={60} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </Sheet>
      </Body>
    );
  }

  if (error) {
    return (
      <Body>
        <TopBar center title="Leaderboard" left={back} />
        <EmptyState
          title="Scores didn’t load"
          body={error}
          action={{ label: 'Try again', onClick: () => window.location.reload() }}
        />
      </Body>
    );
  }

  if (!data) return null;
  const { standings, allTimeRank, weekNumber, hasAnyEntries } = data;

  if (!hasAnyEntries) {
    return (
      <Body>
        <TopBar center title="Leaderboard" sub={`${activeMembers.length} people`} left={back} />
        <EmptyState
          title="Nothing logged yet"
          body="As soon as someone logs a day, the standings show up here."
          action={{ label: 'Log today', onClick: () => navigate(`/c/${challenge.slug}/log`) }}
        />
      </Body>
    );
  }

  const podium = standings.slice(0, 3);
  const podiumOrder: (MemberStanding | undefined)[] = [podium[1], podium[0], podium[2]];

  return (
    <Body>
      <TopBar
        center
        title="Leaderboard"
        sub={`${activeMembers.length} ${activeMembers.length === 1 ? 'person' : 'people'} · week ${weekNumber}`}
        left={back}
      />
      <Sheet>
        <Segmented role="group" aria-label="Score range">
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            All time
          </button>
          <button type="button" aria-pressed={scope === 'week'} onClick={() => setScope('week')}>
            This week
          </button>
        </Segmented>

        {standings.length > 2 && (
          <div>
            <Podium>
              {podiumOrder.map((s, k) => {
                if (!s) return null;
                const place = (k === 0 ? 2 : k === 1 ? 1 : 3) as 1 | 2 | 3;
                return (
                  <Plinth
                    key={s.memberId}
                    to={`/c/${challenge.slug}/m/${s.memberId}`}
                    $place={place}
                    aria-label={`${s.memberName}, place ${place}, ${s.totalPoints.toFixed(1)} points`}
                  >
                    <span className="who">
                      <MemberBadge
                        member={{ name: s.memberName }}
                        size={place === 1 ? 'lg' : 'md'}
                        isYou={s.memberId === selectedMemberId}
                      />
                      <b>{s.memberName}</b>
                      <span className="sc">{s.totalPoints.toFixed(1)}</span>
                    </span>
                    <span className="blk">{place}</span>
                  </Plinth>
                );
              })}
            </Podium>
            <PodiumLine />
          </div>
        )}

        <Section>
          <Label as="h2">Standings</Label>
          {/*
            Rows keep a stable DOM order and move by transform, so a scope
            change animates positions instead of reshuffling the list under
            the reader's eyes.
          */}
          <Standings>
            {standings.map(s => {
              const moved = scope === 'week' ? (allTimeRank.get(s.memberId) ?? s.rank) - s.rank : 0;
              const isYou = s.memberId === selectedMemberId;
              return (
                <Row key={s.memberId} as={Link} to={`/c/${challenge.slug}/m/${s.memberId}`} $you={isYou}>
                  <Rank $first={s.rank === 1}>{s.rank}</Rank>
                  <MemberBadge member={{ name: s.memberName }} isYou={isYou} />
                  <Name>
                    <b>{isYou ? 'You' : s.memberName}</b>
                    <Meta>{s.daysLogged} {s.daysLogged === 1 ? 'day' : 'days'}</Meta>
                  </Name>
                  {moved !== 0 && (
                    <Pill
                      $tone="flat"
                      aria-label={`${moved > 0 ? 'Up' : 'Down'} ${Math.abs(moved)} places against all time`}
                    >
                      <Icon name={moved > 0 ? 'up' : 'down'} style={{ width: 12, height: 12 }} />
                      {Math.abs(moved)}
                    </Pill>
                  )}
                  <Points>{s.totalPoints.toFixed(1)}</Points>
                </Row>
              );
            })}
          </Standings>
        </Section>

        <Meta>
          {scope === 'all'
            ? `Every point since ${new Date(`${challenge.config.startDate}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}.`
            : 'Points earned this week. Arrows show the move against the all-time rank.'}
        </Meta>
      </Sheet>
    </Body>
  );
}
