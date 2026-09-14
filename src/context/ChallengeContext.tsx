/**
 * ChallengeContext — real-time Firestore subscriptions for one challenge.
 *
 * Binds to a URL slug and manages three concurrent onSnapshot listeners:
 *   1. challenges/{id}  — the challenge doc itself
 *   2. challenges/{id}/members — full member roster
 *   3. challenges/{id}/entries  — all entries (used by leaderboard + history)
 *
 * Edge cases handled:
 *   - Slug that doesn't exist → notFound: true
 *   - Network/permission errors → error string surfaced
 *   - Challenge status flips to 'ended' mid-session → isEnded reactive
 *   - Slug prop changes (user navigates between challenges) → all state resets,
 *     old listeners torn down, new ones started
 *   - Component unmounts before slug resolution promise returns → no setState
 *     on unmounted component (cancelled flag pattern)
 *   - Records a recentChallenges entry exactly once per successful first load
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recordChallengeVisit } from '../lib/recentChallenges';
import type { Challenge, Member, Entry, AuditLogEntry, SlugIndexEntry } from '../types';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export interface ChallengeContextValue {
  /** The challenge document. Null while loading or if not found. */
  challenge: Challenge | null;
  /** True during the initial slug resolution and first challenge-doc fetch. */
  loading: boolean;
  /** Human-readable Firestore error string, or null. */
  error: string | null;
  /** True if the slug doesn't resolve to a challenge. */
  notFound: boolean;

  /** Full member roster (active + removed). Updates in real-time. */
  members: Member[];
  /** All entries for this challenge. Updates in real-time. */
  entries: Entry[];
  /** Audit log entries, newest first. Updates in real-time. */
  auditLog: AuditLogEntry[];

  // --- Derived convenience values ---

  /** True when challenge.status === 'ended'. */
  isEnded: boolean;
  /**
   * True when the signed-in account created this challenge.
   *
   * Replaces the old "admin mode" — there is no longer a mode to enter, a
   * password to type, or a per-tab session to keep. Ownership is a fact about
   * the account, and the security rules check the same field independently, so
   * hiding a control and refusing the write are now the same decision.
   */
  isOwner: boolean;
  /** Members where active === true, sorted by name. */
  activeMembers: Member[];
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

/**
 * Access the current challenge's real-time data.
 * Must be called inside a `<ChallengeProvider>`.
 */
export function useChallenge(): ChallengeContextValue {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenge must be used inside <ChallengeProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Props {
  /** The challenge's URL slug, e.g. "ab3xr9". */
  slug: string;
  children: ReactNode;
}

/**
 * Mounts three Firestore listeners bound to the given slug.
 * All listeners are torn down and restarted when `slug` changes.
 */
export function ChallengeProvider({ slug, children }: Props) {
  const { uid } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Track whether we've already called recordChallengeVisit for this slug.
  const visitRecordedRef = useRef(false);

  useEffect(() => {
    // Reset all state when slug changes.
    setChallenge(null);
    setMembers([]);
    setEntries([]);
    setAuditLog([]);
    setLoading(true);
    setError(null);
    setNotFound(false);
    visitRecordedRef.current = false;

    let cancelled = false;
    const unsubs: Unsubscribe[] = [];

    function teardown() {
      cancelled = true;
      unsubs.forEach(u => u());
      unsubs.length = 0;
    }

    // Step 1: resolve slug → challengeId (one-time read; slugIndex is immutable).
    getDoc(doc(db, 'slugIndex', slug))
      .then(slugSnap => {
        if (cancelled) return;

        if (!slugSnap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const { challengeId } = slugSnap.data() as SlugIndexEntry;

        // Step 2: subscribe to the challenge doc.
        unsubs.push(
          onSnapshot(
            doc(db, 'challenges', challengeId),
            snap => {
              if (cancelled) return;
              if (!snap.exists()) {
                setNotFound(true);
                setChallenge(null);
                setLoading(false);
                return;
              }
              const data = { id: snap.id, ...snap.data() } as Challenge;
              setChallenge(data);
              setLoading(false);

              // Record visit once per slug load (not on every update).
              if (!visitRecordedRef.current) {
                visitRecordedRef.current = true;
                recordChallengeVisit(data.slug, data.name);
              }
            },
            err => {
              if (cancelled) return;
              setError(err.message);
              setLoading(false);
            },
          ),
        );

        // Step 3: subscribe to members subcollection.
        unsubs.push(
          onSnapshot(
            collection(db, 'challenges', challengeId, 'members'),
            snap => {
              if (cancelled) return;
              setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Member));
            },
            err => {
              if (cancelled) return;
              setError(err.message);
            },
          ),
        );

        // Step 4: subscribe to entries subcollection.
        unsubs.push(
          onSnapshot(
            collection(db, 'challenges', challengeId, 'entries'),
            snap => {
              if (cancelled) return;
              setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Entry));
            },
            err => {
              if (cancelled) return;
              setError(err.message);
            },
          ),
        );

        // Step 5: subscribe to auditLog subcollection, newest first.
        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'challenges', challengeId, 'auditLog'),
              orderBy('timestamp', 'desc'),
            ),
            snap => {
              if (cancelled) return;
              setAuditLog(snap.docs.map(d => ({ id: d.id, ...d.data() }) as AuditLogEntry));
            },
            err => {
              if (cancelled) return;
              // Audit log errors are non-fatal — don't block the rest of the app
              console.warn('auditLog snapshot error:', err.message);
            },
          ),
        );
      })
      .catch(err => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      });

    return teardown;
  }, [slug]);

  const isEnded = challenge?.status === 'ended';
  const isOwner = uid !== null && challenge?.ownerUid === uid;
  const activeMembers = members
    .filter(m => m.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  const value: ChallengeContextValue = {
    challenge,
    loading,
    error,
    notFound,
    members,
    entries,
    auditLog,
    isEnded,
    isOwner,
    activeMembers,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
}
