import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { Icon, type IconName } from '@/components/ui/Icons';

/**
 * Primary navigation. Four tabs, per the design.
 *
 * Log day is deliberately not a tab — it's the primary call to action on Home,
 * which is what the Home screen is built around. Recorded in
 * docs/REDESIGN_DECISIONS.md.
 */

const Nav = styled.nav`
  flex: 0 0 auto;
  display: flex;
  gap: 4px;
  padding: 8px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  background: ${({ theme }) => theme.color.surface};
  border-top: 1px solid ${({ theme }) => theme.color.hair};
`;

const Tab = styled(NavLink)`
  flex: 1;
  min-width: 0;
  min-height: 52px;
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
  text-decoration: none;
  transition: color 0.18s;

  svg { width: 21px; height: 21px; stroke-width: 1.8; }

  &:hover { color: ${({ theme }) => theme.color.ink}; text-decoration: none; }

  /* State is carried by weight and colour together, never colour alone (§3). */
  &.active {
    color: ${({ theme }) => theme.color.ink};
    svg { stroke-width: 2.2; }
  }
`;

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '', label: 'Home', icon: 'home', end: true },
  { to: 'board', label: 'Board', icon: 'board' },
  { to: 'history', label: 'History', icon: 'history' },
  { to: 'rules', label: 'Rules', icon: 'rules' },
];

export function BottomNav({ slug }: { slug: string }) {
  return (
    <Nav aria-label="Main">
      {TABS.map(t => (
        <Tab
          key={t.label}
          to={t.to ? `/c/${slug}/${t.to}` : `/c/${slug}`}
          end={t.end}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {({ isActive }) => (
            <>
              <Icon name={t.icon} aria-current={isActive ? 'page' : undefined} />
              {t.label}
            </>
          )}
        </Tab>
      ))}
    </Nav>
  );
}
