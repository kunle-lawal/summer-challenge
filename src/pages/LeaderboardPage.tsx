import styled from 'styled-components';
import { fmtPts, getFreeCounts, getTotals, initials, ptsClass } from '../lib/scoring';
import { useChallenge } from '../context/ChallengeContext';

const SectionHeader = styled.div`
  margin-bottom: 1.75rem;
`;

const SectionTitle = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.text};
`;

const SectionSub = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.muted2};
  margin-top: 0.4rem;
`;

const Podium = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 2rem;
  align-items: end;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyMsg = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.muted};
  font-size: 0.8rem;
  grid-column: 1 / -1;
`;

const PodiumCard = styled.div<{ $place: 1 | 2 | 3 }>`
  border-radius: 14px;
  padding: ${({ $place }) => ($place === 1 ? '1.75rem 1rem 1.25rem' : '1.25rem 1rem')};
  text-align: center;
  border: 1px solid ${({ theme, $place }) =>
    $place === 1
      ? 'rgba(232,160,32,0.4)'
      : $place === 2
        ? theme.color.podium2Border
        : theme.color.podium3Border};
  background: ${({ theme, $place }) =>
    $place === 1
      ? 'rgba(232,160,32,0.07)'
      : $place === 2
        ? theme.color.podium2
        : theme.color.podium3};
`;

const PodiumPlace = styled.div<{ $place: 1 | 2 | 3 }>`
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 6px;
  color: ${({ theme, $place }) =>
    $place === 1
      ? theme.color.gold
      : $place === 2
        ? '#94A3B8'
        : '#B45309'};
`;

const PodiumAvatar = styled.div<{ $place: 1 | 2 | 3 }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.75rem;
  font-weight: 700;
  margin: 0 auto 8px;
  background: ${({ theme, $place }) =>
    $place === 1
      ? theme.color.goldDim
      : $place === 2
        ? 'rgba(148,163,184,0.1)'
        : 'rgba(180,83,9,0.1)'};
  color: ${({ theme, $place }) =>
    $place === 1
      ? theme.color.gold
      : $place === 2
        ? '#94A3B8'
        : '#B45309'};
`;

const PodiumName = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 4px;
`;

const PodiumScore = styled.div<{ $place: 1 | 2 | 3 }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 1.6rem;
  font-weight: 900;
  line-height: 1;
  color: ${({ theme, $place }) =>
    $place === 1
      ? theme.color.gold
      : $place === 2
        ? '#94A3B8'
        : '#B45309'};
`;

const PodiumPtsLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.color.muted2};
  margin-top: 2px;
`;

const Rankings = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 14px;
  overflow: hidden;
`;

const RankRow = styled.div<{ $header?: boolean }>`
  display: grid;
  grid-template-columns: 44px 1fr 70px 80px 80px 90px 90px;
  align-items: center;
  padding: ${({ $header }) => ($header ? '9px 16px' : '12px 16px')};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  gap: 8px;
  font-size: ${({ $header }) => ($header ? '0.62rem' : 'inherit')};

  &:last-child {
    border-bottom: none;
  }

  ${({ $header, theme }) =>
    $header
      ? `
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${theme.color.muted};
    background: ${theme.color.surface2};
  `
      : `
    &:hover {
      background: ${theme.color.surface2};
    }
  `}

  @media (max-width: 740px) {
    grid-template-columns: 32px 1fr 70px 90px;
    & > span:nth-child(4),
    & > span:nth-child(5),
    & > span:nth-child(6) {
      display: none;
    }
  }
`;

const RankNum = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.muted};
`;

const RankName = styled.span`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RankInitials = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surface2};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.55rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.muted2};
  flex-shrink: 0;
`;

const RankStat = styled.span<{ $tone?: 'pos' | 'neg' | 'zero'; $small?: boolean }>`
  font-size: ${({ $small }) => ($small ? '0.7rem' : '0.82rem')};
  text-align: right;
  color: ${({ theme, $tone }) =>
    $tone === 'pos'
      ? theme.color.green
      : $tone === 'neg'
        ? theme.color.red
        : theme.color.muted2};
`;

const PurpleEm = styled.span`
  color: ${({ theme }) => theme.color.purple};
`;

const RankTotal = styled.span<{ $tone: 'pos' | 'neg' | 'zero' }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.9rem;
  font-weight: 700;
  text-align: right;
  color: ${({ theme, $tone }) =>
    $tone === 'pos'
      ? theme.color.green
      : $tone === 'neg'
        ? theme.color.red
        : theme.color.muted2};
`;

const places = ['1st Place', '2nd Place', '3rd Place'] as const;

export function LeaderboardPage() {
  const { entries, profiles } = useChallenge();
  const ranked = getTotals(entries, profiles);
  const freeCounts = getFreeCounts(entries);

  const empty = entries.length === 0 && Object.keys(profiles).length === 0;

  return (
    <div>
      <SectionHeader>
        <SectionTitle>Leaderboard</SectionTitle>
        <SectionSub>Overall standings including personal goal bonus points</SectionSub>
      </SectionHeader>

      <Podium>
        {empty ? (
          <EmptyMsg>No data yet — log your first day!</EmptyMsg>
        ) : (
          ranked.slice(0, 3).map((r, i) => {
            const place = (i + 1) as 1 | 2 | 3;
            return (
              <PodiumCard key={r.personId} $place={place}>
                <PodiumPlace $place={place}>{places[i]}</PodiumPlace>
                <PodiumAvatar $place={place}>{initials(r.name)}</PodiumAvatar>
                <PodiumName>{r.name}</PodiumName>
                <PodiumScore $place={place}>{r.pts}</PodiumScore>
                <PodiumPtsLabel>
                  {r.days} day{r.days !== 1 ? 's' : ''} logged
                </PodiumPtsLabel>
              </PodiumCard>
            );
          })
        )}
      </Podium>

      {!empty ? (
        <Rankings>
          <RankRow $header>
            <span>#</span>
            <span>Player</span>
            <span style={{ textAlign: 'right' }}>Days</span>
            <span style={{ textAlign: 'right' }}>Avg/Day</span>
            <span style={{ textAlign: 'right' }}>Goal Pts</span>
            <span style={{ textAlign: 'right' }}>Free Used</span>
            <span style={{ textAlign: 'right' }}>Total Pts</span>
          </RankRow>
          {ranked.map((r, i) => {
            const fc = freeCounts[r.personId] ?? { gym: 0, junk: 0 };
            const avg = r.days
              ? Math.round(((r.pts - r.profilePts) / r.days) * 10) / 10
              : 0;
            return (
              <RankRow key={r.personId}>
                <RankNum>{i + 1}</RankNum>
                <RankName>
                  <RankInitials>{initials(r.name)}</RankInitials>
                  {r.name}
                </RankName>
                <RankStat>{r.days}</RankStat>
                <RankStat $tone={ptsClass(avg)}>{fmtPts(avg)}</RankStat>
                <RankStat>
                  <PurpleEm>+{r.profilePts}</PurpleEm>
                </RankStat>
                <RankStat $small>
                  G:{fc.gym}/5 · J:{fc.junk}/5
                </RankStat>
                <RankTotal $tone={ptsClass(r.pts)}>{fmtPts(r.pts)}</RankTotal>
              </RankRow>
            );
          })}
        </Rankings>
      ) : null}
    </div>
  );
}
