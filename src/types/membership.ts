import type { Timestamp } from 'firebase/firestore';

/**
 * Document at `challenges/{cid}/membership/{uid}` — the authoritative record
 * that an account holds a slot in a challenge.
 *
 * It exists because of a hard limit in Firestore security rules: a rule can
 * `get()` a document by a known id, but it cannot *query* a collection. So
 * "is this account a member?" has to be answerable by looking up one document
 * at a predictable path, which means keying the record by uid.
 *
 * `members/{memberId}.uid` mirrors this for display. When the two ever
 * disagree, this one wins.
 */
export interface Membership {
  /** The member slot this account claimed. */
  memberId: string;
  joinedAt: Timestamp;
}
