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
| `/c/:slug` (Home) | Yes — `RequireMember` → `/pick` |
| `/c/:slug/log` (Log day) | Yes — `RequireMember` → `/pick` |
| `/c/:slug/board`, `/history`, `/rules`, `/m/:id`, `/admin` | No — browse without picking a name |
| `/new` | No |

Home and Log are personal (your points, your rank, your day), so both require a
member. The read-only views stay open so a shared link always opens on something.

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

#### Main navigation — [`BottomNav.tsx`](../src/components/layout/BottomNav.tsx)

- **Every width:** a bottom tab bar with four tabs — **Home · Board · History · Rules**.
- **No desktop sidebar.** The v2 design specifies a single 390 px layout, so
  [`Screen`](../src/components/layout/Screen.tsx) caps the column at
  `theme.size.contentMax` (480 px) and centres it rather than inventing a wide
  variant. Everything inside is fluid down to 320 px.
- **Log day is not a tab** — it is the primary CTA on Home, which is what the
  Home screen is built around.
- **Not in nav:** Admin (`/admin`, via the gear in the Home header), Member
  profile (`/m/:id`, from Home or Leaderboard).

---

### Log day — [`LogDayPage.tsx`](../src/pages/LogDayPage.tsx)

**Route:** `/c/:slug/log` (guarded by `RequireMember`).

Two modes, both from the same page and the same data:

| When | Shape |
|------|-------|
| Today | **Step wizard** — one rule per screen, progress bar, Back / Next, final save, then a celebration screen |
| A past day (`?date=YYYY-MM-DD`) | **One editable list** — every rule at once, Cancel / Save changes |

A past day is reviewed as a whole rather than stepped through: you're checking
what's there against what you remember, and Next would hide the other answers.

`?rule=<id>` opens the wizard at that rule — Home's Today cards link that way.

#### Save behaviour

- **Batch save.** The wizard collects a whole day and writes it with **one**
  `upsertEntry()` call. The write path always accepted a full `values` map, so
  the old per-rule immediate save was only ever a UI choice.
- **One entry per (member, date).** `values` is `{ [ruleId]: RawEntryValue }`.
- **Points** are recomputed on every upsert via [`evaluateEntry()`](../src/lib/rules/evaluate.ts)
  and snapshotted on the entry. Nothing reads that snapshot back — aggregation
  always recomputes (see §8).
- **Server values sit under local edits.** A `touched` set means a Firestore
  snapshot landing mid-edit can never overwrite what was just typed.
- **Live preview** builds a synthetic `Entry` from the draft and runs the real
  evaluator, so caps, waivers and free passes are right before saving.
- **Locked when:** `status === 'ended'`, or the date is outside
  `[startDate, endDate]` ([`isWithinEditWindow()`](../src/lib/dates.ts)).

#### Rule inputs — [`RuleInput.tsx`](../src/components/log/RuleInput.tsx)

One input per **kind**, not per rule, taking unit/decimals/bounds from the rule:

| Kind | Input | Value stored |
|------|-------|--------------|
| `binary` | Two choices + free-pass control | `'yes' \| 'no' \| 'free'` |
| `penalty` | Two choices + free-pass control | `'clean' \| 'infraction' \| 'free'` |
| `counter` | Number + quick-value chips around the target | `number` |
| `range` | Number + unit | `number` |
| `tracker` | Number + unit | `number` |
| `streak` | *(no input — derived)* | — |

#### Free passes

Spendable from the log, which they never were before. The control sits **below**
the two real answers rather than beside them — spending a pass is a rescue, not
a peer of doing the thing — and carries the remaining balance.

[`getFreePassState()`](../src/lib/rules/kinds.ts) takes an `excludeDate` so
re-opening the day a pass was spent on doesn't show it as both gone and
available.

#### Tracker goal setup

A tracker rule with no `member.trackerConfig` inserts a **goal-setup step**
before its input: label, unit, start, goal. Direction is derived (goal below
start = `'down'`). The v2 design has no such screen — it puts start and goal on
the rule, which is not where they live.

