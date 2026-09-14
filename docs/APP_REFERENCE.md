# Summer Challenge — implementation reference

This document describes **what the app does**, **how the React app is structured**, **why key decisions were made**, and **where to change things** for future work. It is meant to avoid re-scanning the whole repo for routine updates.

**Agent / maintainer agreement:** Cursor is configured (`.cursor/rules/app-reference.mdc`) to **read this doc when making changes** to the app. If a change **alters behavior** (routing, data/sync, context, env, scoring, theme contract, build/deploy), **update this file in the same PR/change** so it stays accurate.

---

## Product overview

The app is a **multi-member workout challenge tracker** backed by **Firestore**. There is **no user authentication** — each device picks a **member name** per challenge (stored in `localStorage`). Challenge owners set an **owner password** (SHA-256 + salt) to unlock admin actions.

Challenges are addressed by a **6-character slug** (`/c/:slug`). Each challenge has a **configurable rule set** (binary, counter, range, penalty, streak, tracker). Members log daily values on **Log day**; **Leaderboard**, **History**, **Home**, and **Rules** are read-only views over live Firestore data.

**Legacy:** The pre-v2 monolith lives in [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md). v1 React pages (`PersonLogCard`, Google Sign-In, `scoring.ts`, `sheets.ts`, etc.) have been removed from `src/`.

---

## Identity & trust model (no auth)

There are **no user accounts** and **no sign-in**. Access and identity work like this:

| Layer | What it controls | Where it lives |
|-------|------------------|----------------|
| **Challenge URL** | Who can open the app and read/write Firestore for that challenge | `/c/:slug` — slug is a 6-char secret shared out-of-band |
| **Member picker** | Which roster name this **device** logs as | `localStorage` `sc:selected:{slug}` → `memberId` |
| **Owner password** | Who can use admin screens (members, config, delete) | Hash + salt on the challenge doc; verified client-side; session in `sessionStorage` per tab |

### What anyone with the link can do

- **Read** all challenge data (members, entries, audit log) — Firestore rules allow public read ([`firestore.rules`](../firestore.rules)).
- **Write** entries for **any** member id they choose — there is no server check that the writer “is” that member. `createdByMemberId` and audit `actorMemberId` are **attribution only**, not proof of identity (see [`audit.ts`](../src/types/audit.ts) comments).
- **Create** a new challenge at `/new` (subject to the 1-hour client cooldown).
- **Open** `/admin` — but mutating admin actions require entering the owner password in that tab.

### Member identity (honor system)

1. Owner adds names to the roster at create time (or later in admin).
2. Each participant visits `/c/:slug/pick` and taps their name **once per device**.
3. That choice is cached locally; the same person can be a different member in a different challenge.
4. Any visitor can pick **any** active name — the app assumes a trusted group. Switch anytime via Log day header or Home **Switch**.

There is no password per member, no invite token, and no way to “lock” a name to a person.

### Owner identity (weak gate)

- Set once at create; stored as `ownerPasswordHash` + `ownerPasswordSalt` on the challenge doc (readable by anyone with the URL).
- [`AdminModeContext`](../src/context/AdminModeContext.tsx) verifies the password in the browser, then sets `isAdmin` for that tab until close or challenge change.
- **No recovery** if the password is lost — owner controls are gone unless someone else knows it.
- Intended for a casual friends-and-family group, not adversarial access control. See V2_PLAN §4.3.

### Routes without a member selected

| Route | Member required? |
|-------|------------------|
| `/c/:slug` (log) | Yes — `RequireMember` → `/pick` |
| `/c/:slug/home`, `/board`, `/history`, `/rules`, `/admin` | No — browse without picking a name |
| `/new` | No |

### Firebase Auth

`VITE_FIREBASE_AUTH_DOMAIN` is required by the Firebase SDK init ([`firebase.ts`](../src/lib/firebase.ts)) but **no auth UI or `signIn` flow exists** in the app.

---

## Product features (current)

### Identity & navigation

#### Member picker — [`PickMemberPage.tsx`](../src/pages/PickMemberPage.tsx) + [`SelectedMemberContext.tsx`](../src/context/SelectedMemberContext.tsx)

