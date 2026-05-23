import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.color.surface};
  position: relative;

  @media (min-width: 768px) {
    margin-left: 200px;
  }
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  /* Space for fixed bottom nav + safe area on mobile */
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));

  @media (min-width: 768px) {
    padding-bottom: 24px;
  }
`;

export function Layout() {
  const { challenge } = useChallenge();
  return (
    <>
      {challenge && <TopBar slug={challenge.slug} challengeName={challenge.name} />}
      <Page>
        <Main>
          <Outlet />
        </Main>
        {challenge && <BottomNav slug={challenge.slug} />}
      </Page>
    </>
  );
}
