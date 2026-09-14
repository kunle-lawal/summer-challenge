/**
 * Security rules, tested against the emulator.
 *
 * Organised by the attack each rule prevents rather than by collection,
 * because the v2 ruleset was not obviously wrong to read — it was wrong in
 * what it permitted. Every `describe` below was possible before this change.
 *
 * Run with `npm run test:rules`, which starts the emulator around them.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, doc, deleteDoc, getDoc, getDocs, setDoc, updateDoc,
} from 'firebase/firestore';

const OWNER = 'owner-uid';
const FRIEND = 'friend-uid';
const STRANGER = 'stranger-uid';

const CID = 'challenge-1';
const SLUG = 'abc123';

let env: RulesTestEnvironment;

const asOwner = () => env.authenticatedContext(OWNER).firestore();
const asFriend = () => env.authenticatedContext(FRIEND).firestore();
const asStranger = () => env.authenticatedContext(STRANGER).firestore();
const asNobody = () => env.unauthenticatedContext().firestore();

const challenge = (over: Record<string, unknown> = {}) => ({
  slug: SLUG,
  name: 'Summer Challenge',
  createdAt: new Date('2026-01-01'),
  status: 'active',
  ownerUid: OWNER,
  config: {
    startDate: '2026-09-14',
    endDate: '2026-11-15',
    weekAnchor: '2026-09-14',
    timezone: 'UTC',
    rules: [],
  },
  ...over,
});

const member = (name: string, uid: string | null) => ({
  name, createdAt: new Date('2026-01-01'), active: true, removedAt: null, uid,
});

const entry = (memberId: string, date = '2026-09-20') => ({
  memberId, date, values: { gym: 'yes' }, pts: 1,
  createdAt: new Date(), updatedAt: new Date(), createdByMemberId: memberId,
});

const audit = (over: Record<string, unknown> = {}) => ({
  timestamp: new Date(),
  actorUid: FRIEND,
  actorIsOwner: false,
  action: 'entry.create',
  target: { kind: 'entry', id: 'e1' },
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rules',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'challenges', CID), challenge());
    await setDoc(doc(db, 'slugIndex', SLUG), { challengeId: CID });
    // m1 owner's slot, m2 the friend's, m3 nobody's.
    await setDoc(doc(db, 'challenges', CID, 'members', 'm1'), member('Kunle', OWNER));
    await setDoc(doc(db, 'challenges', CID, 'members', 'm2'), member('Ella', FRIEND));
    await setDoc(doc(db, 'challenges', CID, 'members', 'm3'), member('Scar', null));
    await setDoc(doc(db, 'challenges', CID, 'membership', OWNER), { memberId: 'm1', joinedAt: new Date() });
    await setDoc(doc(db, 'challenges', CID, 'membership', FRIEND), { memberId: 'm2', joinedAt: new Date() });
    await setDoc(doc(db, 'challenges', CID, 'entries', 'e-friend'), entry('m2'));
    await setDoc(doc(db, 'challenges', CID, 'entries', 'e-owner'), entry('m1'));
  });
});

// ---------------------------------------------------------------------------

describe('enumeration', () => {
  /*
   * The v2 hole: `allow read: if true` on a wildcard document path grants
   * `list` as well as `get`, so the entire challenges collection could be
   * downloaded and the 6-character slug protected nothing.
   */
  it('denies listing every challenge in the project', async () => {
    await assertFails(getDocs(collection(asStranger(), 'challenges')));
  });

  it('denies listing every slug', async () => {
    await assertFails(getDocs(collection(asStranger(), 'slugIndex')));
  });

  it('denies listing challenges even to a member', async () => {
    await assertFails(getDocs(collection(asFriend(), 'challenges')));
  });

  it('still lets someone open a link they were given', async () => {
    await assertSucceeds(getDoc(doc(asStranger(), 'slugIndex', SLUG)));
    await assertSucceeds(getDoc(doc(asStranger(), 'challenges', CID)));
  });
});

describe('signed out', () => {
  it('cannot resolve a slug', async () => {
    await assertFails(getDoc(doc(asNobody(), 'slugIndex', SLUG)));
  });

  it('cannot read a challenge', async () => {
    await assertFails(getDoc(doc(asNobody(), 'challenges', CID)));
  });

  it('cannot read the roster', async () => {
    await assertFails(getDoc(doc(asNobody(), 'challenges', CID, 'members', 'm1')));
  });

  it('cannot write anything', async () => {
    await assertFails(setDoc(doc(asNobody(), 'challenges', 'new'), challenge({ ownerUid: 'anyone' })));
  });
});

