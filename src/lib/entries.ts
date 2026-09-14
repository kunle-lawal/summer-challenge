/**
 * Entry CRUD — upsert (create or update) and delete.
 *
 * Enforces two key invariants on every write:
 *   1. Challenge must be 'active' — ended challenges are fully locked.
 *   2. Log date — must fall within the challenge date range and not be in
 *      the future (relative to the challenge timezone).
 *
 * Points (`entry.pts`) are recomputed and snapshotted on every upsert by
 * calling the rule evaluator. The leaderboard re-derives its totals from
 * scratch on hydrate, so stale pts on old entries are acceptable.
 *
 * Every write is batched with an audit log entry.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { appendAuditLog, type ActorContext } from './audit';
import { isWithinEditWindow } from './dates';
import { evaluateEntry } from './rules/evaluate';
import type { Challenge, Entry, Member } from '../types';
import type { DateString } from '../types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type UpsertEntryResult =
  | { ok: true; entryId: string; action: 'created' | 'updated' }
  | { ok: false; reason: 'challenge_ended' }
  | { ok: false; reason: 'edit_window_closed' }
  | { ok: false; reason: 'challenge_not_found' }
  | { ok: false; reason: 'member_not_found' };

export type DeleteEntryResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'challenge_ended' };

// ---------------------------------------------------------------------------
// Upsert (create or update)
// ---------------------------------------------------------------------------

/**
 * Create or update an entry for a given member and date. The entry is
 * identified by `(memberId, date)` — there should only be one per day.
 *
 * Points are recomputed from the challenge rules every time. The caller
 * provides the raw values map; this function handles evaluation and storage.
 *
 * @param actor  Who is performing the action.
 */
export async function upsertEntry(
  challengeId: string,
  memberId: string,
  date: DateString,
  values: Entry['values'],
  actor: ActorContext,
): Promise<UpsertEntryResult> {
  // ── 1. Load challenge ────────────────────────────────────────────────────
  const challengeSnap = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeSnap.exists()) return { ok: false, reason: 'challenge_not_found' };

  const challenge = { id: challengeSnap.id, ...challengeSnap.data() } as Challenge;

  // ── 2. Status check ──────────────────────────────────────────────────────
  if (challenge.status === 'ended') return { ok: false, reason: 'challenge_ended' };

  // ── 3. Log date check ────────────────────────────────────────────────────
  const editable = isWithinEditWindow(date, challenge.config.timezone, {
    startDate: challenge.config.startDate,
    endDate: challenge.config.endDate,
  });
  if (!editable) return { ok: false, reason: 'edit_window_closed' };

  // ── 4. Load member (for tracker config used in evaluation) ───────────────
  const memberSnap = await getDoc(doc(db, 'challenges', challengeId, 'members', memberId));
  if (!memberSnap.exists()) return { ok: false, reason: 'member_not_found' };

  const member = { id: memberSnap.id, ...memberSnap.data() } as Member;

  // ── 5. Load all member entries (evaluation context) ──────────────────────
  const memberEntriesSnap = await getDocs(
    query(
      collection(db, 'challenges', challengeId, 'entries'),
      where('memberId', '==', memberId),
    ),
  );
  const memberEntries = memberEntriesSnap.docs.map(
    d => ({ id: d.id, ...d.data() }) as Entry,
  );

  // ── 6. Check for an existing entry on this date ──────────────────────────
  const existingSnap = await getDocs(
    query(
      collection(db, 'challenges', challengeId, 'entries'),
      where('memberId', '==', memberId),
      where('date', '==', date),
    ),
  );
  const existingDoc = existingSnap.docs[0];

  // ── 7. Evaluate points ───────────────────────────────────────────────────
  // Build a synthetic entry for evaluation — id doesn't matter for scoring.
  const syntheticEntry: Entry = {
    id: existingDoc?.id ?? 'pending',
    memberId,
    date,
    values,
    pts: 0,
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
    createdByMemberId: actor.memberId,
  };

  // Merge the synthetic entry into the context, replacing any prior entry for
  // this date so the evaluator sees the updated values.
  const contextEntries = memberEntries
    .filter(e => e.date !== date)
    .concat(syntheticEntry);

  const evaluated = evaluateEntry(challenge, syntheticEntry, member, contextEntries);
  const pts = evaluated.totalPoints;

  // ── 8. Write ─────────────────────────────────────────────────────────────
  const batch = writeBatch(db);

  if (existingDoc) {
    // Update existing entry
    const before = { id: existingDoc.id, ...existingDoc.data() } as Entry;
    const entryRef = doc(db, 'challenges', challengeId, 'entries', existingDoc.id);

    batch.update(entryRef, { values, pts, updatedAt: serverTimestamp() });

    appendAuditLog(batch, challengeId, {
      actor,
      action: 'entry.update',
      target: { kind: 'entry', id: existingDoc.id },
      before: { values: before.values, pts: before.pts },
      after: { values, pts },
    });

    await batch.commit();
    return { ok: true, entryId: existingDoc.id, action: 'updated' };
  } else {
    // Create new entry
    const entryRef = doc(collection(db, 'challenges', challengeId, 'entries'));
    const entryId = entryRef.id;

    const entryData = {
      memberId,
      date,
      values,
      pts,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByMemberId: actor.memberId,
    };

    batch.set(entryRef, entryData);

    appendAuditLog(batch, challengeId, {
      actor,
      action: 'entry.create',
      target: { kind: 'entry', id: entryId },
      before: null,
      after: { id: entryId, ...entryData },
    });

    await batch.commit();
    return { ok: true, entryId, action: 'created' };
  }
}

// ---------------------------------------------------------------------------
// Delete (owner only)
// ---------------------------------------------------------------------------

/**
 * Hard-delete an entry. Owner-only operation; the caller must have
 * `actor.isOwner === true`. The challenge must still be 'active' — even
 * owners cannot delete from an ended challenge unless they reopen it first.
 */
export async function deleteEntry(
  challengeId: string,
  entryId: string,
  actor: ActorContext,
): Promise<DeleteEntryResult> {
  const challengeSnap = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeSnap.exists()) return { ok: false, reason: 'not_found' };

  const challenge = { id: challengeSnap.id, ...challengeSnap.data() } as Challenge;
  if (challenge.status === 'ended') return { ok: false, reason: 'challenge_ended' };

  const entryRef = doc(db, 'challenges', challengeId, 'entries', entryId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) return { ok: false, reason: 'not_found' };

  const before = { id: entrySnap.id, ...entrySnap.data() } as Entry;
  const batch = writeBatch(db);

  batch.delete(entryRef);

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'entry.delete',
    target: { kind: 'entry', id: entryId },
    before,
    after: null,
  });

  await batch.commit();
  return { ok: true };
}
