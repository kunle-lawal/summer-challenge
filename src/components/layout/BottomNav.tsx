import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { LogIcon, BoardIcon, HistoryIcon } from '@/components/ui/Icons';

const Nav = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  /* Total height = 64px + iOS home indicator area */
  height: calc(64px + env(safe-area-inset-bottom, 0px));
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background: linear-gradient(180deg, rgba(255,253,246,0) 0%, ${({ theme }) => theme.color.surface} 35%);
  z-index: 50;

  @media (min-width: 768px) {
    display: none;
  }
`;

const Item = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: ${({ theme }) => theme.color.ink3};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 6px 4px;
  text-decoration: none;

  svg {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    stroke-width: 1.6;
    fill: none;
  }

  &.active {
    color: ${({ theme }) => theme.color.ink};

    svg {
      stroke: ${({ theme }) => theme.color.ink};
    }
  }
`;

interface Props {
  slug: string;
}

export function BottomNav({ slug }: Props) {
  const base = `/c/${slug}`;
  return (
    <Nav>
      <Item to={base} end>
        <LogIcon />
        <span>Log</span>
      </Item>
      <Item to={`${base}/board`}>
        <BoardIcon />
        <span>Board</span>
      </Item>
      <Item to={`${base}/history`}>
        <HistoryIcon />
        <span>History</span>
      </Item>
    </Nav>
  );
}