describe('challenge takeover', () => {
  /*
   * The v2 hole: challenge documents were world-writable, so anyone could
   * overwrite ownerPasswordHash and own somebody else's challenge.
   */
  it('denies a stranger editing a challenge', async () => {
    await assertFails(updateDoc(doc(asStranger(), 'challenges', CID), { name: 'Mine now' }));
  });

  it('denies a member editing a challenge', async () => {
    await assertFails(updateDoc(doc(asFriend(), 'challenges', CID), { name: 'Mine now' }));
  });

  it('lets the owner edit', async () => {
    await assertSucceeds(updateDoc(doc(asOwner(), 'challenges', CID), { name: 'Renamed' }));
  });

  it('denies handing ownership to someone else', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'challenges', CID), { ownerUid: STRANGER }));
  });

  it('denies moving the slug', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'challenges', CID), { slug: 'zzzzzz' }));
  });

  it('denies backdating the creation time', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'challenges', CID), { createdAt: new Date('2020-01-01') }));
  });

  it('denies creating a challenge owned by somebody else', async () => {
    await assertFails(setDoc(doc(asStranger(), 'challenges', 'c2'), challenge({ ownerUid: OWNER })));
  });

  it('denies smuggling extra fields onto a challenge', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'challenges', 'c3'), { ...challenge({ ownerUid: STRANGER }), isAdmin: true }),
    );
  });
});

describe('slug hijack', () => {
  /*
   * The v2 hole: slugIndex was world-writable, so any live link could be
   * repointed at a challenge the attacker controlled.
   */
  it('denies repointing an existing slug', async () => {
    await assertFails(setDoc(doc(asStranger(), 'slugIndex', SLUG), { challengeId: 'evil' }));
  });

  it('denies the owner repointing their own slug', async () => {
    await assertFails(setDoc(doc(asOwner(), 'slugIndex', SLUG), { challengeId: 'elsewhere' }));
  });

  it('denies claiming a new slug for a challenge you do not own', async () => {
    await assertFails(setDoc(doc(asStranger(), 'slugIndex', 'newslug'), { challengeId: CID }));
  });

  it('denies a slug that disagrees with the challenge it points at', async () => {
    await assertFails(setDoc(doc(asOwner(), 'slugIndex', 'mismatch'), { challengeId: CID }));
  });

  it('lets an owner register the slug their challenge actually carries', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'challenges', 'c9'), challenge({ slug: 'freshly' }));
    });
    await assertSucceeds(setDoc(doc(asOwner(), 'slugIndex', 'freshly'), { challengeId: 'c9' }));
  });

  it('denies deleting a slug', async () => {
    await assertFails(deleteDoc(doc(asOwner(), 'slugIndex', SLUG)));
  });
});

describe('entries', () => {
  /*
   * The v2 hole: entries were world-writable, so anyone could log days as
   * anyone else — or overwrite a logged day with an empty values map, which
   * destroyed data despite deletes being denied.
   */
  it('lets a member write their own day', async () => {
    await assertSucceeds(setDoc(doc(asFriend(), 'challenges', CID, 'entries', 'e-new'), entry('m2', '2026-09-21')));
  });

  it('denies a member logging as somebody else', async () => {
    await assertFails(setDoc(doc(asFriend(), 'challenges', CID, 'entries', 'e-forged'), entry('m1', '2026-09-21')));
  });

  it('denies a member overwriting somebody else’s day', async () => {
    await assertFails(updateDoc(doc(asFriend(), 'challenges', CID, 'entries', 'e-owner'), { pts: 99 }));
  });

  it('denies wiping somebody else’s day by emptying it', async () => {
    await assertFails(updateDoc(doc(asFriend(), 'challenges', CID, 'entries', 'e-owner'), { values: {} }));
  });

  it('denies a stranger writing an entry at all', async () => {
    await assertFails(setDoc(doc(asStranger(), 'challenges', CID, 'entries', 'e-x'), entry('m3')));
  });

  it('denies a stranger reading entries', async () => {
    await assertFails(getDoc(doc(asStranger(), 'challenges', CID, 'entries', 'e-friend')));
  });

  it('lets the owner correct anyone’s entry', async () => {
    await assertSucceeds(updateDoc(doc(asOwner(), 'challenges', CID, 'entries', 'e-friend'), { pts: 2 }));
  });

  it('denies moving an entry to another member', async () => {
    await assertFails(updateDoc(doc(asFriend(), 'challenges', CID, 'entries', 'e-friend'), { memberId: 'm1' }));
  });

  it('denies moving an entry to another date', async () => {
    await assertFails(updateDoc(doc(asFriend(), 'challenges', CID, 'entries', 'e-friend'), { date: '2026-09-30' }));
  });

  it('denies a member deleting an entry', async () => {
    await assertFails(deleteDoc(doc(asFriend(), 'challenges', CID, 'entries', 'e-friend')));
  });
});

