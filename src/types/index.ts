/**
 * Type module barrel. Import from `@/types` (or `src/types`) rather than
 * individual files when possible — makes future refactors easier.
 *
 * File layout:
 *   rule.ts          — Rule discriminated union + type guards
 *   challenge.ts     — Challenge, ChallengeConfig, ChallengeStatus, SlugIndexEntry
 *   member.ts        — Member + MemberTrackerConfig + TrackerDirection
 *   membership.ts    — Membership (the uid-keyed authorization record)
 *   entry.ts         — Entry + RawEntryValue + per-kind value types + validators
 *   audit.ts         — AuditLogEntry + AuditAction + AuditTarget
 *   aggregates.ts    — Computed (not stored): EvaluatedEntry, MemberStanding,
 *                      Leaderboard, WeeklySummary
 *   localStorage.ts  — Browser-cached state shapes + LS_KEYS
 */

export * from "./rule";
export * from "./challenge";
export * from "./member";
export * from "./membership";
export * from "./entry";
export * from "./audit";
export * from "./aggregates";
export * from "./localStorage";
