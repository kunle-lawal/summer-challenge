import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { buildLeaderboard } from '@/lib/rules/aggregate';
import { MemberBadge } from '@/components/ui/MemberBadge';
import type { MemberStanding } from '@/types';

// ── Styled components ─────────────────────────────────────────────────────────

const SHeader = styled.header`
  padding: 14px 16px 12px;
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
  font-weight: 400;
  margin-top: 2px;
  em { font-style: italic; }
`;

const Sub = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
  margin-top: 2px;
`;

const Body = styled.div`
  padding: 0 16px 24px;
`;

const SegRow = styled.div`
  margin: 14px 0;
`;

const Segs = styled.div`
  display: inline-flex;
  padding: 3px;
  background: ${({ theme }) => theme.color.bg2};
  border-radius: ${({ theme }) => theme.radii.pill};
  gap: 2px;
`;

const SegBtn = styled.button<{ $active: boolean }>`
  border: 0;
  background: ${({ theme, $active }) => $active ? theme.color.surface : 'transparent'};
  font: 500 12.5px/1 ${({ theme }) => theme.font.body};
  color: ${({ theme, $active }) => $active ? theme.color.ink : theme.color.ink2};
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.radii.pill};
  cursor: pointer;
  box-shadow: ${({ $active }) => $active ? '0 1px 2px rgba(24,23,15,0.06)' : 'none'};
  white-space: nowrap;
`;

const Podium = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: flex-end;
  gap: 6px;
  padding: 16px 4px 0;
`;

