/**
 * Member CRUD — add, remove (soft-delete), rename, list active.
 *
 * All writes are batched with an audit log entry. Name uniqueness is enforced
 * with a case-insensitive comparison against existing member names; conflicts
 * return a suggested suffix (e.g. "Bob 2") rather than silently overwriting.
 *
 * Removed members are NEVER deleted from Firestore — their `active` flag is
 * set to false. See V2_PLAN §4.4 for the full removed-member behaviour.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { appendAuditLog, type ActorContext } from './audit';
import type { Member, MemberTrackerConfig } from '../types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type AddMemberResult =
  | { ok: true; memberId: string }
  | { ok: false; reason: 'name_taken'; suggested: string };

export type RenameMemberResult =
  | { ok: true }
  | { ok: false; reason: 'name_taken'; suggested: string }
  | { ok: false; reason: 'not_found' };

export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' };

export type RestoreMemberResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'name_taken'; suggested: string };

export type SetTrackerConfigResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' };

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Return all active members for a challenge, sorted by name ascending.
 */
export async function listActiveMembers(challengeId: string): Promise<Member[]> {
  const snap = await getDocs(collection(db, 'challenges', challengeId, 'members'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Member)
    .filter(m => m.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Return all members (active and removed) for a challenge.
 * Used by History and Admin screens that need the full roster.
 */
export async function listAllMembers(challengeId: string): Promise<Member[]> {
  const snap = await getDocs(collection(db, 'challenges', challengeId, 'members'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Member);
}

// ---------------------------------------------------------------------------
// Add
// ---------------------------------------------------------------------------

/**
 * Add a new member to a challenge. Checks for case-insensitive name
 * conflicts among ALL members (active and removed) and returns a suggested
 * alternative if the name is taken.
 */
export async function addMember(
  challengeId: string,
  name: string,
  actor: ActorContext,
): Promise<AddMemberResult> {
  const allMembers = await listAllMembers(challengeId);
  const conflict = findNameConflict(name, allMembers);

  if (conflict) {
    return {
      ok: false,
      reason: 'name_taken',
      suggested: suggestName(name, allMembers),
    };
  }

  const memberRef = doc(collection(db, 'challenges', challengeId, 'members'));
  const memberId = memberRef.id;

  const memberData: Omit<Member, 'id'> = {
    name,
    createdAt: serverTimestamp() as never,
    active: true,
    removedAt: null,
  };

  const batch = writeBatch(db);
  batch.set(memberRef, memberData);

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'member.add',
    target: { kind: 'member', id: memberId },
    before: null,
    after: { id: memberId, ...memberData },
  });

  await batch.commit();
  return { ok: true, memberId };
}

// ---------------------------------------------------------------------------
// Remove (soft delete)
// ---------------------------------------------------------------------------

/**
 * Soft-remove a member by setting `active: false`. Their entry history is
 * preserved in Firestore and visible in History but excluded from Leaderboard.
 */
export async function removeMember(
  challengeId: string,
  memberId: string,
  actor: ActorContext,
): Promise<RemoveMemberResult> {
  const memberRef = doc(db, 'challenges', challengeId, 'members', memberId);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const before = { id: snap.id, ...snap.data() } as Member;
  const removedAt = serverTimestamp();

  const batch = writeBatch(db);
  batch.update(memberRef, { active: false, removedAt });

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'member.remove',
    target: { kind: 'member', id: memberId },
    before,
    after: { ...before, active: false },
  });

  await batch.commit();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

/**
 * Rename a member. Checks for case-insensitive name conflicts against ALL
 * members (active and removed, excluding the member being renamed). Returns a
 * suggested suffix name if the target name is taken.
 */
export async function renameMember(
  challengeId: string,
  memberId: string,
  newName: string,
  actor: ActorContext,
): Promise<RenameMemberResult> {
  const memberRef = doc(db, 'challenges', challengeId, 'members', memberId);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const allMembers = await listAllMembers(challengeId);
  const othersMembers = allMembers.filter(m => m.id !== memberId);
  const conflict = findNameConflict(newName, othersMembers);

  if (conflict) {
    return {
      ok: false,
      reason: 'name_taken',
      suggested: suggestName(newName, othersMembers),
    };
  }

  const oldName = (snap.data() as Member).name;
  const batch = writeBatch(db);
  batch.update(memberRef, { name: newName });

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'member.rename',
    target: { kind: 'member', id: memberId },
    before: oldName,
    after: newName,
  });

  await batch.commit();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Name conflict helpers
// ---------------------------------------------------------------------------

/**
 * True if `name` conflicts (case-insensitive) with any member in the list.
 */
function findNameConflict(name: string, members: Member[]): boolean {
  const lower = name.toLowerCase().trim();
  return members.some(m => m.name.toLowerCase().trim() === lower);
}

/**
 * Suggest "Name 2", "Name 3", ... until a name is not taken.
 * The base `name` is assumed to already be taken.
 */
function suggestName(name: string, existingMembers: Member[]): string {
  const base = name.trim();
  let suffix = 2;
  while (true) {
    const candidate = `${base} ${suffix}`;
    if (!findNameConflict(candidate, existingMembers)) return candidate;
    suffix++;
  }
}

// ---------------------------------------------------------------------------
// Tracker config
// ---------------------------------------------------------------------------

/**
 * Set (or replace) a member's tracker goal configuration.
 * Once set, the goal is shown as locked in the UI — the member cannot
 * change it themselves; only an owner can update it via admin.
 */
export async function setTrackerConfig(
  challengeId: string,
  memberId: string,
  config: Omit<MemberTrackerConfig, 'lockedAt'>,
  actor: ActorContext,
): Promise<SetTrackerConfigResult> {
  const memberRef = doc(db, 'challenges', challengeId, 'members', memberId);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const before = (snap.data() as Member).trackerConfig ?? null;
  const trackerConfig: MemberTrackerConfig = {
    ...config,
    lockedAt: serverTimestamp() as never,
  };

  const batch = writeBatch(db);
  batch.update(memberRef, { trackerConfig });

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'member.rename', // closest available — future: 'member.tracker_config_set'
    target: { kind: 'member', id: memberId },
    before,
    after: config,
  });

  await batch.commit();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Restore (undo a removal)
// ---------------------------------------------------------------------------

/**
 * Put a removed member back on the roster. This is what the Undo on the
 * "removed" toast calls — §7 prefers undo over a confirmation dialog, because
 * people act faster than they read.
 *
 * The name is re-checked on the way back in: someone else may have taken it
 * while this member was off the roster, and two active members cannot share a
 * name. The caller gets a suggestion rather than a silent collision.
 */
export async function restoreMember(
  challengeId: string,
  memberId: string,
  actor: ActorContext,
): Promise<RestoreMemberResult> {
  const memberRef = doc(db, 'challenges', challengeId, 'members', memberId);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) return { ok: false, reason: 'not_found' };

  const before = { id: snap.id, ...snap.data() } as Member;
  if (before.active) return { ok: true };

  const others = (await listAllMembers(challengeId)).filter(m => m.id !== memberId && m.active);
  if (findNameConflict(before.name, others)) {
    return { ok: false, reason: 'name_taken', suggested: suggestName(before.name, others) };
  }

  const after = { ...before, active: true, removedAt: null };
  const batch = writeBatch(db);
  batch.update(memberRef, { active: true, removedAt: null });

  appendAuditLog(batch, challengeId, {
    actor,
    action: 'member.restore',
    target: { kind: 'member', id: memberId },
    before,
    after,
  });

  await batch.commit();
  return { ok: true };
}
