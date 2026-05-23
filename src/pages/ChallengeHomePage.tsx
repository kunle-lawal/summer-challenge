import { useNavigate, useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { buildLeaderboard, buildWeeklySummary } from '@/lib/rules/aggregate';
import { todayInTz, diffDays } from '@/lib/dates';
import { PlusIcon, GearIcon } from '@/components/ui/Icons';
import { MemberBadge } from '@/components/ui/MemberBadge';

// ── Styled components ─────────────────────────────────────────────────────────

const PageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
`;

const Eyebrow = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 30px;
  line-height: 0.96;
  font-weight: 400;
  margin-top: 2px;
  em { font-style: italic; }
`;

const IconRow = styled.div`
  display: flex;
  gap: 6px;
  margin-left: auto;
`;

const IconBtn = styled.button`
  width: 36px; height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.color.ink};
  svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 1.6; fill: none; }
`;

const ScreenBody = styled.div`
  padding: 0 16px;
  padding-bottom: 24px;
`;

const HeroStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface2};
  margin-top: 14px;
  overflow: hidden;
`;

const HeroStat = styled.div`
  padding: 14px;
  border-right: 1px solid ${({ theme }) => theme.color.hair};
  &:last-child { border-right: 0; }
`;

const HeroVal = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 30px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  em { font-style: italic; color: ${({ theme }) => theme.color.accent}; }
  span.dim { font-size: 14px; color: ${({ theme }) => theme.color.ink3}; font-style: italic; }
`;

const HeroLabel = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 4px;
`;

const YouCard = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 14px;
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const YouInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const YouEyebrow = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

const YouName = styled.div`
  font-weight: 600;
  font-size: 17px;
  color: ${({ theme }) => theme.color.ink};
  margin-top: 2px;
`;

const YouMeta = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 3px;
  letter-spacing: 0.04em;
`;

const GhostBtn = styled.button`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.color.hair};
  background: transparent;
  color: ${({ theme }) => theme.color.ink};
  font: 500 13px/1 ${({ theme }) => theme.font.body};
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  flex-shrink: 0;
`;

const CtaLog = styled.button`
  margin-top: 14px;
  width: 100%;
  background: ${({ theme }) => theme.color.ink};
  color: ${({ theme }) => theme.color.surface};
  border: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: #000; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const CtaText = styled.div`
  text-align: left;
`;

const CtaEyebrow = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accentInk};
  opacity: 0.7;
  margin-bottom: 2px;
`;

const CtaTitle = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 26px;
  line-height: 1.1;
  color: ${({ theme }) => theme.color.surface};
`;

const CtaArrow = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 30px;
  color: ${({ theme }) => theme.color.accent};
  font-style: italic;
`;

const SectionRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 22px;
  margin-bottom: 10px;
`;

const SectionLbl = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

const FullBoardLink = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  font: 500 13px/1 ${({ theme }) => theme.font.body};
  color: ${({ theme }) => theme.color.ink};
  cursor: pointer;
  padding: 4px 8px;
`;

const StandingsCard = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`;

const LbRow = styled.div<{ $isYou: boolean; $rank: number }>`
  display: grid;
  grid-template-columns: 28px 36px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  cursor: pointer;
  background: ${({ theme, $isYou }) => $isYou ? theme.color.accentTint : 'transparent'};
  &:last-child { border-bottom: 0; }
`;

const Rank = styled.span<{ $rank: number }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  font-style: ${({ $rank }) => $rank === 1 ? 'normal' : 'italic'};
  color: ${({ theme, $rank }) => $rank === 1 ? theme.color.accent : theme.color.ink3};
  text-align: center;
`;

const MemberInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MemberName = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const SubLine = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 3px;
`;

const Pts = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  text-align: right;
`;

const WeekStrip = styled.div`
  background: ${({ theme }) => theme.color.surface2};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
`;

const WeekStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const WeekStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const WeekVal = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 26px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  span.dim { font-size: 14px; color: ${({ theme }) => theme.color.ink3}; font-style: italic; }
`;

const WeekLabel = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

const Banner = styled.div`
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.hair2};
  background: ${({ theme }) => theme.color.bg2};
  margin-top: 8px;
`;

const BannerTitle = styled.strong`
  font-weight: 600;
  font-size: 14px;
  display: block;
  margin-bottom: 4px;
`;

const BodySm = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.ink3};
  line-height: 1.5;
`;

const FootNote = styled.p`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  color: ${({ theme }) => theme.color.ink3};
  padding: 22px 4px 4px;
  line-height: 1.5;
  font-style: italic;
`;

// ── Component ─────────────────────────────────────────────────────────────────

export function ChallengeHomePage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { challenge, activeMembers, entries, isEnded } = useChallenge();
  const { selectedMemberId } = useSelectedMember();

  if (!challenge) return null;

  const tz = challenge.config.timezone;
  const today = todayInTz(tz);
  const startDate = challenge.config.startDate;
  const endDate = challenge.config.endDate;
  const weekAnchor = challenge.config.weekAnchor;

  const hasStarted = today >= startDate;
  const isPreStart = !hasStarted;

  const daysLeft = endDate ? Math.max(0, diffDays(endDate, today)) : null;
  const totalDays = endDate ? diffDays(endDate, startDate) + 1 : null;
  const weekNum = Math.max(1, Math.floor(diffDays(today, weekAnchor) / 7) + 1);
  const totalWeeks = totalDays ? Math.ceil(totalDays / 7) : null;

  const leaderboard = buildLeaderboard(challenge, activeMembers, entries);
  const top3 = leaderboard.standings.slice(0, 3);

  const me = activeMembers.find(m => m.id === selectedMemberId);
  const myStanding = leaderboard.standings.find(s => s.memberId === selectedMemberId);
  const myEntries = entries.filter(e => e.memberId === selectedMemberId);
  const myWeekly = me
    ? buildWeeklySummary(challenge, me, myEntries, today)
    : null;

  const activeModeLabel = isPreStart ? 'Not started yet' : isEnded ? 'Challenge ended' : 'Log today';
  const canLog = !isPreStart && !isEnded;

  // Collect week rule summaries for display (binary+penalty rules only, max 3)
  const weekStats = myWeekly
    ? challenge.config.rules
        .filter(r => r.kind === 'binary' || r.kind === 'penalty')
        .slice(0, 3)
        .map(r => {
          const usage = myWeekly.perRule[r.id];
          return { name: r.name, used: usage?.used ?? 0, cap: usage?.cap ?? null };
        })
    : [];

  return (
    <>
      <PageHeader>
        <div style={{ flex: 1 }}>
          <Eyebrow>Summer · {new Date(startDate).getFullYear()}</Eyebrow>
          <Title>
            {challenge.name.split(' ').slice(0, -1).join(' ')}<br />
            <em>{challenge.name.split(' ').slice(-1)[0]}</em>
          </Title>
        </div>
        <IconRow>
          <IconBtn as={Link} to="/new" aria-label="New challenge"><PlusIcon /></IconBtn>
          <IconBtn as={Link} to={`/c/${slug}/admin`} aria-label="Settings"><GearIcon /></IconBtn>
        </IconRow>
      </PageHeader>

      <ScreenBody>
        {isEnded && (
          <Banner>
            <BannerTitle>This challenge ended. Final standings.</BannerTitle>
            <BodySm>Browse the full board below.</BodySm>
          </Banner>
        )}
        {isPreStart && (
          <Banner>
            <BannerTitle>Starts {startDate}</BannerTitle>
            <BodySm>Logging unlocks on start day.</BodySm>
          </Banner>
        )}

        <HeroStats>
          <HeroStat>
            <HeroVal><em>{weekNum}</em>{totalWeeks ? <span className="dim">/{totalWeeks}</span> : ''}</HeroVal>
            <HeroLabel>Week</HeroLabel>
          </HeroStat>
          <HeroStat>
            <HeroVal>{daysLeft ?? '∞'}</HeroVal>
            <HeroLabel>Days left</HeroLabel>
          </HeroStat>
          <HeroStat>
            <HeroVal>{activeMembers.length}</HeroVal>
            <HeroLabel>Members</HeroLabel>
          </HeroStat>
        </HeroStats>

        {me && myStanding && (
          <YouCard>
            <MemberBadge member={me} size="lg" isYou />
            <YouInfo>
              <YouEyebrow>You are</YouEyebrow>
              <YouName>{me.name}</YouName>
              <YouMeta>
                {myStanding.totalPoints.toFixed(1)} pts · Rank {myStanding.rank}
              </YouMeta>
            </YouInfo>
            <GhostBtn onClick={() => navigate(`/c/${slug}/pick`)}>Switch</GhostBtn>
          </YouCard>
        )}

        {!me && (
          <YouCard style={{ cursor: 'pointer' }} onClick={() => navigate(`/c/${slug}/pick`)}>
            <div style={{ flex: 1 }}>
              <YouEyebrow>Who are you?</YouEyebrow>
              <YouName>Pick your name</YouName>
            </div>
            <GhostBtn as="span">Pick →</GhostBtn>
          </YouCard>
        )}

        <CtaLog onClick={() => navigate(`/c/${slug}/log`)} disabled={!canLog}>
          <CtaText>
            <CtaEyebrow>{today}</CtaEyebrow>
            <CtaTitle>{activeModeLabel}</CtaTitle>
          </CtaText>
          <CtaArrow>→</CtaArrow>
        </CtaLog>

        <SectionRow>
          <SectionLbl>Current standings</SectionLbl>
          <FullBoardLink onClick={() => navigate(`/c/${slug}/board`)}>Full board →</FullBoardLink>
        </SectionRow>

        <StandingsCard>
          {top3.length === 0 && (
            <div style={{ padding: '20px 14px', fontSize: 13, color: '#8a8473' }}>
              No entries yet.
            </div>
          )}
          {top3.map(s => (
            <LbRow
              key={s.memberId}
              $isYou={s.memberId === selectedMemberId}
              $rank={s.rank}
              onClick={() => navigate(`/c/${slug}/board`)}
            >
              <Rank $rank={s.rank}>{s.rank}</Rank>
              <MemberBadge
                member={{ name: s.memberName }}
                size="md"
                isYou={s.memberId === selectedMemberId}
              />
              <MemberInfo>
                <MemberName>{s.memberName}</MemberName>
                <SubLine>{s.daysLogged} days logged</SubLine>
              </MemberInfo>
              <div>
                <Pts>{s.totalPoints.toFixed(1)}</Pts>
              </div>
            </LbRow>
          ))}
        </StandingsCard>

        {weekStats.length > 0 && (
          <>
            <SectionRow>
              <SectionLbl>Your week</SectionLbl>
              <SectionLbl>WK {myWeekly?.weekNumber}</SectionLbl>
            </SectionRow>
            <WeekStrip>
              <WeekStats>
                {weekStats.map(ws => (
                  <WeekStat key={ws.name}>
                    <WeekVal>
                      {ws.used}
                      {ws.cap !== null && <span className="dim">/{ws.cap}</span>}
                    </WeekVal>
                    <WeekLabel>{ws.name}</WeekLabel>
                  </WeekStat>
                ))}
              </WeekStats>
            </WeekStrip>
          </>
        )}

        <FootNote>
          Want your own?{' '}
          <Link to="/new" style={{ color: '#18170f', textDecoration: 'underline' }}>
            Create a challenge
          </Link>{' '}
          in under a minute.
        </FootNote>
      </ScreenBody>
    </>
  );
}