describe('claiming a slot', () => {
  it('lets an invited stranger claim a free slot', async () => {
    await assertSucceeds(
      setDoc(doc(asStranger(), 'challenges', CID, 'membership', STRANGER), { memberId: 'm3', joinedAt: new Date() }),
    );
    await assertSucceeds(updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm3'), { uid: STRANGER }));
  });

  /*
   * Claiming writes two documents. They can land in either order and either
   * can fail, so the rules have to permit a retry rather than leaving someone
   * half-joined and stuck.
   */
  it('works with the member slot written first', async () => {
    await assertSucceeds(updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm3'), { uid: STRANGER }));
    await assertSucceeds(
      setDoc(doc(asStranger(), 'challenges', CID, 'membership', STRANGER), { memberId: 'm3', joinedAt: new Date() }),
    );
  });

  it('lets a half-finished claim be retried', async () => {
    await assertSucceeds(
      setDoc(doc(asStranger(), 'challenges', CID, 'membership', STRANGER), { memberId: 'm3', joinedAt: new Date() }),
    );
    // The second write failed; the same claim runs again from the start.
    await assertSucceeds(
      setDoc(doc(asStranger(), 'challenges', CID, 'membership', STRANGER), { memberId: 'm3', joinedAt: new Date() }),
    );
    await assertSucceeds(updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm3'), { uid: STRANGER }));
  });

  it('denies quietly switching to a different slot', async () => {
    await assertFails(
      updateDoc(doc(asFriend(), 'challenges', CID, 'membership', FRIEND), { memberId: 'm3' }),
    );
  });

  it('still denies registering against a slot somebody else holds', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'challenges', CID, 'membership', STRANGER), { memberId: 'm1', joinedAt: new Date() }),
    );
  });

  it('denies stealing a slot somebody already holds', async () => {
    await assertFails(updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm2'), { uid: STRANGER }));
  });

  it('denies claiming a slot in somebody else’s name', async () => {
    await assertFails(updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm3'), { uid: FRIEND }));
  });

  it('denies registering membership for another account', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'challenges', CID, 'membership', FRIEND), { memberId: 'm3', joinedAt: new Date() }),
    );
  });

  it('denies registering membership against a taken slot', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'challenges', CID, 'membership', STRANGER), { memberId: 'm2', joinedAt: new Date() }),
    );
  });

  it('denies renaming a member while claiming it', async () => {
    await assertFails(
      updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm3'), { uid: STRANGER, name: 'Hijacked' }),
    );
  });

  it('lets someone release their own slot', async () => {
    await assertSucceeds(updateDoc(doc(asFriend(), 'challenges', CID, 'members', 'm2'), { uid: null }));
  });

  it('denies releasing somebody else’s slot', async () => {
    await assertFails(updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm2'), { uid: null }));
  });
});

