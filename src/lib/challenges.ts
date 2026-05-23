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
  collection,
  writeBatch,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { customAlphabet } from 'nanoid';
import { db } from './firebase';
import { hashPassword } from './ownerAuth';
import { isOnCooldown, getCooldownRemainingMs, recordCreateTimestamp } from './createCooldown';
import { appendAuditLog, appendAuditLogTx, type ActorContext, type AuditParams } from './audit';
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

export type UpdateConfigResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' };

export type ChangeStatusResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' };

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateChallengeParams {
  name: string;
  /** Plain-text password — hashed before storage. */
  password: string;
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

  const { hash: ownerPasswordHash, salt: ownerPasswordSalt } = await hashPassword(params.password);

  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = generateSlug();
    const challengeRef = doc(collection(db, 'challenges'));
    const challengeId = challengeRef.id;
    const slugRef = doc(db, 'slugIndex', slug);

    const actor: ActorContext = { memberId: null, isOwner: false };

    try {
      await runTransaction(db, async (tx) => {
        const slugSnap = await tx.get(slugRef);
        if (slugSnap.exists()) throw new Error('slug_taken');

        const challengeData = {
          slug,
          name: params.name,
          createdAt: serverTimestamp(),
          status: 'active' as ChallengeStatus,
          ownerPasswordHash,
          ownerPasswordSalt,
          config: params.config,
        };

        tx.set(challengeRef, challengeData);
        tx.set(slugRef, { challengeId } satisfies SlugIndexEntry);

        const auditParams: AuditParams = {
          actor,
          action: 'challenge.create',
          target: { kind: 'challenge', id: challengeId },
          before: null,
          after: challengeData,
        };
        appendAuditLogTx(tx, challengeId, auditParams);
      });

      recordCreateTimestamp();
      return { ok: true, challengeId, slug };
    } catch (err) {
      if (err instanceof Error && err.message === 'slug_taken') continue;
      throw err;
    }
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