- **Route:** `/c/:slug/pick` — full-screen, no bottom nav / sidebar.
- **Storage:** `localStorage` key `sc:selected:{slug}` via [`selectedMember.ts`](../src/lib/selectedMember.ts).
- **Guard:** `RequireMember` on the log route redirects here when no member is selected or the selected member was removed (`isOrphaned`).
- **Switch member:** Log day header name button → `/pick`.

There is **no** Google Sign-In, global user account, or “switch user” auth flow.

#### Root redirect — [`RootRedirect.tsx`](../src/pages/RootRedirect.tsx)

- **Route:** `/`
- Most recent challenge from [`recentChallenges.ts`](../src/lib/recentChallenges.ts) → `/c/:slug`; else → `/new`.

#### Create challenge — [`CreateChallengePage.tsx`](../src/pages/CreateChallengePage.tsx)

- **Route:** `/new` — no auth gate.
- **Single scroll form** with three sections: (1) name & dates + timezone, (2) rules, (3) owner password & member names.
- **Presets:** Classic (gym/steps/junk/tracker — v1 parity), Minimal (single binary), or Custom (empty).
- **Rule editor:** [`RuleEditor.tsx`](../src/components/admin/RuleEditor.tsx) — kind descriptions, hints, **Load example** per kind from [`ruleDocs.ts`](../src/lib/rules/ruleDocs.ts).
- **Submit:** `createChallenge()` → adds members → navigates to `/c/:slug`.
- **Cooldown:** 1-hour client-side limit via [`createCooldown.ts`](../src/lib/createCooldown.ts).

#### Challenge shell — [`App.tsx`](../src/App.tsx)

