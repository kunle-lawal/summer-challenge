import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { MemberBadge } from '@/components/ui/MemberBadge';
import { XIcon, ChevRightIcon } from '@/components/ui/Icons';

const Page = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.bg};
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.color.hair2};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink2};
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

const Body = styled.div`
  flex: 1;
  padding: 32px 24px 40px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 34px;
  font-weight: 400;
  line-height: 1;
  color: ${({ theme }) => theme.color.ink};
  em { font-style: italic; }
`;

const Subtitle = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 8px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 28px;
`;

const MemberBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.1s, transform 0.1s;
  &:hover { background: ${({ theme }) => theme.color.surface2}; }
  &:active { transform: scale(0.99); }
`;

const MemberName = styled.span`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.color.ink};
`;

const MemberMeta = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.ink3};
  letter-spacing: 0.04em;
  margin-top: 2px;
`;

const Grow = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const ChevIcon = styled.span`
  svg { width: 16px; height: 16px; stroke: ${({ theme }) => theme.color.ink3}; stroke-width: 1.6; fill: none; }
`;

const EmptyMsg = styled.p`
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.ink3};
  text-align: center;
  padding: 32px 0;
`;

const FootNote = styled.p`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: 24px;
  line-height: 1.5;
  font-style: italic;
`;

export function PickMemberPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { challenge, activeMembers } = useChallenge();
  const { setSelectedMemberId, selectedMemberId } = useSelectedMember();

  const handlePick = (memberId: string) => {
    setSelectedMemberId(memberId);
    navigate(`/c/${slug}/log`);
  };

  const handleClose = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(`/c/${slug}`);
  };

  return (
    <Page>
      <TopBar>
        <Pill>{challenge?.name ?? '…'}</Pill>
        <IconBtn onClick={handleClose} aria-label="Close">
          <XIcon />
        </IconBtn>
      </TopBar>

      <Body>
        <Title>Who's <em>logging in?</em></Title>
        <Subtitle>This stays saved on this device.</Subtitle>

        <List>
          {activeMembers.length === 0 && (
            <EmptyMsg>No members yet. Ask the owner to add you.</EmptyMsg>
          )}
          {activeMembers.map(m => (
            <MemberBtn key={m.id} onClick={() => handlePick(m.id)}>
              <MemberBadge member={m} size="lg" />
              <Grow>
                <MemberName>{m.name}</MemberName>
                {selectedMemberId === m.id && (
                  <MemberMeta>Currently selected</MemberMeta>
                )}
              </Grow>
              <ChevIcon><ChevRightIcon /></ChevIcon>
            </MemberBtn>
          ))}
        </List>

        <FootNote>Not on the list? Ask the owner to add you.</FootNote>
      </Body>
    </Page>
  );
}