#### Rule retirement

`activeRules()` drives the wizard, Home's Today list and the Rules page, so a
rule with `active: false` disappears from all of them. **Scoring ignores the
flag** — see §8.

---

### Home — [`ChallengeHomePage.tsx`](../src/pages/ChallengeHomePage.tsx)

**Route:** `/c/:slug` (index, guarded by `RequireMember`). The landing screen.

1. **Dark hero** — avatar (→ `/pick`), challenge name, week and date, gear
   (→ `/admin`); a "Logging as …" chip; a progress bar; and three stats —
   points, logged-day streak, rank.
2. **Primary CTA** — "Log today" / "Finish today's log · N left" / "Edit today's
   log", disabled before the start date and after the challenge ends.
3. **Today** — one card per daily rule with its value and points, plus any
   streak rule's pip strip attached to the rule it watches.
4. **Personal goal** — the tracker card with progress track and knob.
5. **Leaderboard peek** — top three, linking to profiles.

`/c/:slug/home` redirects here so pre-redesign bookmarks resolve.

---

### Leaderboard — [`LeaderboardPage.tsx`](../src/pages/LeaderboardPage.tsx)

**Route:** `/c/:slug/board`

- **Scopes:** **All time** · **This week** (segmented control).
- **Week scope** passes a `DateRange` to [`buildLeaderboard()`](../src/lib/rules/aggregate.ts).
  The range is applied **when totting points up, not by filtering entries first** —
  weekly caps, penalty waivers and streak runs all depend on days outside the
  window, so filtering first would quietly change how the remaining days score.
- **Rank-change pills** in week scope show the move against all-time rank.
- **Podium:** top 3 (display order 2nd, 1st, 3rd), hidden below three members.
- **Standings:** plain list in rank order, each row → `MemberProfilePage`.
  The prototype absolutely positions rows at a fixed height to animate reorders;
  that overlaps at 200% text zoom, so it isn't reproduced.
- **States:** loading skeletons · error with retry · empty · populated.
- **Inactive members** excluded.

---

### History — [`HistoryPage.tsx`](../src/pages/HistoryPage.tsx)

**Route:** `/c/:slug/history`

- **Every day of the challenge so far**, newest first, one row each: date label,
  how many rules are filled, per-rule tick marks, the day's points.
- Each row links to `/c/:slug/log?date=…` — the same editor used everywhere.
- **This is no longer the audit-log feed.** The audit viewer moved to `/admin`
  (Settings → History log), where it gained filters and a per-change diff.

---

### Member profile — [`MemberProfilePage.tsx`](../src/pages/MemberProfilePage.tsx)

**Route:** `/c/:slug/m/:memberId`

- Total points, logged-day streak ring, per-rule contribution bars, and a
  seven-day grid for the current challenge week.
- **Owner actions** (remove, with an Undo toast) appear only when admin mode is
  unlocked — `AdminModeProvider` now wraps the whole challenge, not just `/admin`.
- Empty state for a member who has logged nothing; not-found state for a bad id.

---

### Rules reference — [`RulesReferencePage.tsx`](../src/pages/RulesReferencePage.tsx)

**Route:** `/c/:slug/rules`

