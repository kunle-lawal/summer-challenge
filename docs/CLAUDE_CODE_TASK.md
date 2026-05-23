# Claude Code task — Summer Challenge v2 business logic

You are picking up a partially-scoped rewrite. The product spec, design direction, and type system are already done. Your job is to build the **headless business logic** — Firebase wiring, the rule engine, Firestore CRUD, audit logging, and React context providers — but **no UI components yet**. UI comes in a separate task once final designs land.

---

## First: read these, in this order

1. **`docs/V2_PLAN.md`** — canonical product/technical spec. Read all of it; it's ~500 lines but every section is load-bearing.
2. **`src/types/index.ts`** and the files it re-exports — the data model contract. Do not modify these without flagging it.
3. **`docs/DESIGN_BRIEF.md`** — context only. You don't need it to write this code, but it explains the user-facing intent so your error messages and naming align with the product voice.

Skip `docs/lowfi-mockup.html` for this task — it's for the UI work.

After reading, confirm understanding by listing the six rule kinds and what each captures before writing any code.

---

## Scope

### In scope (build all of this)

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase app + Firestore init from env vars |
| `src/lib/appCheck.ts` | App Check init — **stub only for now** (export `initAppCheck()` as a no-op; real reCAPTCHA wiring is a later task) |
| `src/lib/dates.ts` | Timezone-aware date math (IANA tz, `'YYYY-MM-DD'` strings, week-window calc, today/yesterday checks) |
| `src/lib/ownerAuth.ts` | Password hashing (WebCrypto SHA-256 + random salt), verify helper |
| `src/lib/selectedMember.ts` | localStorage read/write per challenge slug |
| `src/lib/recentChallenges.ts` | localStorage list of recent challenges, capped at 10 |
| `src/lib/createCooldown.ts` | localStorage timestamp + check for the 1-hour create cooldown |
| `src/lib/rules/kinds.ts` | Kind-specific helpers (per-rule input validators, free-pass usage counters) |
| `src/lib/rules/evaluate.ts` | Per-entry scoring — the core of the rule engine |
| `src/lib/rules/aggregate.ts` | Member rollups + leaderboard + weekly summaries |
| `src/lib/rules/presets.ts` | Classic + Minimal preset factory functions returning `Rule[]` |
| `src/lib/challenges.ts` | Challenge CRUD: create (slug gen + cooldown check), read by slug, update config, change status |
| `src/lib/members.ts` | Member CRUD: add (with name conflict resolution), remove (set inactive), rename, list active |
| `src/lib/entries.ts` | Entry CRUD with edit-window enforcement |
| `src/lib/audit.ts` | Append-only audit log writer |
| `src/context/ChallengeContext.tsx` | Provider bound to a challenge slug; subscribes to challenge + members + entries via Firestore listeners. Exports `useChallenge()` hook. |
| `src/context/SelectedMemberContext.tsx` | Provider + `useSelectedMember()` hook, scoped to current challenge slug |
| `src/context/AdminModeContext.tsx` | Provider + `useAdminMode()` hook; sessionStorage-backed; password verification through `ownerAuth` |
| `firestore.rules` | Permissive baseline rules with shape validation — see "Security rules" below |

### Out of scope (do not touch in this task)

- React components beyond context providers (no pages, no log card UI, no leaderboard rendering).
- Routing (`src/App.tsx`, `react-router` setup).
- Styling (no styled-components work).
- The v1 code under `src/` that's still there from the Sheets-backed version. Leave it alone; we'll archive it later.
- The `archive/` directory.
- App Check production wiring (stub it).
- Cloud Functions setup.
- Real-time listeners *beyond* the basic challenge/members/entries subscriptions in `ChallengeContext`.

---

## Conventions

