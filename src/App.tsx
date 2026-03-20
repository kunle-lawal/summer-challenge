import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoadingOverlay } from './components/layout/LoadingOverlay';
import { useChallenge } from './context/ChallengeContext';
import { useSelectedPerson } from './context/SelectedPersonContext';
import { getStoredPerson } from './lib/selectedPersonStorage';
import { HistoryPage } from './pages/HistoryPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LogDayPage } from './pages/LogDayPage';
import { PickUserPage } from './pages/PickUserPage';

function HomeRedirect() {
  const { person } = useSelectedPerson();
  return <Navigate to={person ? '/log' : '/pick'} replace />;
}

function RequirePerson({ children }: { children: ReactNode }) {
  const { person } = useSelectedPerson();
  if (!person) return <Navigate to="/pick" replace />;
  return children;
}

export function App() {
  const { loading, initError } = useChallenge();
  const storedPerson = getStoredPerson();
  const loadingMessage = storedPerson
    ? `Welcome back, ${storedPerson.name}. Loading data…`
    : 'Loading data…';

  if (loading || initError) {
    return (
      <LoadingOverlay
        open
        message={loading ? loadingMessage : (initError ?? '')}
      />
    );
  }

  return (
    <Routes>
      <Route path="/pick" element={<PickUserPage />} />
      <Route element={<Layout />}>
        <Route
          path="/log"
          element={
            <RequirePerson>
              <LogDayPage />
            </RequirePerson>
          }
        />
        <Route path="/board" element={<LeaderboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
