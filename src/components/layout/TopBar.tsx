/**
 * Desktop sidebar navigation — visible only at ≥ 768 px.
 * On mobile the BottomNav takes over; both are hidden simultaneously via CSS.
 */
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { HomeIcon, LogIcon, BoardIcon, HistoryIcon } from '@/components/ui/Icons';

const Sidebar = styled.nav`
  display: none;

  @media (min-width: 768px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 200px;
    padding: 28px 12px;
    background: ${({ theme }) => theme.color.surface};
    border-right: 1px solid ${({ theme }) => theme.color.hair};
    z-index: 50;
    gap: 4px;
  }
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.ink};
  padding: 0 8px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.color.hair};
  margin-bottom: 8px;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Item = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.color.ink3};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 9px 12px;
  text-decoration: none;
  transition: background 0.1s, color 0.1s;

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    stroke-width: 1.6;
    fill: none;
    flex-shrink: 0;
  }

  &:hover {
    background: ${({ theme }) => theme.color.surface2 ?? theme.color.hair};
    color: ${({ theme }) => theme.color.ink};
  }

  &.active {
    color: ${({ theme }) => theme.color.ink};
    background: ${({ theme }) => theme.color.hair};
  }
`;

interface Props {
  slug: string;
  challengeName: string;
}

export function TopBar({ slug, challengeName }: Props) {
  const base = `/c/${slug}`;
  return (
    <Sidebar>
      <Brand title={challengeName}>{challengeName}</Brand>
      <Item to={base} end>
        <HomeIcon />
        Home
      </Item>
      <Item to={`${base}/log`}>
        <LogIcon />
        Log day
      </Item>
      <Item to={`${base}/board`}>
        <BoardIcon />
        Leaderboard
      </Item>
      <Item to={`${base}/history`}>
        <HistoryIcon />
        History
      </Item>
    </Sidebar>
  );
}