- **TypeScript strict mode.** Already on. No `any`. Use discriminated unions for the `Rule` type.
- **`import type` for type-only imports** — keeps the runtime bundle clean.
- **Pure functions for the rule engine.** `lib/rules/*` must be Firestore-free. They take data in, return data out. Side effects belong in `lib/challenges.ts`, `lib/entries.ts`, etc.
- **One responsibility per file.** If a file grows past ~200 lines, consider whether it should split.
- **JSDoc comments on every exported function and type.** Brief but informative. Match the style of the existing `src/types/*` files.
- **Throw on programmer errors** (e.g. invalid rule kind, missing required field). Return `Result`-like shapes for user-facing failures (e.g. `{ ok: false, reason: 'name_taken', suggested: 'Bob 2' }` for member-add conflicts).
- **No circular imports** — `lib/rules/` should not import from `lib/challenges.ts` or any other Firestore-touching module.
- **Firestore writes go through `audit.ts`** — every state-changing operation must append an audit log entry in the same logical transaction. Where Firestore supports it, use a real `runTransaction` or `writeBatch`.

---

## Dependencies to add

Install if not already present:

```bash
npm install firebase nanoid date-fns date-fns-tz
npm install -D vitest @vitest/coverage-v8 @types/node happy-dom
```

- `firebase` — Firestore + App Check SDK
- `nanoid` — challenge slug generation (6 chars, base32 alphabet)
- `date-fns` + `date-fns-tz` — timezone-aware date math
- `vitest` + `happy-dom` — unit test framework, matches our Vite stack

Add to `package.json` scripts:

