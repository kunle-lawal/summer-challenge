import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSelectedPerson } from '../../context/SelectedPersonContext';
import { todayDisplay } from '../../lib/dates';

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  position: sticky;
  top: 0;
  background: rgba(14, 14, 14, 0.95);
  backdrop-filter: blur(8px);
  z-index: 100;
  gap: 12px;

  @media (max-width: 740px) {
    padding: 1rem;
    flex-wrap: wrap;
  }
`;

const Logo = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.gold};
  text-transform: uppercase;
  white-space: nowrap;
`;

const NavDate = styled.span`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.color.muted2};
  white-space: nowrap;

  @media (max-width: 740px) {
    display: none;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
`;

const TabBtn = styled(NavLink)`
  background: none;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 6px 14px;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color.muted2};
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.color.text};
    border-color: ${({ theme }) => theme.color.border2};
  }

  &.active {
    color: ${({ theme }) => theme.color.gold};
    border-color: ${({ theme }) => theme.color.gold};
    background: ${({ theme }) => theme.color.goldDim};
  }
`;

const SwitchUserBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.color.border2};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 6px 12px;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 0.72rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color.muted2};
  cursor: pointer;
  white-space: nowrap;
  margin-left: 4px;
  transition: all 0.15s;

  &:hover {
    color: ${({ theme }) => theme.color.text};
    border-color: ${({ theme }) => theme.color.border2};
    background: ${({ theme }) => theme.color.surface2};
  }
`;

const tabs: { to: string; label: string }[] = [
  { to: '/log', label: 'Log Day' },
  { to: '/board', label: 'Leaderboard' },
  { to: '/history', label: 'History' },
];

export function NavBar() {
  const navigate = useNavigate();
  const { person, clearSelectedPerson } = useSelectedPerson();

  const switchUser = () => {
    clearSelectedPerson();
    navigate('/pick', { replace: true });
  };

  return (
    <Nav>
      <Logo>Summer Challenge</Logo>
      <NavDate>{todayDisplay()}</NavDate>
      <Tabs>
        {tabs.map((t) => (
          <TabBtn
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {t.label}
          </TabBtn>
        ))}
        {person ? (
          <SwitchUserBtn type="button" onClick={switchUser}>
            Switch user
          </SwitchUserBtn>
        ) : null}
      </Tabs>
    </Nav>
  );
}
