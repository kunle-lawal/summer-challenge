import { Navigate } from 'react-router-dom';
import { getMostRecentChallenge } from '@/lib/recentChallenges';

export function RootRedirect() {
  const recent = getMostRecentChallenge();
  if (recent) {
    return <Navigate to={`/c/${recent.slug}`} replace />;
  }
  return <Navigate to="/new" replace />;
}
