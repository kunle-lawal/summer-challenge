/**
 * SelectedMemberContext — which member "I am" in the current challenge.
 *
 * Identity in v2 is per-challenge and per-device: a user picks their name
 * once and the choice is cached in localStorage under `sc:selected:{slug}`.
 * The same human can be "Alice" in challenge A and "Bob" in challenge B.
 *
 * Edge cases handled:
 *   - Slug change (user navigates between challenges) → re-reads localStorage
 *     for the new slug; does NOT carry over the previous selection
 *   - Selected member removed by owner → `isOrphaned: true` so pages can
 *     redirect to /pick without knowing the member roster themselves
 *   - localStorage unavailable (SSR, private browsing) → graceful null
 *   - Clearing the selection updates both localStorage and React state atomically
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getSelectedMember,
  setSelectedMember as storeSelectedMember,
  clearSelectedMember as removeSelectedMember,
} from '../lib/selectedMember';
import type { Member } from '../types';

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export interface SelectedMemberContextValue {
  /** The cached memberId for this challenge slug, or null if not yet picked. */
  selectedMemberId: string | null;
  /**
   * True when `selectedMemberId` is set but the member is no longer in the
   * active roster — i.e. they were removed by the owner mid-session.
   * Pages should redirect to /pick when this is true.
   */
  isOrphaned: boolean;
  /** Cache a member selection for this slug in localStorage and React state. */
  setSelectedMemberId: (memberId: string) => void;
  /** Clear the cached selection for this slug. */
  clearSelectedMemberId: () => void;
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const SelectedMemberContext = createContext<SelectedMemberContextValue | null>(null);

/**
 * Access the selected-member state for the current challenge.
 * Must be called inside a `<SelectedMemberProvider>`.
 */
export function useSelectedMember(): SelectedMemberContextValue {
  const ctx = useContext(SelectedMemberContext);
  if (!ctx) throw new Error('useSelectedMember must be used inside <SelectedMemberProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Props {
  /** Challenge slug — used as the localStorage key namespace. */
  slug: string;
  /**
   * Active members from ChallengeContext. Used to detect orphaned selections.
   * Pass an empty array while members are loading — `isOrphaned` will be false
   * until the roster is known.
   */
  activeMembers: Member[];
  children: ReactNode;
}

/**
 * Provides the selected-member state scoped to a single challenge slug.
 * Re-reads localStorage whenever the slug changes.
 */
export function SelectedMemberProvider({ slug, activeMembers, children }: Props) {
  const [selectedMemberId, setMemberId] = useState<string | null>(() =>
    readStored(slug),
  );

  // Re-read localStorage when slug changes (e.g. user switches challenges).
  useEffect(() => {
    setMemberId(readStored(slug));
  }, [slug]);

  const setSelectedMemberId = useCallback(
    (memberId: string) => {
      storeSelectedMember(slug, memberId);
      setMemberId(memberId);
    },
    [slug],
  );

  const clearSelectedMemberId = useCallback(() => {
    removeSelectedMember(slug);
    setMemberId(null);
  }, [slug]);

  // isOrphaned: we have a stored selection but the member is no longer active.
  // We only flag orphaned AFTER the member list has loaded (length > 0 guard
  // prevents false positives during initial load).
  const isOrphaned =
    selectedMemberId !== null &&
    activeMembers.length > 0 &&
    !activeMembers.some(m => m.id === selectedMemberId);

  const value: SelectedMemberContextValue = {
    selectedMemberId,
    isOrphaned,
    setSelectedMemberId,
    clearSelectedMemberId,
  };

  return (
    <SelectedMemberContext.Provider value={value}>
      {children}
    </SelectedMemberContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStored(slug: string): string | null {
  try {
    return getSelectedMember(slug);
  } catch {
    // localStorage unavailable (e.g. private browsing with storage blocked)
    return null;
  }
}