const PodiumCol = styled.div<{ $rank: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

const PodiumName = styled.div`
  font-weight: 600;
  font-size: 13px;
  text-align: center;
  margin-top: 4px;
`;

const PodiumPts = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-style: italic;
`;

const PodiumBlock = styled.div<{ $height: number; $rank: number }>`
  width: 100%;
  height: ${({ $height }) => $height}px;
  background: ${({ theme, $rank }) => $rank === 1 ? theme.color.accentTint : theme.color.surface2};
  border: 1px solid ${({ theme, $rank }) => $rank === 1 ? theme.color.accent : theme.color.hair};
  border-bottom: 0;
  border-radius: ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0 0;
  margin-top: 6px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 8px;
`;

const PodiumRank = styled.span<{ $rank: number }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 36px;
  line-height: 1;
  font-style: italic;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $rank }) => $rank === 1 ? theme.color.accent : theme.color.ink3};
`;

const SectionLbl = styled.div`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  padding: 18px 0 10px;
`;

const Card = styled.div`
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
  background: ${({ theme, $isYou }) => $isYou ? theme.color.accentTint : 'transparent'};
  cursor: pointer;
  &:last-child { border-bottom: 0; }
`;

const Rank = styled.span<{ $rank: number }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  font-style: ${({ $rank }) => $rank <= 3 ? 'normal' : 'italic'};
  color: ${({ theme, $rank }) => $rank === 1 ? theme.color.accent : theme.color.ink3};
  text-align: center;
`;

const MemberInfo = styled.div`flex: 1; min-width: 0;`;

const Name = styled.div`font-weight: 600; font-size: 14px;`;

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

const Expand = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: 1 / -1;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BarLabel = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  width: 56px;
`;

const Bar = styled.div`
  flex: 1;
  height: 6px;
  background: ${({ theme }) => theme.color.bg2};
  border-radius: ${({ theme }) => theme.radii.pill};
  overflow: hidden;
`;

const BarFill = styled.div<{ $width: number; $negative: boolean }>`
  height: 100%;
  width: ${({ $width }) => Math.min(100, $width)}%;
  background: ${({ theme, $negative }) => $negative ? theme.color.bad : theme.color.ink};
  border-radius: ${({ theme }) => theme.radii.pill};
`;

const BarVal = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 14px;
  width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

const FootNote = styled.p`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  color: ${({ theme }) => theme.color.ink3};
  padding: 16px 4px 0;
  line-height: 1.5;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 24px;
  color: ${({ theme }) => theme.color.ink3};
  font-size: 13.5px;
`;

// ── Component ─────────────────────────────────────────────────────────────────

type ViewMode = 'total' | 'perrule' | 'avgday';

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { challenge, activeMembers, entries } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const [view, setView] = useState<ViewMode>('total');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!challenge) return null;

  const board = buildLeaderboard(challenge, activeMembers, entries);
  const { standings } = board;
  const podium = [standings[1], standings[0], standings[2]]; // 2nd, 1st, 3rd
  const rest = standings.slice(3);

  const rules = challenge.config.rules.filter(r => r.kind !== 'streak');
  const maxPts = standings[0]?.totalPoints ?? 1;

  function getSubLine(s: MemberStanding): string {
    if (view === 'total') return `${s.daysLogged} days logged`;
    if (view === 'perrule') {
      return rules.slice(0, 3).map(r => `${r.name} ${(s.perRule[r.id] ?? 0).toFixed(0)}`).join(' · ');
    }
    if (s.daysLogged === 0) return '0/day';
    return `${(s.totalPoints / s.daysLogged).toFixed(2)}/day · ${s.daysLogged} days`;
  }

  function getDisplayPts(s: MemberStanding): string {
    if (view === 'avgday' && s.daysLogged > 0) {
      return (s.totalPoints / s.daysLogged).toFixed(2);
    }
    return s.totalPoints.toFixed(1);
  }

  const weekNum = Math.max(1, Math.floor(
    (new Date().getTime() - new Date(challenge.config.weekAnchor + 'T00:00:00Z').getTime()) / (7 * 86400000)
  ) + 1);

  return (
    <>
      <SHeader>
        <Eyebrow>{challenge.name} · Week {weekNum}</Eyebrow>
        <Title>Lead<em>er</em>board</Title>
        <Sub>{activeMembers.length} active · {board.totalEntries} entries</Sub>
      </SHeader>

      <Body>
        <SegRow>
          <Segs>
            {(['total', 'perrule', 'avgday'] as ViewMode[]).map(v => (
              <SegBtn key={v} $active={view === v} onClick={() => setView(v)}>
                {v === 'total' ? 'Total' : v === 'perrule' ? 'Per rule' : 'Avg/day'}
              </SegBtn>
            ))}
          </Segs>
        </SegRow>

        {/* Podium */}
        {standings.length > 0 && (
          <Podium>
            {podium.map((s, i) => {
              if (!s) return <div key={i} />;
              const heights = [86, 104, 72];
              const realRank = [2, 1, 3][i] ?? 1;
              return (
                <PodiumCol key={s.memberId} $rank={realRank}>
                  <MemberBadge member={{ name: s.memberName }} isYou={s.memberId === selectedMemberId} size={realRank === 1 ? 'lg' : 'md'} />
                  <PodiumName>{s.memberName}</PodiumName>
                  <PodiumPts>{s.totalPoints.toFixed(1)}</PodiumPts>
                  <PodiumBlock $height={heights[i] ?? 72} $rank={realRank}>
                    <PodiumRank $rank={realRank}>{realRank}</PodiumRank>
                  </PodiumBlock>
                </PodiumCol>
              );
            })}
          </Podium>
        )}

        <SectionLbl>Standings</SectionLbl>

        <Card>
          {standings.length === 0 && <EmptyState>No entries yet. Start logging!</EmptyState>}
          {standings.map(s => {
            const isExp = expanded === s.memberId;
            return (
              <div key={s.memberId}>
                <LbRow
                  $isYou={s.memberId === selectedMemberId}
                  $rank={s.rank}
                  onClick={() => {
                    setExpanded(isExp ? null : s.memberId);
                    navigate(`/c/${slug}/m/${s.memberId}`);
                  }}
                >
                  <Rank $rank={s.rank}>{s.rank}</Rank>
                  <MemberBadge member={{ name: s.memberName }} isYou={s.memberId === selectedMemberId} />
                  <MemberInfo>
                    <Name>{s.memberName}</Name>
                    <SubLine>{getSubLine(s)}</SubLine>
                    {isExp && (
                      <Expand>
                        {rules.map(r => {
                          const pts = s.perRule[r.id] ?? 0;
                          return (
                            <BarRow key={r.id}>
                              <BarLabel>{r.name.slice(0, 8)}</BarLabel>
                              <Bar>
                                <BarFill $width={Math.abs(pts) / maxPts * 100} $negative={pts < 0} />
                              </Bar>
                              <BarVal>{pts > 0 ? '+' : ''}{pts.toFixed(0)}</BarVal>
                            </BarRow>
                          );
                        })}
                      </Expand>
                    )}
                  </MemberInfo>
                  <div>
                    <Pts>{getDisplayPts(s)}</Pts>
                  </div>
                </LbRow>
              </div>
            );
          })}
          {rest.length > 0 && <div style={{ display: 'none' }}>{rest.length}</div>}
        </Card>

        <FootNote>
          Tap a row to view member profile. Removed members are hidden · see History for full record.
        </FootNote>
      </Body>
    </>
  );
}