- **Route prefix:** `/c/:slug/*`
- **Load:** `ChallengeProvider` resolves slug → subscribes to challenge doc, members, entries, auditLog.
- **Errors:** “Challenge not found.” when slug index miss or doc missing.
- **Nested routes:** see [Routing](#3-bootstrap-and-routing).

#### Main navigation — [`TopBar.tsx`](../src/components/layout/TopBar.tsx) + [`BottomNav.tsx`](../src/components/layout/BottomNav.tsx)

- **Desktop (≥ 768 px):** fixed left sidebar — Home, Log day, Leaderboard, History.
- **Mobile (< 768 px):** fixed bottom tab bar — same four tabs.
- **Not in nav:** Rules (`/rules`), Admin (`/admin`), Member profile (`/m/:id`) — reached from Home or Leaderboard.

---

### Log day — [`LogDayPage.tsx`](../src/pages/LogDayPage.tsx)

**Route:** `/c/:slug` (index, guarded by `RequireMember`).

#### Page structure

1. **Header** — “Log day”, member name (→ pick), date label, **today’s points** pill.
2. **Date strip** — challenge `startDate` through **today + 2 preview days**; chip states: today / logged / open / future.
3. **Week summary band** — week number, binary/penalty cap usage, free-pass counts.
4. **Rule cards** — one card per rule (via [`ruleCardRouter.tsx`](../src/components/log/ruleCardRouter.tsx)), sorted by `rule.order`.
5. **Streak bands** — attached to the rule they track, or standalone if orphaned. Each band shows **this run only**: labeled calendar days that count (filled dots), dashed projected days still needed, and a date range hint. State uses [`getStreakRunAtDate()`](../src/lib/rules/streakRun.ts) (positive scoring days per `evaluateEntry`, scoped to the selected log date).

#### Rule card kinds

| Kind | Component | Value stored |
|------|-----------|--------------|
| `binary` | [`BinaryRuleCard.tsx`](../src/components/log/BinaryRuleCard.tsx) | `'yes' \| 'no' \| 'free'` |
| `counter` | [`CounterRuleCard.tsx`](../src/components/log/CounterRuleCard.tsx) | `number` |
| `range` | [`RangeRuleCard.tsx`](../src/components/log/RangeRuleCard.tsx) | `number` |
| `penalty` | [`PenaltyRuleCard.tsx`](../src/components/log/PenaltyRuleCard.tsx) | `'clean' \| 'infraction' \| 'free'` |
| `tracker` | [`TrackerRuleCard.tsx`](../src/components/log/TrackerRuleCard.tsx) | `number` (daily measurement) |
| `streak` | [`StreakRuleCard.tsx`](../src/components/log/StreakRuleCard.tsx) | *(derived — no stored value)* |

#### Tracker rules

- Owner sets `maxPoints`, default `unit`, `decimals` on the rule.
- Each member sets personal goal on first log (`label`, `unit`, `startVal`, `goalVal`, `direction`) → stored on `members/{id}.trackerConfig`.
- Scoring: [`trackerProgress.ts`](../src/lib/rules/trackerProgress.ts) — progress toward goal × `maxPoints`.
- **Leaderboard:** only the **latest** tracker entry per member counts toward totals ([`aggregate.ts`](../src/lib/rules/aggregate.ts)).

#### Save behavior

- **Per-rule save:** choosing a value calls `upsertEntry()` immediately (no whole-day confirm bar).
- **One entry per (member, date):** `values` is a map `{ [ruleId]: RawEntryValue }`; each save merges into that day’s doc.
- **Points:** recomputed on every upsert via [`evaluateEntry()`](../src/lib/rules/evaluate.ts) and snapshotted on the entry.
- **Locked when:** challenge `status === 'ended'`, date is in the **future**, or date is outside `[startDate, endDate]` / before start ([`isWithinEditWindow()`](../src/lib/dates.ts)).
- **Editable:** any in-range past day while the challenge is active (updates are allowed).

#### Range scoring

In-band points scale linearly from `pointsAtMin` (at band low) to `pointsAtMax` (at band high); `pointsOutside` when out of band. Implemented in [`ruleDocs.ts`](../src/lib/rules/ruleDocs.ts) `scoreRangeValue`.

---

### Home — [`ChallengeHomePage.tsx`](../src/pages/ChallengeHomePage.tsx)

**Route:** `/c/:slug/home`

- Hero stats: week number, days left, member count.
- “You” card with rank and points; **Switch** → `/pick`.
- **Log today** CTA → `/c/:slug` (disabled before start or after end).
- Podium peek + standings snippet → full board.
- Header actions: **New challenge** (`/new`), **Settings** (`/admin`).

---

### Leaderboard — [`LeaderboardPage.tsx`](../src/pages/LeaderboardPage.tsx)

**Route:** `/c/:slug/board`

- **Data:** [`buildLeaderboard()`](../src/lib/rules/aggregate.ts) over `activeMembers` + `entries`.
- **View modes:** Total · Per rule · Avg/day (segment control).
- **Podium:** top 3 (display order 2nd, 1st, 3rd).
- **Standings table:** expandable per-rule bars; row click → [`MemberProfilePage`](../src/pages/MemberProfilePage.tsx).
- **Inactive members** excluded from standings.

---

### History — [`HistoryPage.tsx`](../src/pages/HistoryPage.tsx)

**Route:** `/c/:slug/history`

- **Source:** `auditLog` from `ChallengeContext` (not a reconstructed workout table).
- **Filters:** All · Entries · Admin.
- **Grouped by date;** entry rows show rule-level diffs (e.g. “Steps: 7000 → 8500”).
- **Actions covered:** challenge create/config/status, member add/remove/rename, entry create/update/delete, owner login attempts.

There is **no** “clear all data” admin action and **no** Kunle-name gate.

---

### Member profile — [`MemberProfilePage.tsx`](../src/pages/MemberProfilePage.tsx)

**Route:** `/c/:slug/m/:memberId`

- Per-member totals, per-rule breakdown, recent entries.

---

### Rules reference — [`RulesReferencePage.tsx`](../src/pages/RulesReferencePage.tsx)

**Route:** `/c/:slug/rules`

- Read-only list of challenge rules with formulas from `formatRuleFormula`.

---

### Admin — [`AdminPage.tsx`](../src/pages/AdminPage.tsx) + [`AdminModeContext.tsx`](../src/context/AdminModeContext.tsx)

**Route:** `/c/:slug/admin` (wrapped in `AdminModeProvider`).

1. **Password gate** — verifies against `challenge.ownerPasswordHash` / `ownerPasswordSalt` ([`ownerAuth.ts`](../src/lib/ownerAuth.ts)); session in `sessionStorage` (per tab).
2. **Home** — Members · Rules & dates · Audit log.
3. **Members** — add, soft-remove (`active: false`), rename; name conflicts return suggested suffix.
4. **Config** — edit rules/dates; end/reopen challenge; delete challenge (type name to confirm).
5. **Audit** — full audit log viewer (admin UI).

Owner actions write audit entries via [`audit.ts`](../src/lib/audit.ts). Entry delete is owner-only ([`entries.ts`](../src/lib/entries.ts) `deleteEntry`).

---

## 1. Purpose and stack

| Piece | Choice | Why |
|-------|--------|-----|
| Build | **Vite 5** | Fast dev server, simple `dist/` output for static hosting. |
| UI | **React 18 + TypeScript (strict)** | Typed domain model and predictable UI updates. |
| Styling | **styled-components** | Component-local CSS, theme via `ThemeProvider`. |
| Routing | **React Router v6** | Slug-scoped `/c/:slug/*`; Netlify SPA redirects. |
| Data | **Firestore** | Real-time `onSnapshot` on challenge-scoped collections. |
| Tests | **Vitest** | Unit tests for rules, dates, auth hash, presets. |

---

## 2. Repository layout (quick map)

```
summer-challenge/
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── firestore.rules
├── netlify.toml
├── .env.example
├── .nvmrc
├── scripts/check-node.cjs
├── docs/
│   ├── APP_REFERENCE.md       # ← this file
│   ├── V2_PLAN.md
│   ├── DESIGN_BRIEF.md
│   └── ARCHIVED_ENCOURAGEMENT_FEATURE.md  # removed v1 feature spec only
└── src/
    ├── main.tsx               # BrowserRouter → Theme → App
    ├── App.tsx                # Route tree + ChallengeProvider shell
    ├── vite-env.d.ts
    ├── types/                   # rule, challenge, member, entry, audit, aggregates, localStorage
    ├── lib/
    │   ├── firebase.ts
    │   ├── challenges.ts      # create, update config, status, delete
    │   ├── members.ts
    │   ├── entries.ts
    │   ├── audit.ts
    │   ├── dates.ts
    │   ├── ownerAuth.ts
    │   ├── createCooldown.ts
    │   ├── recentChallenges.ts
    │   ├── selectedMember.ts
    │   └── rules/             # evaluate, aggregate, presets, kinds, ruleDocs, trackerProgress
    ├── context/
    │   ├── ChallengeContext.tsx
    │   ├── SelectedMemberContext.tsx
    │   └── AdminModeContext.tsx
    ├── theme/
    ├── components/
    │   ├── layout/            # Layout, TopBar, BottomNav, LoadingState, ErrorBoundary
    │   ├── log/               # Rule cards + ruleCardRouter
    │   ├── admin/             # RuleEditor
    │   └── ui/                # Icons, MemberBadge
    └── pages/
        RootRedirect, CreateChallengePage, PickMemberPage
        ChallengeHomePage, LogDayPage, LeaderboardPage, HistoryPage
        MemberProfilePage, RulesReferencePage, AdminPage
```

There is **no `hooks/` folder**: use **`useChallenge`**, **`useSelectedMember`**, and **`useAdminMode`** from context.

---

## 3. Bootstrap and routing

| File | Role |
|------|------|
| [`src/main.tsx`](../src/main.tsx) | `StrictMode` → `BrowserRouter` → `AppThemeProvider` → `GlobalStyle` → `App`. |
| [`src/App.tsx`](../src/App.tsx) | Full route tree; no auth gate. |

**Route tree**

| Path | Page | Notes |
|------|------|-------|
| `/` | `RootRedirect` | Recent challenge → `/c/:slug`, else → `/new`. |
| `/new` | `CreateChallengePage` | Create wizard. |
| `/c/:slug` | `LogDayPage` | Default log view. `RequireMember` → `/pick` if no member. |
| `/c/:slug/home` | `ChallengeHomePage` | Dashboard. No member guard. |
| `/c/:slug/pick` | `PickMemberPage` | Full-screen; no chrome. |
| `/c/:slug/log` | redirect | → `/c/:slug` (bookmark alias). |
| `/c/:slug/board` | `LeaderboardPage` | Podium + standings. |
| `/c/:slug/history` | `HistoryPage` | Audit log feed. |
| `/c/:slug/m/:memberId` | `MemberProfilePage` | Per-member breakdown. |
| `/c/:slug/rules` | `RulesReferencePage` | Read-only rules. |
| `/c/:slug/admin` | `AdminPage` | Password gate → admin sub-views. `AdminModeProvider`. |
| `*` | `Navigate` | → `/`. |

**Provider chain for `/c/:slug/*`:** `ChallengeProvider` (slug resolution + 4 `onSnapshot` listeners + slug index read) → `SelectedMemberProvider` → `Outlet`. Chrome routes use pathless `ChromeLayout` → `Layout` with `TopBar` + `BottomNav`. `/pick` is outside `ChromeLayout`.

**Guards:** `RequireMember` checks `useSelectedMember()`. Admin password gate is inside `AdminPage`, not a route guard.

**Error boundaries:** Each route element wrapped in `<RouteEB>` → `<ErrorBoundary>`.

---

## 4. Contexts

### `ChallengeProvider` / `useChallenge` — [`ChallengeContext.tsx`](../src/context/ChallengeContext.tsx)

| Field | Detail |
|-------|--------|
| `challenge` | Firestore challenge doc or `null`. |
| `loading` | `true` until slug resolved + first challenge-doc snapshot. |
| `error` | Firestore error string or `null`. |
| `notFound` | `true` if slug doesn't resolve. |
| `members` | All members (active + removed). Real-time. |
| `entries` | All entries. Real-time. |
| `auditLog` | Newest-first (`orderBy timestamp desc`). Non-fatal permission errors are `console.warn` only. |
| `isEnded` | `challenge.status === 'ended'`. |
| `activeMembers` | `members.filter(m => m.active)` sorted by name. |

**Listeners:** `slugIndex/{slug}` (one-time `getDoc`) · `challenges/{id}` · `members` · `entries` · `auditLog`.

On first successful load, [`recordChallengeVisit()`](../src/lib/recentChallenges.ts) updates localStorage.

### `SelectedMemberProvider` / `useSelectedMember` — [`SelectedMemberContext.tsx`](../src/context/SelectedMemberContext.tsx)

| Field | Detail |
|-------|--------|
| `selectedMemberId` | Cached member id for this slug, or `null`. |
| `isOrphaned` | Selected member no longer active → redirect to `/pick`. |
| `setSelectedMemberId` | Write localStorage + state. |
| `clearSelectedMemberId` | Clear selection. |

### `AdminModeProvider` / `useAdminMode` — [`AdminModeContext.tsx`](../src/context/AdminModeContext.tsx)

| Field | Detail |
|-------|--------|
| `isAdmin` | Owner password accepted this tab session. |
| `enterAdminMode` | Verify password; audit `owner.login` / `owner.login_failed`. |
| `exitAdminMode` | Clear sessionStorage session. |

Resets when `challengeId` changes or tab closes.

---

## 5. Theme (`src/theme/`)

| File | Purpose |
|------|---------|
| [`theme.ts`](../src/theme/theme.ts) | `AppTheme`: `color.*`, `font.display` / `font.body` / `font.mono` (Geist), `radii.*`. |
| [`styled.d.ts`](../src/theme/styled.d.ts) | `DefaultTheme` extends `AppTheme`. |
| [`AppThemeProvider.tsx`](../src/theme/AppThemeProvider.tsx) | `ThemeProvider theme={appTheme}`. |
| [`GlobalStyle.tsx`](../src/theme/GlobalStyle.tsx) | Reset + `body` from theme. |

---

## 6. Firestore data model

**Top-level**

| Collection | Doc | Purpose |
|------------|-----|---------|
| `slugIndex` | `{slug}` | `{ challengeId }` — URL lookup |
| `challenges` | `{challengeId}` | Challenge root doc |

**Challenge doc fields:** `slug`, `name`, `createdAt`, `status` (`active` \| `ended`), `ownerPasswordHash`, `ownerPasswordSalt`, `config`.

**`config`:** `startDate`, `endDate` (nullable = open-ended), `weekAnchor`, `timezone`, `rules[]`.

**Subcollections under `challenges/{id}/`:**

| Subcollection | Key fields |
|---------------|------------|
| `members/{memberId}` | `name`, `active`, `removedAt`, `trackerConfig?` |
| `entries/{entryId}` | `memberId`, `date`, `values`, `pts`, `createdAt`, `updatedAt`, `createdByMemberId` |
| `auditLog/{logId}` | `timestamp`, `actorMemberId`, `actorIsOwner`, `action`, `target`, `before`, `after` |

**Share link:** `/c/:slug` (no separate join flow).

Security rules: [`firestore.rules`](../firestore.rules) — public read; shape-validated writes; audit log append-only; no hard deletes on challenge/member/entry docs from clients (soft-remove members; owner delete uses client batch where allowed).

---

## 7. Layout and shared UI

**[`Layout.tsx`](../src/components/layout/Layout.tsx)**

- **< 768 px:** `BottomNav` (fixed, 64 px + safe area) + main with bottom padding.
- **≥ 768 px:** `TopBar` (fixed 200 px sidebar) + main shifted right; `BottomNav` hidden.

| Component | Role |
|-----------|------|
| `LoadingState` | Full-screen loading message |
| `ErrorBoundary` | “Something went wrong” + Reload |

---

## 8. Rule engine (`src/lib/rules/`)

### Scoring — [`evaluate.ts`](../src/lib/rules/evaluate.ts)

- **`evaluateEntry(challenge, entry, member, memberEntries)`** — per-rule points for one day.
- **Weekly caps** (binary): count distinct positive-scoring **dates** in the week before today; cap applies in evaluator.
- **Penalty waiver:** first `infraction` per week can net to 0 when `weeklyFirstWaived`.
- **Free passes:** lifetime count per rule; `'free'` value consumes quota.
- **Streak rules:** always 0 here; bonuses computed in aggregate.

Week boundaries: [`getWeekWindow()`](../src/lib/dates.ts) from `config.weekAnchor` (7-day windows, **not** ISO Monday).

### Aggregation — [`aggregate.ts`](../src/lib/rules/aggregate.ts)

| Function | Use |
|----------|-----|
| `aggregateMember` | One member’s standing |
| `buildLeaderboard` | All active members, sorted |
| `buildWeeklySummary` | Cap/free-pass stats for log UI |

Tracker totals use **latest entry only** per tracker rule. Streak bonuses added in `computeStreakBonuses`.

### Presets — [`presets.ts`](../src/lib/rules/presets.ts)

- **`classicPreset`** — Gym (binary, cap 4, 5 free) · Steps (10k → 5 pts) · Junk (penalty, first waived, 5 free) · Personal Goal (tracker, 30 pts max).
- **`minimalPreset`** — single binary rule.

---

## 9. Library modules (`src/lib/`)

| Module | Responsibility |
|--------|----------------|
| `firebase.ts` | App init; exports `db` |
| `challenges.ts` | Create, update config, change status, delete |
| `members.ts` | Add, remove, rename, `setTrackerConfig` |
| `entries.ts` | `upsertEntry`, `deleteEntry` (owner) |
| `audit.ts` | Append audit rows on every write |
| `dates.ts` | Timezone dates, `isWithinEditWindow`, week windows |
| `ownerAuth.ts` | SHA-256 password hash + verify |
| `createCooldown.ts` | 1-hour create throttle (localStorage) |
| `recentChallenges.ts` | Recent slug list for `/` redirect |
| `selectedMember.ts` | Per-slug member id in localStorage |

**Not wired at runtime:** [`appCheck.ts`](../src/lib/appCheck.ts) exists but is not imported anywhere.

---

## 10. Types (`src/types/`)

Split across focused files; barrel export in [`index.ts`](../src/types/index.ts).

| Type | File |
|------|------|
| `Rule`, rule kinds | `rule.ts` |
| `Challenge`, `ChallengeConfig` | `challenge.ts` |
| `Member`, `MemberTrackerConfig` | `member.ts` |
| `Entry`, `RawEntryValue` | `entry.ts` |
| `AuditLogEntry`, `AuditAction` | `audit.ts` |
| `MemberStanding`, `Leaderboard`, `WeeklySummary` | `aggregates.ts` |
| `LS_KEYS`, localStorage shapes | `localStorage.ts` |

---

## 11. Configuration and environment

| Variable | Used in | Notes |
|----------|---------|--------|
| `VITE_FIREBASE_API_KEY` | `firebase.ts` | **Required** |
| `VITE_FIREBASE_AUTH_DOMAIN` | `firebase.ts` | Required by Firebase SDK (auth not used in UI) |
| `VITE_FIREBASE_PROJECT_ID` | `firebase.ts` | **Required** |
| `VITE_FIREBASE_APP_ID` | `firebase.ts` | **Required** |
| `VITE_FIREBASE_STORAGE_BUCKET` | `firebase.ts` | Optional |

**Legacy env vars** (`VITE_SCRIPT_URL`, `VITE_PEOPLE`, `VITE_CHALLENGE_*`, `VITE_GOAL_RESET_*`) remain in [`vite-env.d.ts`](../src/vite-env.d.ts) and [`.env.example`](../.env.example) but are **not read by any `src/` module**.

**Typing:** [`src/vite-env.d.ts`](../src/vite-env.d.ts). **Deploy:** [`netlify.toml`](../netlify.toml).

---

## 12. Build and deploy

**Node.js ≥ 18** (use **20** per `.nvmrc`). `scripts/check-node.cjs` runs on `predev` / `prebuild` / `prepreview`.

| Command | Output |
|---------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit` + `vite build` → `dist/` |
| `npm test` | Vitest |

SPA: all routes → `index.html`.

---

## 13. Not in the shipping build

| Item | Notes |
|------|-------|
| Google Sign-In / Firebase Auth UI | Removed with v1 |
| Google Sheets / `sheets.ts` | Removed |
| Fixed gym/steps/junk UI | Replaced by rule cards |
| `scoring.ts` / `history.ts` / `config.ts` | Removed |
| “For today” encouragement card | Spec in [`ARCHIVED_ENCOURAGEMENT_FEATURE.md`](ARCHIVED_ENCOURAGEMENT_FEATURE.md); no `archive/` code in repo |
| Goal reset window UI | No env-driven reset flow in v2 |
| Firebase App Check | Stub in `appCheck.ts`, not initialized |

---

## 14. Conventions for future changes

1. **New challenge-scoped route** — Add under `/c/:slug` in `App.tsx`; add nav link if it belongs in primary tabs.
2. **New rule kind** — `types/rule.ts` + `types/entry.ts` + `evaluate.ts` + card component + `ruleCardRouter.tsx` + `RuleEditor` + tests.
3. **New Firestore field** — `types/` → write module → `ChallengeContext` if subscribed → pages.
4. **New theme token** — `theme/theme.ts` + `styled.d.ts`.
5. **Behavior change** — update this doc in the same change.

---

## 15. Related docs

| Document | Use |
|----------|-----|
| [`README.md`](../README.md) | Quick start, env, Netlify |
| [`V2_PLAN.md`](V2_PLAN.md) | Original v2 design decisions |
| [`DESIGN_BRIEF.md`](DESIGN_BRIEF.md) | Visual / UX brief |
| [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md) | Pre-React monolith |
| [`.env.example`](../.env.example) | Env template (includes legacy vars) |

---

*Last updated: audited against v2 codebase — removed v1-only features (Google Auth, Sheets, PersonLogCard, scoring.ts, etc.).*
