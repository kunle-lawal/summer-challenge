import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * The signed-in account, or null.
 *
 * `loading` is true until Firebase has restored any existing session. Rendering
 * anything that reads Firestore before that resolves produces a burst of
 * permission-denied errors, because the rules require `request.auth`.
 */
export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Convenience — `user?.uid ?? null`, which is what every write needs. */
  uid: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, next => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, uid: user?.uid ?? null }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
