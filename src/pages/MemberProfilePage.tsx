import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { buildLeaderboard, buildWeeklySummary } from '@/lib/rules/aggregate';
import { todayInTz } from '@/lib/dates';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { ArrowIcon } from '@/components/ui/Icons';
import type { Entry } from '@/types';

// ── Styled components ─────────────────────────────────────────────────────────

const PageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
`;

const BackBtn = styled.button`
  width: 36px; height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  svg { width: 18px; height: 18px; stroke: ${({ theme }) => theme.color.ink}; stroke-width: 1.6; fill: none; }
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

const Body = styled.div`
  padding: 0 16px 24px;
`;

const HeroCard = styled.div`
  background: ${({ theme }) => theme.color.surface2};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 16px;
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
`;

const HeroInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const HeroName = styled.div`
  font-weight: 600;
  font-size: 17px;
  color: ${({ theme }) => theme.color.ink};
`;

const HeroMeta = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 3px;
`;

const HeroPts = styled.div`
  text-align: right;
`;

const PtsVal = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 36px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.ink};
  font-style: italic;
`;

const PtsLabel = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 2px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface2};
  margin-top: 14px;
  overflow: hidden;
`;

const StatCell = styled.div`
  padding: 14px;
  border-right: 1px solid ${({ theme }) => theme.color.hair};
  &:last-child { border-right: 0; }
`;

const StatVal = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 26px;
  line-height: 1;
  color: ${({ theme }) => theme.color.ink};
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 4px;
`;

const SectionLbl = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  font-weight: 500;
  padding: 18px 0 10px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0;
  overflow: hidden;
`;

const RuleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  &:last-child { border-bottom: 0; }
`;

const RuleName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.color.ink};
`;

const RuleKind = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 2px;
`;

const Bar = styled.div`
  flex: 1;
  height: 4px;
  background: ${({ theme }) => theme.color.bg2};
  border-radius: ${({ theme }) => theme.radii.pill};
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $negative: boolean }>`
  height: 100%;
  width: ${({ $pct }) => Math.abs($pct)}%;
  background: ${({ theme, $negative }) => $negative ? theme.color.bad : theme.color.ink};
  border-radius: ${({ theme }) => theme.radii.pill};
`;

const RulePts = styled.div<{ $negative: boolean }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 18px;
  color: ${({ theme, $negative }) => $negative ? theme.color.bad : theme.color.ink};
  font-variant-numeric: tabular-nums;
  min-width: 48px;
  text-align: right;
`;

const RecentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EntryItem = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
`;

const EntryDate = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const EntryRulesLine = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.ink2};
  margin-top: 2px;
`;

const EntryPts = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  color: ${({ theme }) => theme.color.ink};
  font-variant-numeric: tabular-nums;
  font-style: italic;
`;

const YouBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.color.ink};
  color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 9px;
  letter-spacing: 0.04em;
  margin-left: 6px;
`;

const RankBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.color.bg2};
  color: ${({ theme }) => theme.color.ink2};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.04em;
`;

const NotFound = styled.div`
  padding: 40px 24px;
  text-align: center;
  color: ${({ theme }) => theme.color.ink3};
  font-size: 13.5px;