```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

Create `vitest.config.ts` with `happy-dom` as the environment.

---

## Testing requirements

The rule engine is the most important code in the codebase. It deserves real tests.

### Must test (`*.test.ts` co-located with source)

| File | What to cover |
|------|---------------|
| `lib/dates.test.ts` | Week-window calc, today/yesterday checks across DST boundaries, IANA tz handling, edit-window window computation |
| `lib/ownerAuth.test.ts` | Hash + verify round-trip, salt uniqueness, wrong password rejection |
| `lib/rules/evaluate.test.ts` | Each rule kind: scoring at boundaries, free-pass deduction, weekly caps, penalty waiver. Use realistic data shapes. |
| `lib/rules/aggregate.test.ts` | Leaderboard sorting and ranking (including ties), exclusion of inactive members, weekly summary computation |
| `lib/rules/presets.test.ts` | Classic and Minimal presets produce valid `Rule[]` |
| `lib/createCooldown.test.ts` | Cooldown enforcement, expiry, time-mocking |

### Need not test (manual verification fine)

- `lib/firebase.ts` — init only
- `lib/appCheck.ts` — stub
- Firestore CRUD files — exercise these manually via the context layer
- Context providers — exercise via the eventual UI

Aim for **~90% coverage on `lib/rules/`**. Other files: best-effort.

---

## Security rules (`firestore.rules`)

Permissive baseline, but **enforce shape**. Anyone can read/write any challenge (matches the trust model — anyone with the URL can edit anyone), BUT:

- `challenges/{id}` writes require all required fields present with correct types.
- `auditLog/{id}` documents are **append-only** — no updates, no deletes, ever.
- `slugIndex/{slug}` writes require a single `challengeId` string field.

Don't over-engineer this. The threat model is "stop accidentally malformed writes," not "stop a determined attacker." Real abuse protection is App Check (later task).

---

## Order of work — work in phases, stop for review between each

### Phase A — Foundation (no Firestore yet)

1. Install deps, set up Vitest config.
2. `lib/dates.ts` + tests.
3. `lib/ownerAuth.ts` + tests.
4. `lib/selectedMember.ts`, `lib/recentChallenges.ts`, `lib/createCooldown.ts` + tests.

**Stop. Confirm tests pass. Wait for review.**

### Phase B — Rule engine (pure functions, still no Firestore)

1. `lib/rules/kinds.ts`.
2. `lib/rules/evaluate.ts` + thorough tests covering all six kinds, caps, waivers, free passes.
3. `lib/rules/aggregate.ts` + tests including tied rankings and inactive member exclusion.
4. `lib/rules/presets.ts` + tests.

**Stop. Confirm tests pass and coverage is high on `lib/rules/`. Wait for review.**

### Phase C — Firebase + Firestore CRUD

1. `lib/firebase.ts` — init.
2. `lib/appCheck.ts` — stub.
3. `firestore.rules` — baseline rules.
4. `lib/audit.ts` — writer.
5. `lib/challenges.ts` — create, read, updateConfig, changeStatus.
6. `lib/members.ts` — add (with conflict resolution), remove, rename, listActive.
7. `lib/entries.ts` — upsert with edit-window check.

**Stop. Manually verify by running quick Firestore reads/writes against the real project. Wait for review.**

### Phase D — Context layer

1. `context/ChallengeContext.tsx` — listener-driven, exposes `useChallenge()`.
2. `context/SelectedMemberContext.tsx` — localStorage-backed, exposes `useSelectedMember()`.
3. `context/AdminModeContext.tsx` — sessionStorage-backed, exposes `useAdminMode()`.

**Stop. End of task.**

---

## Edge cases that must be handled (not optional)

- **Edit window across DST.** "Yesterday" is in challenge timezone, not UTC.
- **Challenge ended status** disables edits for everyone, including owner (owner can flip status back via `changeStatus`).
- **Free pass count** is a *lifetime* count across all entries for that rule and member — not weekly.
- **Penalty waiver** is *first infraction in the challenge week*, where week boundaries come from `config.weekAnchor`.
- **Weekly cap** counts distinct scoring *days*, not entries. Re-saving the same day doesn't double-count.
- **Streak rule** is purely derived during aggregation. No entry value. The bonus fires on the day the streak completes; if `repeatable: true`, it can fire again every N days.
- **Tracker rule** scoring uses the *latest* `GoalDayEntry`-equivalent value for the member's total. v1 behavior, generalized.
- **Member name conflicts** — case-insensitive comparison. On collision, return `{ ok: false, reason: 'name_taken', suggested: <name with numeric suffix> }`.
- **Stored `entry.pts`** is a snapshot — recompute and rewrite on every save/edit. Old entries with stale pts are OK in the data layer; the leaderboard sums what's stored.
- **Inactive members** are excluded from leaderboard aggregations entirely. Their entries don't count toward the totals of anyone.

---

## What "done" looks like

- All files in the "In scope" table exist and have JSDoc.
- `npm run test:run` passes. Coverage on `lib/rules/` is ≥90%.
- `npm run build` (Vite production build) succeeds — TypeScript compiles cleanly with no errors.
- I can run a smoke script that does: create challenge → add 3 members → log entries for each → read leaderboard → verify scoring → end challenge → verify edits blocked. (Write this as `scripts/smoke.ts` if helpful; not required.)
- Audit log entries exist in Firestore for every state-changing call made during smoke testing.

---

## When in doubt

- **Prefer fewer features done well over more features half-done.** If you hit something ambiguous, leave a `// TODO(human-review):` comment and move on.
- **Don't refactor `src/types/` unless absolutely necessary.** If you must, flag it explicitly with the reason.
- **Don't touch v1 code** under `src/` (the existing pages, `src/lib/scoring.ts`, `src/lib/sheets.ts`, etc.). It'll be removed later in a separate cleanup task.
- **Don't run the dev server** to test. Use Vitest only.
- **Don't deploy anything.** No `firebase deploy`. The user will handle deployment.
- **Don't commit** unless you're confident the phase is complete. Let the user review and commit themselves.

---

## Resuming after interruption

If this conversation is starting fresh and previous work exists, the entry checklist is:

1. Run `ls src/lib/` and `ls src/lib/rules/` and `ls src/context/` to see what already exists.
2. Run `npm run test:run` to see what passes.
3. Open the most recently modified file in `src/lib/` to see where the last session left off.
4. Read `docs/V2_PLAN.md` if you haven't already.
5. Look for `TODO(human-review):` comments — these mark deferred decisions.

Then resume from the phase that matches the current state of the tree.
