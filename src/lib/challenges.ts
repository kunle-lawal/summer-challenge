/**
 * Challenge CRUD — create, read, update config, change status.
 *
 * Every write goes through a batch/transaction so the audit log entry is
 * always co-written. Reads are plain Firestore document fetches.
 *
 * Slug uniqueness is enforced via a Firestore transaction: the write to
 * `slugIndex/{slug}` and `challenges/{id}` happen atomically. If the slug
 * is already taken on first try, up to MAX_SLUG_RETRIES new slugs are tried.
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { customAlphabet } from 'nanoid';
import { db } from './firebase';
import { isOnCooldown, getCooldownRemainingMs, recordCreateTimestamp } from './createCooldown';
import { appendAuditLog, type ActorContext } from './audit';
import type { Challenge, ChallengeConfig, ChallengeStatus, SlugIndexEntry } from '../types';

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

// Base-32 alphabet: lowercase alpha + digits, omitting ambiguous characters
// (0, o, i, l). 32^6 ≈ 10^9 combinations.
const generateSlug = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 6);

const MAX_SLUG_RETRIES = 5;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type CreateChallengeResult =
  | { ok: true; challengeId: string; slug: string }
  | { ok: false; reason: 'cooldown'; remainingMs: number }
  | { ok: false; reason: 'slug_exhausted' };

export type RenameChallengeResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'empty_name' };

export type UpdateConfigResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' };

export type ChangeStatusResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' };

export type DeleteChallengeResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' };

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateChallengeParams {
  name: string;
  /** The signed-in account creating it. Becomes `ownerUid`, immutably. */
  ownerUid: string;
  config: ChallengeConfig;
}

/**
 * Create a new challenge. Checks the client-side create cooldown first.
 * Generates a unique 6-char slug and writes the challenge + slugIndex
 * atomically in a transaction. Records the cooldown timestamp on success.
 *
 * The actor for challenge.create always has memberId=null because the creator
 * has not yet selected a member in this challenge.
 */
export async function createChallenge(
  params: CreateChallengeParams,
): Promise<CreateChallengeResult> {
  const cooldownRemaining = isOnCooldown() ? getCooldownRemainingMs() : 0;

  if (cooldownRemaining > 0) {
    return { ok: false, reason: 'cooldown', remainingMs: cooldownRemaining };
  }

  const actor: ActorContext = { uid: params.ownerUid, memberId: null, isOwner: true };

  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = generateSlug();
    const challengeRef = doc(collection(db, 'challenges'));
    const challengeId = challengeRef.id;
    const slugRef = doc(db, 'slugIndex', slug);

    const challengeData = {
      slug,
      name: params.name,
      createdAt: serverTimestamp(),
      status: 'active' as ChallengeStatus,
      ownerUid: params.ownerUid,
      config: params.config,
    };

    /*
     * Two sequential writes rather than one transaction, because the rule
     * guarding slugIndex checks that you own the challenge the slug points at —
     * and rules evaluate against committed state, so the challenge has to exist
     * first. The cost is that a failure between the two leaves an unreachable
     * challenge document; the benefit is that nobody can point a slug at a
     * challenge they don't own, which is how links were hijackable before.
     */
    await setDoc(challengeRef, challengeData);

    try {
      await setDoc(slugRef, { challengeId } satisfies SlugIndexEntry);
    } catch {
      // Almost always the slug already existing. Try another one; the orphaned
      // challenge document is unreachable and harmless.
      continue;
    }

    const batch = writeBatch(db);
    appendAuditLog(batch, challengeId, {
      actor,
      action: 'challenge.create',
      target: { kind: 'challenge', id: challengeId },
      before: null,
      after: challengeData,
    });
    await batch.commit();

    recordCreateTimestamp();
    return { ok: true, challengeId, slug };
  }

  return { ok: false, reason: 'slug_exhausted' };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetch a challenge by its URL slug. Performs two reads: one to resolve the
 * slug → challengeId via slugIndex, one to fetch the challenge document.
 * Returns null if the slug does not exist.
 */
