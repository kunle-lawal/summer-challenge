import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Action enum
// ---------------------------------------------------------------------------

/**
 * Every state-changing action in a challenge writes an audit log entry.
 * Mirrors the action table in V2_PLAN.md §8.1.
 *
 * Stored as strings (not numeric enums) so audit logs remain readable
 * directly in the Firestore console without code-side decoding.
 */
export const AUDIT_ACTIONS = [
  'challenge.create',
  'challenge.config_change',
  'challenge.rename',
  'challenge.status_change',
  'member.add',
  'member.remove',
  'member.rename',
  'member.restore',
  'member.tracker_config',
  'entry.create',
  'entry.update',
  'entry.delete',
  'owner.login',
  'owner.login_failed',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

/**
 * What the action acted upon. The id format depends on the kind:
 *  - challenge → the challenge's own id (same one this audit row lives in)
 *  - member    → memberId
 *  - entry     → entryId
 */
export type AuditTarget =
  | { kind: 'challenge'; id: string }
  | { kind: 'member'; id: string }
  | { kind: 'entry'; id: string };

// ---------------------------------------------------------------------------
// Audit log entry
// ---------------------------------------------------------------------------

/**
 * Document at `challenges/{cid}/auditLog/{lid}`. Append-only — entries are
 * never edited or deleted (Firestore rules should enforce this).
 *
 * `before` and `after` are intentionally typed as `unknown`:
 *   - their shape varies by action
 *   - storing them as untyped JSON keeps the schema simple
 *   - readers should narrow them per action when displaying
 *
 * For text-only actions (e.g. owner.login), both are null.
 */
export interface AuditLogEntry {
  /** Firestore document id. */
  id: string;
  /** When the action occurred. Server timestamp on write. */
  timestamp: Timestamp;
  /**
   * The account that performed the action. Enforced by the security rules to
   * equal the caller's own uid, so unlike `actorMemberId` this is evidence
   * rather than attribution.
   */
  actorUid: string;
  /**
   * The memberId selected on the actor's device when they performed the
   * action. Null when no member is selected (e.g. creating a challenge,
   * owner.login attempts before picking a member).
   *
   * NOT tamper-proof: a sophisticated user can spoof their selected
   * member. This is behavioral attribution for a trusted group, not
   * forensic evidence. See V2_PLAN §8.2.
   */
  actorMemberId: string | null;
  /** True if admin mode was active for this action. */
  actorIsOwner: boolean;
  action: AuditAction;
  target: AuditTarget;
  /**
   * Snapshot of the target before the change. Null for create actions
   * and login attempts.
   */
  before: unknown | null;
  /**
   * Snapshot of the target after the change. Null for delete actions
   * and login attempts.
   */
  after: unknown | null;
}