- One row per active rule: formula from `formatRuleFormula`, plus what the rule
  is doing for you right now (today's value, streak progress, free passes left).
- Tapping expands a plain-language explanation from
  [`explainRule()`](../src/lib/rules/ruleDocs.ts), which uses the rule's real
  numbers. `rule.description` overrides it when set. **One panel open at a time.**

---

### Settings — [`AdminPage.tsx`](../src/pages/AdminPage.tsx) + [`AdminModeContext.tsx`](../src/context/AdminModeContext.tsx)

**Route:** `/c/:slug/admin`

1. **Password gate** — verifies against `ownerPasswordHash` / `ownerPasswordSalt`
   ([`ownerAuth.ts`](../src/lib/ownerAuth.ts)); session in `sessionStorage`, per tab.
2. **One settings page**, not a menu of sub-screens:
   - **Basics** — challenge name (now editable, via `renameChallenge`) and end date
   - **Rules** — retire switch, edit, add, delete
   - **Members** — add, rename, remove (with Undo), put back
   - **History log** — the audit viewer, filtered by All / Entries / Members / Config / Owner
   - **Danger** — end / reopen the challenge, delete it (type the name to confirm)
3. **Rule editor** — [`RuleEditor.tsx`](../src/components/admin/RuleEditor.tsx),
   a full-screen surface covering every field of all six kinds. Kind can only be
   chosen while creating: switching it on a live rule would orphan every value
   logged against it.

Audit rendering lives in [`auditDisplay.ts`](../src/lib/auditDisplay.ts) as pure
functions. `auditChanges()` lists only fields that actually differ.

Owner actions write audit entries via [`audit.ts`](../src/lib/audit.ts).

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
    │   ├── auditDisplay.ts    # audit row → title, category, change list
    │   └── rules/             # evaluate, aggregate, presets, kinds, ruleDocs,
    │                          # trackerProgress, streakRun, display, ruleLook
    ├── context/
    │   ├── ChallengeContext.tsx
    │   ├── SelectedMemberContext.tsx
    │   └── AdminModeContext.tsx
    ├── theme/
    ├── components/
    │   ├── layout/            # Screen kit, Layout, BottomNav, LoadingState, ErrorBoundary
    │   ├── log/               # RuleInput (+ free-pass control, points preview)
    │   ├── admin/             # RuleEditor
    │   └── ui/                # primitives, feedback, Icons, Tile, MemberBadge
    ├── test/                  # fixtures for render tests
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
| `/c/:slug` | `ChallengeHomePage` | Landing screen. `RequireMember` → `/pick`. |
| `/c/:slug/log` | `LogDayPage` | Wizard for today; `?date=` opens a past day, `?rule=` jumps to a rule. `RequireMember`. |
| `/c/:slug/home` | redirect | → `/c/:slug` (pre-redesign bookmarks). |
| `/c/:slug/pick` | `PickMemberPage` | Full-screen; no chrome. |
| `/c/:slug/board` | `LeaderboardPage` | Podium + standings. |
| `/c/:slug/history` | `HistoryPage` | Audit log feed. |
| `/c/:slug/m/:memberId` | `MemberProfilePage` | Per-member breakdown. |
| `/c/:slug/rules` | `RulesReferencePage` | Read-only rules. |
| `/c/:slug/admin` | `AdminPage` | Password gate → admin sub-views. `AdminModeProvider`. |
| `*` | `Navigate` | → `/`. |

**Provider chain for `/c/:slug/*`:** `ChallengeProvider` (slug resolution + 4 `onSnapshot` listeners + slug index read) → `SelectedMemberProvider` → `AdminModeProvider` → `Outlet`. Chrome routes use pathless `ChromeLayout` → `Layout` with `BottomNav`. `/pick` is outside `ChromeLayout`.

`AdminModeProvider` wraps the whole challenge rather than only `/admin`, so
owner-only controls can appear where they belong (removing a member from their
profile, for instance). Unlocking still happens once, on Settings, and still
lasts only for that tab.

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
| [`theme.ts`](../src/theme/theme.ts) | `AppTheme`: `color.*`, `tone.*` (six pastel tile tones), `font.*` (Sora display, Plus Jakarta Sans body), `radii.*`, `shadow.*`, `ease.*`, `size.*`. |
| [`styled.d.ts`](../src/theme/styled.d.ts) | `DefaultTheme` extends `AppTheme`. |
| [`AppThemeProvider.tsx`](../src/theme/AppThemeProvider.tsx) | `ThemeProvider theme={appTheme}`. |
| [`GlobalStyle.tsx`](../src/theme/GlobalStyle.tsx) | Reset, six-step type ramp, focus ring, `prefers-reduced-motion`. |

**Every colour in `src/` comes from the theme** — there are no hardcoded hex
values outside `src/theme/`. Two deliberate departures from the source design,
recorded in [`REDESIGN_DECISIONS.md`](REDESIGN_DECISIONS.md): `ink3` is darkened
to clear WCAG AA (3.2:1 → 4.95:1), and interactive targets are raised to 44 px.

Shared components live in [`ui/primitives.tsx`](../src/components/ui/primitives.tsx)
(buttons, rows, fields, choices, chips, segmented, switch, stepper, pills,
meters), [`ui/feedback.tsx`](../src/components/ui/feedback.tsx) (dialog, toast,
ring, count-up, empty state, skeleton) and
[`layout/Screen.tsx`](../src/components/layout/Screen.tsx) (screen shell, top
bar, hero, stats, footer bar).

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

**[`Layout.tsx`](../src/components/layout/Layout.tsx)** — a `Screen` with the
`BottomNav` pinned beneath it. One layout at every width: the column is capped
at 480 px and centred, with the app background either side. No desktop sidebar.

| Component | Role |
|-----------|------|
| `Screen` / `Body` / `Sheet` | The scrolling column and its padded content |
| `TopBar` / `Hero` / `Stats` / `FootBar` | Header, dark panel, stat strip, sticky actions |
| `LoadingState` | Full-screen loading message |
| `ErrorBoundary` | Names what broke, confirms logged data is safe, offers a reload |
| `EmptyState` | Shared empty / error state — every screen has one |
| `Dialog` / `Toast` | Bottom-sheet modal with a focus trap; undo toast |

Every screen designs all four states — loading, empty, error, populated — and
`screens.smoke.test.tsx` renders each of them.

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
| `aggregateMember` | One member's standing; optional `DateRange` |
| `buildLeaderboard` | All active members, sorted; optional `DateRange` |
| `buildWeeklySummary` | Cap / free-pass stats for the log UI |
| `getLoggedDayStreak` | Consecutive days logged, counting back from today |

Tracker totals use **latest entry only** per tracker rule. Streak bonuses added
in `computeStreakBonuses`.

**Aggregation always recomputes from raw values** — nothing reads the `pts`
snapshotted on the entry doc. Two consequences worth knowing:

- Editing a rule **re-scores every day ever logged against it**, including past
  weeks. The rule editor says so; the source design claims the opposite.
- `rule.active` is therefore **ignored by scoring**. Retiring a rule takes it off
  the log from that moment; the values already logged keep scoring exactly as
  before. Honouring the flag would have retroactively voided a rule's whole
  contribution the instant an owner toggled it.

`DateRange` ("this week" on the leaderboard) is applied when accumulating, not by
filtering entries before evaluation — caps, waivers and streak runs all depend on
days outside the window.

### Free passes — [`kinds.ts`](../src/lib/rules/kinds.ts)

`getFreePassState(rule, entries, excludeDate?)` → `{ offered, quota, used, left,
spentOnDate }`. Binary and penalty rules only. `excludeDate` keeps a pass spent
on the day being edited out of the "used" count, so re-opening that day doesn't
show the pass as both gone and available.

### Presets — [`presets.ts`](../src/lib/rules/presets.ts)

- **`classicPreset`** — Gym (binary, cap 4, 5 free) · Steps (10k → 5 pts) · Junk (penalty, first waived, 5 free) · Personal Goal (tracker, 30 pts max).
- **`minimalPreset`** — single binary rule.

---

## 9. Library modules (`src/lib/`)

| Module | Responsibility |
|--------|----------------|
| `firebase.ts` | App init; exports `db` |
| `challenges.ts` | Create, update config, **rename**, change status, delete |
| `members.ts` | Add, remove, **restore**, rename, `setTrackerConfig` |
| `entries.ts` | `upsertEntry`, `deleteEntry` (owner) |
| `audit.ts` | Append audit rows on every write |
| `dates.ts` | Timezone dates, `isWithinEditWindow`, week windows |
| `ownerAuth.ts` | SHA-256 password hash + verify |
| `createCooldown.ts` | 1-hour create throttle (localStorage) |
| `recentChallenges.ts` | Recent slug list for `/` redirect |
| `selectedMember.ts` | Per-slug member id in localStorage |
| `auditDisplay.ts` | Audit row → title, category, change list |

**Not wired at runtime:** [`appCheck.ts`](../src/lib/appCheck.ts) exists but is not imported anywhere.

---

## 10. Types (`src/types/`)

Split across focused files; barrel export in [`index.ts`](../src/types/index.ts).

| Type | File |
|------|------|
| `Rule` (incl. `active`), rule kinds, `isRuleActive` / `activeRules` | `rule.ts` |
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
| `npm test` | Vitest (watch) |
| `npm run test:run` | Vitest, single pass |

`vitest.config.ts` mirrors the `@/` alias from `vite.config.ts` so tests can
import pages the same way the app does.

SPA: all routes → `index.html`.

---

## 13. Not in the shipping build

| Item | Notes |
|------|-------|
| Google Sign-In / Firebase Auth UI | Removed with v1 |
| Google Sheets / `sheets.ts` | Removed |
| Fixed gym/steps/junk UI | Replaced by kind-driven rule inputs |
| `scoring.ts` / `history.ts` / `config.ts` | Removed |
| “For today” encouragement card | Spec in [`ARCHIVED_ENCOURAGEMENT_FEATURE.md`](ARCHIVED_ENCOURAGEMENT_FEATURE.md); no `archive/` code in repo |
| Goal reset window UI | No env-driven reset flow in v2 |
| Firebase App Check | Stub in `appCheck.ts`, not initialized |

---

## 14. Conventions for future changes

1. **New challenge-scoped route** — Add under `/c/:slug` in `App.tsx`; add nav link if it belongs in primary tabs.
2. **New rule kind** — `types/rule.ts` + `types/entry.ts` + `evaluate.ts` +
   a branch in `RuleInput.tsx` + `display.ts` + `ruleLook.ts` (tone and glyph) +
   `ruleDocs.ts` (`defaultForKind`, `explainRule`, `formatRuleFormula`) +
   `RuleEditor` + tests.
3. **New Firestore field** — `types/` → write module → `ChallengeContext` if subscribed → pages.
4. **New theme token** — `theme/theme.ts` (`styled.d.ts` picks it up
   automatically). Never write a colour literal in a component.
5. **New screen** — add a case to `src/pages/screens.smoke.test.tsx`. It renders
   each page with realistic fixtures across empty, error and edge states, which
   catches crashes a typecheck cannot.
6. **Behaviour change** — update this doc in the same change.

---

## 15. Related docs

| Document | Use |
|----------|-----|
| [`README.md`](../README.md) | Quick start, env, Netlify |
| [`V2_PLAN.md`](V2_PLAN.md) | Original v2 design decisions |
| [`DESIGN_BRIEF.md`](DESIGN_BRIEF.md) | Visual / UX brief (pre-redesign) |
| [`REDESIGN_DECISIONS.md`](REDESIGN_DECISIONS.md) | What changed in the v2 redesign and why |
| [`PRODUCT_OPTIONS.md`](PRODUCT_OPTIONS.md) | Where the product could go, and in what order |
| [`ui-design-patterns.md`](ui-design-patterns.md) | UI standards every change is held to |
| `challenge 2/` | The Claude Design handoff bundle this redesign implements |
| [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md) | Pre-React monolith |
| [`.env.example`](../.env.example) | Env template (includes legacy vars) |

---

*Last updated: v2 UI redesign — Home as the landing screen, step-wizard log with
spendable free passes, editable History, single-page Settings, and a fully
tokenised theme. See [`REDESIGN_DECISIONS.md`](REDESIGN_DECISIONS.md).*