`;

// ── Component ─────────────────────────────────────────────────────────────────

export function MemberProfilePage() {
  const { slug, memberId } = useParams<{ slug: string; memberId: string }>();
  const navigate = useNavigate();
  const { challenge, members, activeMembers, entries } = useChallenge();
  const { selectedMemberId } = useSelectedMember();

  if (!challenge) return null;

  const member = members.find(m => m.id === memberId);

  if (!member) {
    return (
      <NotFound>
        <p>Member not found.</p>
        <button onClick={() => navigate(`/c/${slug}/board`)} style={{ marginTop: 12, textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer', fontSize: 13 }}>
          Back to leaderboard
        </button>
      </NotFound>
    );
  }

  const isYou = memberId === selectedMemberId;
  const tz = challenge.config.timezone;
  const today = todayInTz(tz);

  const memberEntries = entries.filter((e: Entry) => e.memberId === memberId);
  const leaderboard = buildLeaderboard(challenge, activeMembers, entries);
  const standing = leaderboard.standings.find(s => s.memberId === memberId);
  const weeklySummary = buildWeeklySummary(challenge, member, memberEntries, today);

  const totalPts = standing?.totalPoints ?? 0;
  const daysLogged = standing?.daysLogged ?? 0;
  const rank = standing?.rank ?? null;
  const avgPerDay = daysLogged > 0 ? totalPts / daysLogged : 0;

  const rules = challenge.config.rules.filter(r => r.kind !== 'streak');
  const maxRulePts = Math.max(1, ...rules.map(r => Math.abs(standing?.perRule[r.id] ?? 0)));

  const recentEntries = [...memberEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <>
      <PageHeader>
        <BackBtn onClick={() => navigate(-1)} aria-label="Back">
          <ArrowIcon />
        </BackBtn>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>Member</Eyebrow>
          <Title>{member.name.split(' ')[0]}<em>'s profile</em></Title>
        </div>
      </PageHeader>

      <Body>
        <HeroCard>
          <MemberBadge member={member} size="xl" isYou={isYou} />
          <HeroInfo>
            <HeroName>
              {member.name}
              {isYou && <YouBadge>you</YouBadge>}
            </HeroName>
            <HeroMeta>
              {rank !== null ? `Rank ${rank}` : 'Unranked'} · {daysLogged} days logged
            </HeroMeta>
            {rank !== null && (
              <RankBadge style={{ marginTop: 6 }}>#{rank} of {activeMembers.length}</RankBadge>
            )}
          </HeroInfo>
          <HeroPts>
            <PtsVal>{totalPts.toFixed(1)}</PtsVal>
            <PtsLabel>Total pts</PtsLabel>
          </HeroPts>
        </HeroCard>

        <StatsGrid>
          <StatCell>
            <StatVal>{daysLogged}</StatVal>
            <StatLabel>Days</StatLabel>
          </StatCell>
          <StatCell>
            <StatVal>{avgPerDay.toFixed(1)}</StatVal>
            <StatLabel>Per day</StatLabel>
          </StatCell>
          <StatCell>
            <StatVal>Wk {weeklySummary.weekNumber}</StatVal>
            <StatLabel>Current</StatLabel>
          </StatCell>
        </StatsGrid>

        <SectionLbl>Per rule breakdown</SectionLbl>
        <Card>
          {rules.map(r => {
            const pts = standing?.perRule[r.id] ?? 0;
            const pct = maxRulePts > 0 ? (pts / maxRulePts) * 100 : 0;
            return (
              <RuleRow key={r.id}>
                <div style={{ minWidth: 0, flex: '0 0 96px' }}>
                  <RuleName>{r.emoji ? `${r.emoji} ${r.name}` : r.name}</RuleName>
                  <RuleKind>{r.kind}</RuleKind>
                </div>
                <Bar>
                  <BarFill $pct={pct} $negative={pts < 0} />
                </Bar>
                <RulePts $negative={pts < 0}>
                  {pts > 0 ? '+' : ''}{pts.toFixed(1)}
                </RulePts>
              </RuleRow>
            );
          })}
        </Card>

        <SectionLbl>Recent entries</SectionLbl>
        {recentEntries.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, padding: '8px 0' }}>No entries yet.</div>
        ) : (
          <RecentList>
            {recentEntries.map(e => {
              const ruleIds = Object.keys(e.values);
              const ruleNames = ruleIds
                .map(id => rules.find(r => r.id === id)?.name)
                .filter(Boolean)
                .slice(0, 3)
                .join(', ');
              return (
                <EntryItem key={e.id}>
                  <div>
                    <EntryDate>{e.date}</EntryDate>
                    <EntryRulesLine>{ruleNames || 'Logged'}{ruleIds.length > 3 ? ` +${ruleIds.length - 3} more` : ''}</EntryRulesLine>
                  </div>
                  <EntryPts>—</EntryPts>
                </EntryItem>
              );
            })}
          </RecentList>
        )}
      </Body>
    </>
  );
}