describe('the roster', () => {
  it('denies a stranger renaming a member', async () => {
    await assertFails(updateDoc(doc(asStranger(), 'challenges', CID, 'members', 'm1'), { name: 'Renamed' }));
  });

  it('denies a member renaming another member', async () => {
    await assertFails(updateDoc(doc(asFriend(), 'challenges', CID, 'members', 'm1'), { name: 'Renamed' }));
  });

  it('lets the owner rename', async () => {
    await assertSucceeds(updateDoc(doc(asOwner(), 'challenges', CID, 'members', 'm2'), { name: 'Ella B' }));
  });

  it('denies the owner reassigning a slot to another account', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'challenges', CID, 'members', 'm2'), { uid: STRANGER }));
  });

  it('denies a member adding themselves a second slot', async () => {
    await assertFails(
      setDoc(doc(asFriend(), 'challenges', CID, 'members', 'm4'), member('Ghost', null)),
    );
  });

  it('lets the owner add a slot, unclaimed', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), 'challenges', CID, 'members', 'm4'), member('Marcus', null)));
  });

  it('denies the owner pre-claiming a slot for someone', async () => {
    await assertFails(setDoc(doc(asOwner(), 'challenges', CID, 'members', 'm5'), member('Marcus', STRANGER)));
  });

  it('denies deleting a member outright, so history survives', async () => {
    await assertFails(deleteDoc(doc(asOwner(), 'challenges', CID, 'members', 'm2')));
  });
});

describe('the audit log', () => {
  /*
   * The v2 hole: the audit log was world-writable with shape-only validation,
   * so history — the app's only accountability mechanism — was forgeable.
   */
  it('lets a member record their own action', async () => {
    await assertSucceeds(setDoc(doc(asFriend(), 'challenges', CID, 'auditLog', 'a1'), audit()));
  });

  it('denies writing history in somebody else’s name', async () => {
    await assertFails(setDoc(doc(asFriend(), 'challenges', CID, 'auditLog', 'a2'), audit({ actorUid: OWNER })));
  });

  it('denies a member claiming owner authority', async () => {
    await assertFails(
      setDoc(doc(asFriend(), 'challenges', CID, 'auditLog', 'a3'), audit({ actorIsOwner: true })),
    );
  });

  it('lets the owner claim owner authority', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'challenges', CID, 'auditLog', 'a4'), audit({ actorUid: OWNER, actorIsOwner: true })),
    );
  });

  it('denies a stranger writing history', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'challenges', CID, 'auditLog', 'a5'), audit({ actorUid: STRANGER })),
    );
  });

  it('denies editing history', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'challenges', CID, 'auditLog', 'a6'), audit());
    });
    await assertFails(updateDoc(doc(asOwner(), 'challenges', CID, 'auditLog', 'a6'), { action: 'rewritten' }));
  });

  it('denies deleting history', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'challenges', CID, 'auditLog', 'a7'), audit());
    });
    await assertFails(deleteDoc(doc(asOwner(), 'challenges', CID, 'auditLog', 'a7')));
  });
});

describe('the create quota', () => {
  /*
   * The v2 cooldown lived in localStorage, so clearing site data reset it.
   * The counter now lives on a document only its owner can touch, and only
   * ever upward.
   */
  const userDoc = { displayName: 'Kunle', createdAt: new Date(), challengesCreated: 0 };

  it('lets an account open its own record at zero', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), 'users', OWNER), userDoc));
  });

  it('denies opening a record that is already part-used', async () => {
    await assertFails(setDoc(doc(asOwner(), 'users', OWNER), { ...userDoc, challengesCreated: 99 }));
  });

  it('denies creating a record for another account', async () => {
    await assertFails(setDoc(doc(asStranger(), 'users', OWNER), userDoc));
  });

  it('denies reading another account’s record', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER), userDoc);
    });
    await assertFails(getDoc(doc(asStranger(), 'users', OWNER)));
  });

  describe('once a record exists', () => {
    beforeEach(async () => {
      await env.withSecurityRulesDisabled(async ctx => {
        await setDoc(doc(ctx.firestore(), 'users', OWNER), { ...userDoc, challengesCreated: 3 });
      });
    });

    it('allows a single increment', async () => {
      await assertSucceeds(updateDoc(doc(asOwner(), 'users', OWNER), { challengesCreated: 4 }));
    });

    it('denies jumping the counter', async () => {
      await assertFails(updateDoc(doc(asOwner(), 'users', OWNER), { challengesCreated: 40 }));
    });

    it('denies winding the counter back', async () => {
      await assertFails(updateDoc(doc(asOwner(), 'users', OWNER), { challengesCreated: 0 }));
    });

    it('denies deleting the record to escape it', async () => {
      await assertFails(deleteDoc(doc(asOwner(), 'users', OWNER)));
    });
  });
});
