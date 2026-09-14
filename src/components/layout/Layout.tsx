import { Outlet } from 'react-router-dom';
import { useChallenge } from '@/context/ChallengeContext';
import { Screen } from './Screen';
import { BottomNav } from './BottomNav';

/**
 * Chrome shell: a scrolling screen with the tab bar pinned beneath it.
 *
 * There is no desktop sidebar. The design specifies a single 390px layout, so
 * `Screen` caps and centres the column rather than inventing a wide variant.
 */
export function Layout() {
  const { challenge } = useChallenge();
  return (
    <Screen>
      <Outlet />
      {challenge && <BottomNav slug={challenge.slug} />}
    </Screen>
  );
}
