/**
 * Append-only audit log writer.
 *
 * Every state-changing operation calls one of these helpers inside a batch
 * or transaction so the audit entry is always co-written with the change.
 * The audit log is the ground truth for "who did what, when."
 *
 * Security note: actorUid is enforced by the security rules — a row whose
 * actorUid is not the caller's own uid is rejected, as is a row claiming
 * actorIsOwner on a challenge the caller doesn't own. actorMemberId remains
 * attribution rather than proof (there
 * is no auth). They record behavioural intent for a trusted group. See V2_PLAN §8.2.
 */

import {
  collection,
  doc,
  serverTimestamp,
  type WriteBatch,
  type Transaction,
} from 'firebase/firestore';
import { db } from './firebase';
import type { AuditAction, AuditTarget } from '../types';

// ---------------------------------------------------------------------------
// Actor context — passed to every state-changing CRUD function
// ---------------------------------------------------------------------------

/**
 * Who is performing the action. Threaded through all write functions so the
 * audit log is populated correctly without callers repeating themselves.
 */
export interface ActorContext {
  /**
   * The signed-in account performing the action.
   *
   * Unlike `memberId`, this is not self-reported: the security rules require
   * every audit row's `actorUid` to equal `request.auth.uid`, so history can no
   * longer be written in somebody else's name.
   */
  uid: string;
  /** The member slot this account holds in the challenge, or null. */
  memberId: string | null;
  /**
   * True when this account owns the challenge. Also checked by the rules
   * against `challenge.ownerUid`, so it cannot simply be asserted.
   */
  isOwner: boolean;
}

// ---------------------------------------------------------------------------
// Audit params
// ---------------------------------------------------------------------------

export interface AuditParams {
  actor: ActorContext;
  action: AuditAction;
  target: AuditTarget;
  /** Snapshot of the target before the change. Null for creates and login events. */
  before?: unknown;
  /** Snapshot of the target after the change. Null for deletes and login events. */
  after?: unknown;
}

// ---------------------------------------------------------------------------
// Batch writer
// ---------------------------------------------------------------------------

/**
 * Append an audit log entry to an existing WriteBatch.
 * The batch must be committed by the caller.
 *
 * @param batch       The batch this write will join.
 * @param challengeId The challenge the audit entry lives under.
 * @param params      What happened and who did it.
 */
export function appendAuditLog(
  batch: WriteBatch,
  challengeId: string,
  params: AuditParams,
): void {
  const ref = doc(collection(db, 'challenges', challengeId, 'auditLog'));
  batch.set(ref, buildAuditDoc(params));
}

// ---------------------------------------------------------------------------
// Transaction writer
// ---------------------------------------------------------------------------

/**
 * Append an audit log entry inside a running Transaction.
 * The transaction must be committed by the caller.
 */
export function appendAuditLogTx(
  tx: Transaction,
  challengeId: string,
  params: AuditParams,
): void {
  const ref = doc(collection(db, 'challenges', challengeId, 'auditLog'));
  tx.set(ref, buildAuditDoc(params));
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function buildAuditDoc(params: AuditParams): Record<string, unknown> {
  return {
    timestamp: serverTimestamp(),
    actorUid: params.actor.uid,
    actorMemberId: params.actor.memberId,
    actorIsOwner: params.actor.isOwner,
    action: params.action,
    target: params.target,
    before: params.before ?? null,
    after: params.after ?? null,
  };
}