export async function getChallengeBySlug(slug: string): Promise<Challenge | null> {
  const slugSnap = await getDoc(doc(db, 'slugIndex', slug));
  if (!slugSnap.exists()) return null;

  const { challengeId } = slugSnap.data() as SlugIndexEntry;
  return getChallengeById(challengeId);
}

/**
 * Fetch a challenge by its Firestore document ID.
 * Returns null if the document does not exist.
 */
export async function getChallengeById(challengeId: string): Promise<Challenge | null> {
  const snap = await getDoc(doc(db, 'challenges', challengeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Challenge;
}

// ---------------------------------------------------------------------------
// Update config
// ---------------------------------------------------------------------------

/**
 * Replace a challenge's rule/date configuration. Owner-only in the UI, but
 * this function does not enforce password — the caller (AdminModeContext)
 * is responsible for gating access.
 */
export async function updateChallengeConfig(
  challengeId: string,
  newConfig: ChallengeConfig,
  actor: ActorContext,
): Promise<UpdateConfigResult> {
  const snap = await getDoc(doc(db, 'challenges', challengeId));
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const oldConfig = (snap.data() as Challenge).config;
  const batch = writeBatch(db);

  batch.update(doc(db, 'challenges', challengeId), { config: newConfig });

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'challenge.config_change',
    target: { kind: 'challenge', id: challengeId },
    before: oldConfig,
    after: newConfig,
  });

  await batch.commit();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Change status
// ---------------------------------------------------------------------------

/**
 * Flip a challenge between 'active' and 'ended'. When ended, all editing is
 * disabled for everyone. The owner can flip back to 'active' to make post-hoc
 * corrections. See V2_PLAN §3.5.
 */
export async function changeChallengeStatus(
  challengeId: string,
  newStatus: ChallengeStatus,
  actor: ActorContext,
): Promise<ChangeStatusResult> {
  const snap = await getDoc(doc(db, 'challenges', challengeId));
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const oldStatus = (snap.data() as Challenge).status;
  const batch = writeBatch(db);

  batch.update(doc(db, 'challenges', challengeId), { status: newStatus });

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'challenge.status_change',
    target: { kind: 'challenge', id: challengeId },
    before: oldStatus,
    after: newStatus,
  });

  await batch.commit();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Delete (permanent)
// ---------------------------------------------------------------------------

const BATCH_SIZE = 400; // Firestore batch limit is 500; stay well under

/**
 * Permanently delete a challenge and ALL its subcollection data.
 *
 * Deletes in order: auditLog → entries → members → challenge doc → slugIndex.
 * Uses batched deletes to stay under Firestore's 500-op batch limit.
 *
 * This is irreversible. The caller is responsible for confirming with the user.
 */
export async function deleteChallenge(
  challengeId: string,
  slug: string,
): Promise<DeleteChallengeResult> {
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const subcollections = ['auditLog', 'entries', 'members'] as const;

  for (const sub of subcollections) {
    const colSnap = await getDocs(collection(db, 'challenges', challengeId, sub));
    for (let i = 0; i < colSnap.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      colSnap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // Delete the challenge doc and its slugIndex entry atomically
  const finalBatch = writeBatch(db);
  finalBatch.delete(challengeRef);
  finalBatch.delete(doc(db, 'slugIndex', slug));
  await finalBatch.commit();

  return { ok: true };
}


// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

/**
 * Change a challenge's display name.
 *
 * `updateChallengeConfig` only ever wrote the `config` sub-object, so the name
 * — documented as owner-editable since v2 — had no write path at all. The slug
 * deliberately does not follow the name: it is the only thing gating access to
 * the challenge, and a name-derived slug would be guessable.
 */
export async function renameChallenge(
  challengeId: string,
  newName: string,
  actor: ActorContext,
): Promise<RenameChallengeResult> {
  const trimmed = newName.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty_name' };

  const ref = doc(db, 'challenges', challengeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const before = (snap.data() as Challenge).name;
  if (before === trimmed) return { ok: true };

  const batch = writeBatch(db);
  batch.update(ref, { name: trimmed });

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'challenge.rename',
    target: { kind: 'challenge', id: challengeId },
    before: { name: before },
    after: { name: trimmed },
  });

  await batch.commit();
  return { ok: true };
}
