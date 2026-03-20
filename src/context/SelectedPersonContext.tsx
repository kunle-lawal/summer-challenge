import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  clearStoredPersonId,
  getStoredPerson,
  writeStoredPersonId,
} from '../lib/selectedPersonStorage';
import type { Person } from '../types';

export interface SelectedPersonContextValue {
  person: Person | null;
  setSelectedPerson: (p: Person) => void;
  clearSelectedPerson: () => void;
}

const SelectedPersonContext = createContext<SelectedPersonContextValue | null>(
  null,
);

function initialPerson(): Person | null {
  const p = getStoredPerson();
  if (!p) {
    clearStoredPersonId();
    return null;
  }
  return p;
}

export function SelectedPersonProvider({ children }: { children: ReactNode }) {
  const [person, setPerson] = useState<Person | null>(initialPerson);

  const setSelectedPerson = useCallback((p: Person) => {
    writeStoredPersonId(p.id);
    setPerson(p);
  }, []);

  const clearSelectedPerson = useCallback(() => {
    clearStoredPersonId();
    setPerson(null);
  }, []);

  const value = useMemo<SelectedPersonContextValue>(
    () => ({
      person,
      setSelectedPerson,
      clearSelectedPerson,
    }),
    [person, setSelectedPerson, clearSelectedPerson],
  );

  return (
    <SelectedPersonContext.Provider value={value}>
      {children}
    </SelectedPersonContext.Provider>
  );
}

export function useSelectedPerson(): SelectedPersonContextValue {
  const ctx = useContext(SelectedPersonContext);
  if (!ctx) {
    throw new Error(
      'useSelectedPerson must be used within SelectedPersonProvider',
    );
  }
  return ctx;
}
