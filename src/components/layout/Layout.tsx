import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '../../context/ChallengeContext';
import { NavBar } from './NavBar';
import { SheetSpinner } from './SheetSpinner';

const Main = styled.main`
  max-width: 980px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
`;

const SECONDARY_ROUTES = ['/board', '/history'];

export function Layout() {
  const { pathname } = useLocation();
  const { refreshFromSheets, syncing, loading, initError } = useChallenge();

  useEffect(() => {
    if (loading || initError) return;
    if (!SECONDARY_ROUTES.includes(pathname)) return;
    void refreshFromSheets();
  }, [pathname, refreshFromSheets, loading, initError]);

  return (
    <>
      <NavBar />
      <Main>
        <Outlet />
      </Main>
      <SheetSpinner visible={syncing && !loading && !initError} />
    </>
  );
}
