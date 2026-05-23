# Summer Challenge — implementation reference

This document describes **what the app does**, **how the React app is structured**, **why key decisions were made**, and **where to change things** for future work. It is meant to avoid re-scanning the whole repo for routine updates.

**Agent / maintainer agreement:** Cursor is configured (`.cursor/rules/app-reference.mdc`) to **read this doc when making changes** to the app. If a change **alters behavior** (routing, data/sync, context, env, scoring, theme contract, build/deploy), **update this file in the same PR/change** so it stays accurate.

---

## 0. Migration status (Sheets → Firebase)

The app is mid-migration from Google Sheets / Apps Script to **Firestore + Google Auth**. The following is complete:

| Done | Item |
|------|------|
| ✅ | Firebase SDK installed; `src/lib/firebase.ts` initialises app, `auth`, `db`, `provider` |
| ✅ | `src/lib/firestoreApi.ts` — all Firestore read/write helpers (replaces `sheets.ts` once migration is done) |
| ✅ | `src/types/index.ts` — updated with `Challenge`, `AppUser`, `ScoringConfig`, Firebase-typed entries |
| ✅ | `src/context/AuthContext.tsx` — Google Sign-In, `onAuthStateChanged`, `useAuth` hook |
| ✅ | `src/context/SelectedPersonContext.tsx` — now auto-populated from `useAuth` (no more picker/localStorage) |
| ✅ | `src/context/ChallengeContext.tsx` — rewired to Firestore `onSnapshot` subscriptions; still exposes same `ChallengeContextValue` interface so existing pages compile |
| ✅ | `src/pages/SignInPage.tsx` — auth gate, Google sign-in button |
| ✅ | `src/pages/MyChallengesPage.tsx` — list challenges the user participates in |
| ✅ | `src/pages/CreateChallengePage.tsx` — form to create a Firestore challenge doc |
| ✅ | `src/pages/JoinChallengePage.tsx` — `/join/:challengeId` adds user to participants |
| ✅ | `src/pages/ChallengeInfoPage.tsx` — challenge metadata / share (`/challenge/:id/info`) |
| ✅ | `src/App.tsx` — auth gate + challenge-scoped route tree |
| ✅ | `src/components/layout/NavBar.tsx` — challenge-scoped tab links, sign-out |
| ✅ | `src/components/layout/Layout.tsx` — removed Sheets refresh side-effect (Firestore auto-updates) |
| 🔲 | `src/pages/LeaderboardPage.tsx` — still uses `getTotals` / `PEOPLE` from config; needs update to use challenge `participants` |
| 🔲 | `src/pages/LogDayPage.tsx` — still uses `useSelectedPerson`; works via the new auth-backed adapter |
| 🔲 | `src/lib/scoring.ts` — still uses `PEOPLE` / `personId`; untouched per migration agreement |
| 🔲 | `src/lib/history.ts` — still uses `PEOPLE` / `personId`; untouched |
| 🔲 | `src/lib/sheets.ts` — kept alive (type-fixed) until migration fully verified; delete when done |

**Key compatibility shim:** `personId` is added as an alias for `userId` on `WorkoutEntry` and `ResetLogEntry` so existing scoring and history code continues to work. In the Firestore world, `person.id === user.uid`.

---

## Product features (current shipping app)

The app is a **multi-player workout challenge tracker** backed by **Firestore** and **Google Sign-In**. Users create or join **challenges**; inside a challenge they log workouts and a personal goal on **Log Day**. **Leaderboard**, **History**, and **Info** are read-only (or admin) views over that challenge’s data.

**Scoring and history** still use legacy helpers in `scoring.ts` / `history.ts` keyed by `personId` (= Firebase `user.uid`). `VITE_PEOPLE` in config is only used by those helpers until leaderboard/history are fully migrated to `challenge.participants`.

---

### Identity & navigation

#### Google Sign-In — [`SignInPage.tsx`](../src/pages/SignInPage.tsx) + [`AuthContext.tsx`](../src/context/AuthContext.tsx)

- **Gate:** If `useAuth().loading` → full-screen `LoadingOverlay` (“Loading…”). If `!user` → **every** route renders `SignInPage` (no `Layout`).
- **Sign-in:** “Continue with Google” → `signInWithPopup(auth, provider)` from [`firebase.ts`](../src/lib/firebase.ts).
- **`AppUser`:** `uid`, `displayName` (fallback `"Unknown"`), `email`, `photoURL`.
- **Sign-out:** NavBar “Sign out” → `signOut()` + `navigate('/challenges', { replace: true })`.

#### Challenge hub — [`MyChallengesPage.tsx`](../src/pages/MyChallengesPage.tsx)

- **Route:** `/challenges` (also `/` and `*` redirect here when authenticated).
- **Data:** One-time `getChallengesForUser(user.uid)` on mount (not a live subscription).
- **Cards:** Tap → `/challenge/:id/log`. Header: “Create challenge” → `/challenge/new`, sign out.
- **Empty state:** Prompt to create or join via share link.

#### Create challenge — [`CreateChallengePage.tsx`](../src/pages/CreateChallengePage.tsx)

- **Route:** `/new` (see routing table).
- **3-step wizard:** (1) name & dates + timezone, (2) rules, (3) owner password & members.
- **Rule presets:** Classic (gym/steps/junk/weight), Minimal (single binary), or Custom (empty).
- **Rule list:** Each row shows kind subtitle + scoring formula via [`ruleDocs.ts`](../src/lib/rules/ruleDocs.ts).
- **Rule editor:** [`RuleEditor.tsx`](../src/components/admin/RuleEditor.tsx) — kind descriptions, per-kind hints, **Load example** button (one sample rule per kind from `exampleRuleForKind`).
- **Range scoring:** In-band points scale linearly from `pointsAtMin` (at band low) to `pointsAtMax` (at band high); `pointsOutside` when out of band. Legacy stored rules with `pointsInside` still evaluate as flat in-band score.
- **Submit:** `createChallenge({ name, password, config })` → redirect to `/c/:slug`.

#### Join challenge — [`JoinChallengePage.tsx`](../src/pages/JoinChallengePage.tsx)

- **Route:** `/join/:challengeId` (share link format).
- **Loads** challenge doc for name + participant count.
- **Already joined:** “Open challenge” → `/challenge/:id/log`.
- **Else:** `joinChallenge(challengeId, user)` → same redirect.

#### Challenge shell — [`App.tsx`](../src/App.tsx) `ChallengeSetup`

- **Route:** `/challenge/:challengeId/*`.
- **On mount:** `setActiveChallengeId(challengeId)`; cleanup sets `null` on unmount.
- **Loading:** overlay “Loading challenge…” until four Firestore subscriptions have fired once.
- **Errors:** “Challenge not found.” if doc missing.
- **Participant gate:** If user not in `participantUids` / `participants`, `Navigate` to `/join/:challengeId`.
- **Nested routes** (inside `Layout`): `log`, `board`, `history`, `info`; index → `log`.

#### Identity shim — `useSelectedPerson()` — [`SelectedPersonContext.tsx`](../src/context/SelectedPersonContext.tsx)

- **`person`:** `{ id: user.uid, name: user.displayName }` when signed in; else `null`.
- **`setSelectedPerson` / `clearSelectedPerson`:** no-ops (identity is always the signed-in user).
- **Existing pages** (`LogDayPage`, `HistoryPage`, etc.) keep calling `useSelectedPerson()` without refactors.

#### Main navigation — [`NavBar.tsx`](../src/components/layout/NavBar.tsx)

- **Tabs** (only when `activeChallengeId` is set): `/challenge/:id/log`, `board`, `history`, `info`.
- **Actions:** “My challenges” → `/challenges`; “Sign out”.
- **No** “Switch user” (replaced by auth).
- **Sticky header:** logo, `todayDisplay()` (hidden ≤740px), max-width main via `Layout`.

#### Challenge info — [`ChallengeInfoPage.tsx`](../src/pages/ChallengeInfoPage.tsx)

- **Route:** `/challenge/:id/info`.
- Challenge metadata, participants, share/join link copy — see page for current fields.

#### Legacy (not routed)

- [`PickUserPage.tsx`](../src/pages/PickUserPage.tsx) and [`selectedPersonStorage.ts`](../src/lib/selectedPersonStorage.ts) remain in repo but are **not** mounted in `App.tsx` after the Firebase migration.

---

### Workout logging — [`LogDayPage.tsx`](../src/pages/LogDayPage.tsx)

**Route:** `/challenge/:challengeId/log` (inside `ChallengeSetup` + `Layout`).

#### Page structure (top to bottom)

1. **Header** — title “Workout log”, subtitle `{name} · {long date for logDate}`, **total points banner**.
2. **Date chips** — horizontal wrap of all allowed days.
3. **Scoring key** — seven pill-style legend items.
4. **`PersonLogCard`** — single horizontal grid for the selected person.
5. **`PersonalGoalPanel`** — separated by top border (`GoalBlock`).
6. **“Your past logs”** — `HistoryEntriesTable` with person filter (`HistoryBlock`).

#### Single-player log (not legacy multi-card)

- Unlike the old monolithic HTML app, **only one** `PersonLogCard` renders — for `useSelectedPerson().person`.
- All saves use that person’s `personId`; no roster loop on this page.

#### Day picker (custom chips, not native date input)

- **Why chips:** Consistent styling on mobile/desktop; avoids OS date-picker UI mismatch.
- **Window:** [`workoutLogDateBounds()`](../src/lib/dates.ts) — `maxDate` = local today; `minDate` = today minus **`WORKOUT_LOG_LOOKBACK_DAYS` (31)** → **32 inclusive calendar days**.
- **Chip list:** `workoutLogSelectableDates()` builds oldest→newest; UI maps in that order (scroll/wrap). **Selecting** calls `setLogDate(clampWorkoutLogDate(d))`.
- **Today chip:** primary label “Today”, sub-label shows short date (`formatLogDateChipLabel`). Other days show short weekday + date only.
- **Default `logDate`:** reset to `today()` when:
  - pathname becomes `/log` (re-entering tab),
  - `personId` changes,
  - `clearGeneration` bumps (after admin clear).
- **Changing `logDate`:** clears confirm bar and validation; re-hydrates workout form from cache for that date; clears personal goal value input (see Personal goal).

#### Scoring key (static legend)

Displayed above the card — not computed:

| Label | Meaning shown to user |
|-------|------------------------|
| +1 Went to gym | `went` / `free-gym` scoring |
| 0 Skipped gym | `skip` |
| +1 Ate clean | `clean` / `free-junk` scoring |
| −1 Ate junk | 2nd+ `ate` in challenge week (copy on junk dropdown matches) |
| 0–5 Steps | 10k steps = 5 pts |
| ★ Free | 5 uses max each (gym and junk) |
| 0–30 Personal goal | separate bonus track |

#### Gym field — [`PersonLogCard.tsx`](../src/components/log/PersonLogCard.tsx)

| Value | UI label | Points (before weekly cap) | Notes |
|-------|----------|----------------------------|--------|
| `went` | ✓ Went (+1) | +1 | Counts as a gym scoring day |
| `skip` | ✗ Skipped (0) | 0 | Red select tone |
| `free-gym` | ★ Free (+1) or “none left” | +1 if not capped | Disabled when `gymFreeLeft <= 0`; still +1 toward cap count |

- **Required for save:** empty gym → validation “Please select: Gym …”.
- **Select styling:** green for went/free-gym, red for skip, neutral for empty.
- **After save:** gym `<select>` disabled (`alreadySaved`).

#### Steps field

- **Input:** `type="number"`, min 0, max 99999, placeholder `0`.
- **Hint on label:** “10k = 5pts”.
- **Stored:** `parseFloat` or 0; display empty string when saved value is 0.
- **Formula:** `stepsPtsFromEntry` / part of `calcPts`: `round(min(steps, 10000) / 10000 * 5, 1 decimal)`.
- **Not subject** to weekly gym/clean caps.
- **After save:** input disabled.

#### Junk field

| Value | UI label | Points (before weekly cap) | Notes |
|-------|----------|----------------------------|--------|
| `clean` | ✓ Ate Clean (+1) | +1 | Counts as clean scoring day |
| `ate` | ✗ Ate Junk (2nd+ in challenge week −1) | −1 in `calcPts` | First `ate` per week waived in `calcPtsForLogDay` |
| `free-junk` | ★ Free (+1) or “none left” | +1 if not capped | Disabled when junk free passes exhausted |

- **Required for save:** empty junk → validation includes “Junk Food”.
- **After save:** junk `<select>` disabled.

#### Free passes (lifetime per person, not per week)

- **Limit:** `FREE_LIMIT` = **5** for gym and **5** for junk **across the whole challenge** — counted by scanning **all** `entries` for `free-gym` / `free-junk` (`getFreeCounts`).
- **Sidebar line:** `Free: Gym {left}/5 · Junk {left}/5` where `left = 5 - used`.
- **Disable rule:** only the free **options** in the dropdown; went/clean/ate/skip always choosable until day is saved.
- **Saved free days** remain in data even at 0 left; user cannot pick another free day on a **new** unsaved day.

#### Weekly caps (challenge weeks, points only)

- **Week definition:** `windowOf(date, CHALLENGE_START)` = floor(days since start / 7). Week 1 starts on `CHALLENGE_START` (env default `2026-03-17`), **not** calendar Monday.
- **Gym cap:** `WEEKLY_GYM_SCORE_DAYS` = **4** distinct days in that window with `went` or `free-gym` (including other days than `logDate`).
- **Clean cap:** `WEEKLY_CLEAN_SCORE_DAYS` = **6** distinct days with `clean` or `free-junk`.
- **When saving/logging over cap:** `calcPtsForLogDay` subtracts 1 from pts if that day **would** score +1 for gym or clean but cap already reached on **other** days in the same window (current day excluded from “prior” count, then today’s choice applied).
- **UI:** `Week {windowNum} · Gym: x/4 · Clean: x/6` on card — informational; **does not** disable options.
- **Reference date for sidebar:** the selected `logDate`, so backfilling an old day shows caps for **that** day’s week.

#### Weekly junk waiver

- In `calcPts`, every `ate` is −1.
- In `calcPtsForLogDay`, if `junk === 'ate'` and **no prior `ate`** entries for that person in the same window (excluding today), **add +1** back (net 0 for first junk slip).
- Second and later `ate` in the same week keep −1.

#### Live vs saved points on card

- **Unsaved:** daily pts from `calcPtsForLogDay` on current form values (requires both gym and junk selected for a number; else “—”).
- **Saved:** recalculates from stored entry with same function (so display respects caps/waiver even if sheet stored raw pts).
- **Label:** “workout pts” vs “saved workout pts”.
- **Tone:** green / red / muted via `ptsClass` + `fmtPts` (leading `+` for positive).

#### Personal goal pts on workout card

- If `profiles[personId].entries` has a row for `logDate`, shows purple **Goal: {fmtPts} pts** under free-pass line (`calcPersonalGoalPtsForDay` for that day’s value).

#### Save workflow & immutability

1. User fills gym + junk (steps optional, default 0).
2. **Save Day** → if missing gym/junk, inline red validation (no confirm).
3. Else **confirm bar:** “Once saved you can't update this day's entry. Lock it in?” — **Cancel** / **Lock In**.
4. **Lock In** builds `WorkoutEntry`:
   - `date` = `logDate` (YYYY-MM-DD),
   - `time` = local `toLocaleTimeString` (12h with seconds),
   - `pts` = `calcPtsForLogDay(...)`,
   - `lockedDay: true`,
   - merges into `entries` (replace same person+date if exists),
   - `postToSheets('saveWorkout', entry)` → Firestore `saveWorkoutEntry` via context adapter.
5. **UI after save:** green-tinted card border/background, **Saved ✓** disabled button, fields locked.

**There is no edit or delete** for a locked workout day in the UI.

#### Total points banner

- **Copy:** “Total points (workouts + personal goal)”.
- **Value:** `getTotals(entries, profiles)` for selected `personId` — sum of **all** workout row `pts` plus **one** `calcPersonalGoalPts` (latest goal progress, not sum of goal log rows).
- **Color:** pos/neg/zero from `ptsClass` on total.

#### Your past logs (on Log Day)

- **Data:** `buildHistoryRows(entries, profiles, [], { personId })` — **no** `resetLog` / goal-set rows.
- **Columns:** Date (weekday + date), Time, Type pill, Details, Pts — **no** Player column.
- **Pagination:** `LOG_HISTORY_PAGE_SIZE` = **20**; page 1 = newest rows; **Newer** / **Older**.
- **Footer:** “Total (workouts + current goal)” = sum of **all** workout row pts in full list + `footerProfilePts` (`calcPersonalGoalPts` for profile).
- **Strike-through:** `strikeNonLatestGoalPts` — goal rows except chronologically latest goal entry show struck pts (opacity 0.5); clarifies that only latest value drives current goal score.

---

### Personal goal — [`PersonalGoalPanel.tsx`](../src/components/profile/PersonalGoalPanel.tsx)

Rendered below workout card; **same `logDate`** as workout chips so gym and goal metrics align to one calendar day.

#### Phase 1 — Set goal (unlocked)

- **Fields:** Starting value, Goal value (number inputs), Direction (**Down** / **Up** toggle).
- **Copy:** section title “Personal goal”, subtitle explains up to 30 bonus pts; hint “One lock per goal”.
- **Set goal button:** validates via `window.alert` if goal or start is NaN.
- **On success:**
  - Updates local `profiles[personId]` with `lockedGoal: true`, goal/start/direction.
  - `postToSheets('saveProfile', { personId, goal, startVal, direction, lockedGoal, goalResets })`.
  - Appends `resetLog` entry `type: 'goal_set'` with `setNumber: goalResets + 1`, `postToSheets('appendResetLog', ...)`.
  - **Goal lock uses `today()` for reset log date**, not `logDate` — audit timestamp is “when locked”, not backfill day.
- **No password** on set goal in current UI.

#### Phase 2 — Locked goal, daily values

- **Read-only:** start, goal, direction label (“Going down” / “Going up”), `goalResets` count if > 0.
- **Progress bar:** width = `%` of 30 pts from current day’s value or overall `calcPersonalGoalPts`; gold fill; “complete” styling when progress ≥ 30.
- **Previous day’s value column:** latest entry with `date < logDate`, else start baseline — labeled “Previous day · locked” or “Start value · baseline”.
- **This day’s value:**
  - If **already saved** for `logDate`: read-only value + “Logged today · locked” or “Logged this day · locked”.
  - Else: editable number input + **Save value**.
- **Pts column:** `calcProfilePts` for day entry if saved; else preview from latest profile state; label “pts earned” / “goal pts” / “preview”.
- **Save value flow:** validate non-empty numeric → confirm bar (same copy as workout) → **Lock In** → `saveGoalDay` POST, merge/replace entry for that `date`, `pts` recalculated, `lockedDay: true`, clear value input.

**Immutability:** locked days cannot be edited in UI; pick another chip to log a different day.

#### Scoring rules (personal goal)

- **Max:** `PROFILE_MAX_PTS` = 30.
- **Progress:** `direction === 'down'` → `(start - current) / (start - goal)`; `'up'` → `(current - start) / (goal - start)`; clamped 0–1, × 30, one decimal.
- **Edge:** `start === goal` → 30 pts only if `current === goal`, else 0.
- **No missed-day penalty** in `calcPersonalGoalPtsForDay` / `calcPersonalGoalPts` ( `_asOfDate` unused).
- **Leaderboard / totals:** `calcPersonalGoalPts` picks **latest** `GoalDayEntry` by date then time; if none, uses `startVal`.

#### What is NOT implemented

- **Goal reset UI** — `GOAL_RESET_OPEN` / `GOAL_RESET_CLOSE` in config are never read by components. `goal_reset` rows still **display** on History if present in sheet.
- **Unlock / change goal** after lock — product choice: goal stays locked.

---

### Leaderboard — [`LeaderboardPage.tsx`](../src/pages/LeaderboardPage.tsx)

Read-only; no writes.

#### Empty state

- If `entries.length === 0` and `profiles` has no keys: podium shows “No data yet — log your first day!” and rankings table hidden.

#### Podium (top 3)

- **Order:** `getTotals` descending `pts`.
- **Cards:** 1st / 2nd / 3rd styling (gold, silver-ish, bronze-ish); initials avatar; name; large score; “{n} day(s) logged” (`days` = count of workout **rows**, not unique calendar days).
- **Mobile:** stacks to single column ≤740px.

#### Rankings table (everyone)

| Column | Source | Notes |
|--------|--------|--------|
| # | index + 1 | |
| Player | name + initials | |
| Days | `RankedPlayer.days` | workout entry count |
| Avg/Day | `(pts - profilePts) / days` | **Workout-only** average, 1 decimal, signed fmt |
| Goal Pts | `profilePts` | purple `+{n}` |
| Free Used | `getFreeCounts` | `G:x/5 · J:y/5` |
| Total Pts | `pts` | workouts + goal |

- **Hidden ≤740px:** Avg/Day, Goal Pts, Free Used (Player + Days + Total remain).
- **Live updates:** Firestore `onSnapshot` on workout/profiles/goal_log keeps cache current (no manual tab refresh).
- **Known gap:** `getTotals` iterates `PEOPLE` from env config, not `challenge.participants` — leaderboard may show wrong names/zeros until fixed (see §0).

---

### History — [`HistoryPage.tsx`](../src/pages/HistoryPage.tsx)

#### Scope

- **All players**, all row kinds: workouts, goal daily logs, `goal_set`, `goal_reset` from `resetLog`.
- **Player column** shown (`showPlayerColumn` default true).
- **Pagination:** 25 rows per page; same Newer/Older semantics.

#### Row presentation — [`HistoryEntriesTable.tsx`](../src/components/history/HistoryEntriesTable.tsx)

| Type | Pill | Details column | Pts column |
|------|------|----------------|------------|
| Workout | gold “Workout” | Went/Skipped/★ Free · steps (+stepPts) · Clean/Ate Junk/★ Free | signed workout pts, colored |
| Goal | purple “Goal” | Value, goal target, direction label | `+{pts}` purple |
| Goal set | purple “Goal set” | Goal, start, direction, set # | — |
| Goal reset | red “Goal reset” | Previous goal/start/direction, reset # | — |

- **Dates:** `formatHistoryDateWithWeekday` (e.g. `Sat, Mar 21, 2026`).
- **Times:** `formatHistoryTime` (12h with seconds when ISO; else raw string).
- **No footer total** on History (footer only when `footerProfilePts` passed — Log page only).
- **No strike-through** on History goal rows.

#### Sorting — [`history.ts`](../src/lib/history.ts)

- Primary: `sortDate` descending (YYYY-MM-DD).
- Secondary: `sortTime` via `parseTime` (12h AM/PM); unparseable → -1.

#### Clear all data (admin)

- **Visibility:** `canSeeClearAllData(person)` — signed-in user’s `id` or `name` equals `"kunle"` case-insensitive (**legacy Sheets check**; with Firebase UIDs this only appears if `displayName` is Kunle).
- **Flow:** toggle panel → password → `checkPassword('__admin', pw)` compares against **`challenge.adminPassword`** (not the old `passwords` map) → on success: `clearAllLocal()` + `postToSheets('clearAll', {})` → Firestore `clearChallengeData`.
- **Effect:** wipes local cache immediately; `clearGeneration++` resets Log Day forms; subscriptions repopulate from Firestore after server delete.

---

### Data & sync (Firestore)

#### Challenge load — [`ChallengeContext.tsx`](../src/context/ChallengeContext.tsx)

- **`setActiveChallengeId(id)`** from `ChallengeSetup` starts the load pipeline.
- **`getChallenge(id)`** first — if missing → `initError: "Challenge not found."`
- **Non-participants:** subscriptions **not** started (avoids permission errors); `App.tsx` redirects to join.
- **Four `onSnapshot` listeners:** `workout_log`, `profiles`, `goal_log`, `reset_log` under `challenges/{id}/`.
- **`loading: false`** after all four have delivered their first snapshot.
- **Cache shape:** legacy `ChallengeCache` — entries/profiles/resetLog; `passwords` always `{}`.
- **Adapters:** Firestore `userId` copied to `personId` on entries and reset rows; goal_log merged into `profiles[uid].entries`.

#### Writes (optimistic local + Firestore)

1. Pages call `updateCache` for immediate UI (same as Sheets era).
2. `postToSheets(action, data)` is a **compat adapter** dispatching to `firestoreApi` (name kept so pages unchanged):

| action | Firestore call |
|--------|----------------|
| `saveWorkout` | `saveWorkoutEntry(challengeId, entry)` |
| `saveProfile` | `saveProfile(challengeId, profile)` |
| `saveGoalDay` | `saveGoalDayEntry(challengeId, entry)` |
| `appendResetLog` | `appendResetLogEntry(challengeId, entry)` |
| `clearAll` | `clearChallengeData(challengeId)` |

Maps `personId` → `userId` on write. Subscriptions then reconcile server state.

#### No manual refresh

- **`refreshFromSheets`:** no-op async (interface preserved).
- **`syncing`:** always `false`; `SheetSpinner` never shows.
- **`Layout`:** removed pathname effect that refetched on `/board` / `/history`.

#### `clearGeneration` coordination

- Incremented in `clearAllLocal()` after admin clear.
- **LogDayPage:** reset `logDate` to today, re-hydrate form.
- **PersonalGoalPanel:** clear inputs and confirm state.

---

### Not in the shipping build

#### “For today” encouragement card

- Removed from `LogDayPage`; full spec and restore paths: [`ARCHIVED_ENCOURAGEMENT_FEATURE.md`](ARCHIVED_ENCOURAGEMENT_FEATURE.md), code under `archive/encouragement-feature/`.

#### In-app goal reset

- `GOAL_RESET_OPEN` / `GOAL_RESET_CLOSE` exported in [`config.ts`](../src/lib/config.ts) but **zero imports** in `src/`. History can still list `goal_reset` rows from the sheet.

#### `CHALLENGE_END`

- Exported (default `2026-04-17`); comment in config mentions missed-day penalties, but **no** `src/` file reads it today.

---

## 1. Purpose and stack

| Piece | Choice | Why |
|-------|--------|-----|
| Build | **Vite 5** | Fast dev server, simple `dist/` output for static hosting. |
| UI | **React 18 + TypeScript (strict)** | Typed domain model and predictable UI updates vs the legacy single HTML file. |
| Styling | **[styled-components](https://styled-components.com/)** | Component-local CSS, theme via `ThemeProvider`, matches the prior custom dark theme without a separate CSS bundle. |
| Routing | **React Router v6** | Auth gate; challenge-scoped `/challenge/:id/*`; Netlify SPA redirects. |
| Data | **Firestore + Google Auth** | Real-time `onSnapshot`; legacy `postToSheets` name kept as write adapter. |

**Legacy app:** Full pre-React `index.html` is archived in [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md) at repo root.

---

## 2. Repository layout (quick map)

```
summer-challenge/
├── archive/                # Frozen feature code (not in build); see docs below
├── index.html              # Vite HTML shell (fonts + #root)
├── vite.config.ts
├── package.json
├── scripts/
│   └── check-node.cjs
├── netlify.toml
├── .env.example
├── .nvmrc
├── docs/
│   ├── APP_REFERENCE.md    # ← this file
│   └── ARCHIVED_ENCOURAGEMENT_FEATURE.md
└── src/
    ├── main.tsx            # BrowserRouter → Theme → GlobalStyle → AuthProvider → SelectedPersonProvider → ChallengeProvider → App
    ├── App.tsx             # Auth gate + challenge-scoped route tree
    ├── vite-env.d.ts       # import.meta.env (VITE_FIREBASE_* + legacy VITE_*)
    ├── types/index.ts      # Firebase types + legacy compat (personId, SheetsPayload)
    ├── lib/
    │   ├── firebase.ts     # Firebase app init; exports auth, db, provider
    │   ├── firestoreApi.ts # Firestore CRUD + onSnapshot helpers
    │   ├── sheets.ts       # LEGACY — kept until migration verified
    │   ├── config.ts       # PEOPLE, CHALLENGE_START, SCRIPT_URL, etc.
    │   ├── scoring.ts      # personId-based scoring (uses PEOPLE until migrated)
    │   ├── history.ts      # buildHistoryRows (uses PEOPLE until migrated)
    │   ├── dates.ts        # Date utilities
    │   └── selectedPersonStorage.ts  # LEGACY — not used in routes
    ├── theme/
    ├── context/
    │   ├── AuthContext.tsx
    │   ├── SelectedPersonContext.tsx  # Adapter over useAuth
    │   └── ChallengeContext.tsx       # Firestore subscriptions + activeChallengeId
    ├── components/
    │   ├── layout/         # Layout, NavBar, LoadingOverlay, SheetSpinner
    │   ├── log/            # PersonLogCard
    │   ├── history/        # HistoryEntriesTable
    │   └── profile/        # PersonalGoalPanel, personalGoalHorizontalStyles
    └── pages/
        ├── SignInPage.tsx, MyChallengesPage.tsx, CreateChallengePage.tsx, JoinChallengePage.tsx
        ├── ChallengeInfoPage.tsx
        ├── LogDayPage.tsx, LeaderboardPage.tsx, HistoryPage.tsx, profilesStyles.ts
        └── PickUserPage.tsx   # LEGACY — not mounted in App.tsx
```

There is **no `hooks/` folder**: use **`useAuth`**, **`useChallenge`**, and **`useSelectedPerson`** from context.
---

## 3. Bootstrap and routing

| File | Role |
|------|------|
| [`src/main.tsx`](../src/main.tsx) | `StrictMode` → `BrowserRouter` → `AppThemeProvider` → `GlobalStyle` → **`AuthProvider`** → `SelectedPersonProvider` → `ChallengeProvider` → `App`. |
| [`src/App.tsx`](../src/App.tsx) | Auth gate: `authLoading` → overlay; `!user` → `SignInPage` on all paths. Authenticated route tree below. |

**Route tree (authenticated users)**

**v2 routes (current):**

| Path | Page | Notes |
|------|------|-------|
| `/` | `RootRedirect` | If recent challenge in localStorage → `/c/:slug`, else → `/new`. |
| `/new` | `CreateChallengePage` | 3-step wizard. No auth gate. |
| `/c/:slug` | `ChallengeHomePage` | Hero stats, podium, log CTA. Wrapped in `ChallengeProvider`. |
| `/c/:slug/pick` | `PickMemberPage` | Full-screen, no chrome. Sets `selectedMemberId` in localStorage. |
| `/c/:slug/log` | `LogDayPage` | Date strip + 6 rule card kinds. Guarded by `RequireMember`. |
| `/c/:slug/board` | `LeaderboardPage` | Podium + sortable standings table. |
| `/c/:slug/history` | `HistoryPage` | Grouped entry event log. |
| `/c/:slug/m/:memberId` | `MemberProfilePage` | Per-member breakdown + recent entries. |
| `/c/:slug/rules` | `RulesReferencePage` | Read-only rule reference for participants. |
| `/c/:slug/admin` | `AdminPage` | Gate (password) → Home → Members / Config / Audit sub-views. Wrapped in `AdminModeProvider`. |
| `*` | `Navigate` | → `/`. |

**Provider chain for `/c/:slug/*`:** `ChallengeProvider` (slug resolution + 5 Firestore listeners) → `SelectedMemberProvider` → `Outlet`. Chrome routes go through a pathless `ChromeLayout` route (renders `Layout` with `TopBar` + `BottomNav`). `/c/:slug/pick` is outside `ChromeLayout` (no bottom nav, full-screen). Admin sub-route adds `AdminModeProvider` via `AdminLayout`.

**Guards:** `RequireMember` checks `useSelectedMember()`; if null/orphaned → `/c/:slug/pick`. Admin password gate lives inside `AdminPage` itself (not a route guard) to show the lock UI.

**Per-route error boundaries:** Each `<Route element>` is wrapped in `<RouteEB>` which renders `<ErrorBoundary>` to contain crashes to the affected route.

---

## 4. Auth — `AuthContext` / `useAuth`

**File:** [`src/context/AuthContext.tsx`](../src/context/AuthContext.tsx)

- Wraps `onAuthStateChanged(auth, …)` → `user: AppUser | null`, `loading: boolean`.
- **`signIn()`** — `signInWithPopup(auth, provider)`.
- **`signOut()`** — `firebaseSignOut(auth)`.
- `AuthProvider` must wrap `SelectedPersonProvider` and `ChallengeProvider`.

**`SelectedPersonContext`** — thin adapter over `useAuth`: `person = { id: user.uid, name: user.displayName }`; `setSelectedPerson` / `clearSelectedPerson` are no-ops.

---

## 5. Theme (`src/theme/`)

| File | Purpose |
|------|---------|
| [`theme.ts`](../src/theme/theme.ts) | **`AppTheme`**: `color.*` (incl. podium2/3), `font.display` / `font.body` (Unbounded, DM Sans), `radii.*`. |
| [`styled.d.ts`](../src/theme/styled.d.ts) | `DefaultTheme` extends `AppTheme`. |
| [`AppThemeProvider.tsx`](../src/theme/AppThemeProvider.tsx) | `ThemeProvider theme={appTheme}`. |
| [`GlobalStyle.tsx`](../src/theme/GlobalStyle.tsx) | Reset + `body` from theme. |

---

## 6. Challenge context — `ChallengeProvider` / `useChallenge`

**File:** [`src/context/ChallengeContext.tsx`](../src/context/ChallengeContext.tsx)

**`ChallengeContextValue`:**

| Field | Detail |
|-------|--------|
| `challenge` | Firestore challenge doc or `null` while loading / not found. |
| `loading` | `true` until slug resolved + first challenge-doc snapshot received. |
| `error` | Firestore error string or `null`. |
| `notFound` | `true` if slug doesn't resolve. |
| `members` | All members (active + removed). Real-time. |
| `entries` | All entries for this challenge. Real-time. |
| `auditLog` | All audit log entries, newest-first (`orderBy timestamp desc`). Real-time. Non-fatal permission errors are `console.warn`ed only. |
| `isEnded` | `challenge.status === 'ended'`. |
| `activeMembers` | `members.filter(m => m.active)` sorted by name. |

**Firestore listeners (5):** challenge doc · members subcollection · entries subcollection · auditLog subcollection · slug index (one-time `getDoc`).

**Hook guard:** `useChallenge()` throws outside `<ChallengeProvider>`.
---

## 7. Firestore data model

All challenge data under `challenges/{challengeId}/`:

| Subcollection | Doc ID | Key fields |
|---------------|--------|------------|
| `workout_log` | `{date}_{userId}` | `userId`, `date`, `gym`, `steps`, `junk`, `pts`, `lockedDay` |
| `goal_log` | `{date}_{userId}` | `userId`, `date`, `value`, `pts`, `lockedDay` |
| `profiles` | `{userId}` | `userId`, `goal`, `startVal`, `direction`, `lockedGoal`, `goalResets` |
| `reset_log` | auto-id | `userId`, `type` (`goal_set` \| `goal_reset`), `date`, … |

Root doc: `name`, `description`, `createdBy`, `adminPassword`, `startDate`, `endDate`, `goalResetOpen`, `goalResetClose`, `scoring` (`ScoringConfig`), `participants`, `participantUids`.

**Share link:** `/join/:challengeId`.

---

## 8. Layout and shared UI

**File:** [`src/components/layout/Layout.tsx`](../src/components/layout/Layout.tsx)

- At **< 768 px**: `BottomNav` (fixed, 64 px) + `<main>` with 72 px bottom padding.
- At **≥ 768 px**: `TopBar` (fixed left sidebar, 200 px wide) + `<main>` left-shifted; `BottomNav` hidden.
- `main` renders `<Outlet />` for child routes.

### Layout chrome

| Component | File | Role |
|-----------|------|------|
| `TopBar` | [`TopBar.tsx`](../src/components/layout/TopBar.tsx) | Desktop sidebar nav (≥ 768 px): challenge name + Home / Log day / Leaderboard / History links |
| `BottomNav` | [`BottomNav.tsx`](../src/components/layout/BottomNav.tsx) | Mobile tab bar (< 768 px): Home / Log / Board / History |
| `ErrorBoundary` | [`ErrorBoundary.tsx`](../src/components/layout/ErrorBoundary.tsx) | Catches render errors; shows "Something went wrong" + Reload |
| `LoadingState` | [`LoadingState.tsx`](../src/components/layout/LoadingState.tsx) | Full-screen loading message |

### `PersonLogCard` — grid layout

**Desktop grid:** `130px | 1fr | 130px | 1fr | 72px | 120px` — name/meta, gym, steps, junk, pts, save.

**≤740px:** 2-column stack; pts and save span full width.

**Props (controlled):** parent owns `formRow`, validation, confirm; card calls `onChange`, `onClickSave`, `onConfirmSave`, `onCancelConfirm`.

Weekly gym/clean caps (4 / 6 per challenge week) apply in **`calcPtsForLogDay`** only — options stay selectable; free gym/junk disabled when **`FREE_LIMIT`** exhausted.

### `HistoryEntriesTable` — props contract

| Prop | Effect |
|------|--------|
| `rows` | Pre-sorted display rows from `buildHistoryRows` |
| `showPlayerColumn` | default `true`; Log page passes `false` |
| `emptyMessage` | Custom empty copy |
| `footerProfilePts` | Enables tfoot total row |
| `strikeNonLatestGoalPts` | Uses `latestGoalRowIndex(rows)` |
| `pageSize` | Enables pager; **Newer** / **Older** (page 1 = newest) |

### `PersonalGoalPanel` — layout files

- [`personalGoalHorizontalStyles.ts`](../src/components/profile/personalGoalHorizontalStyles.ts) — card grid mirroring log card.
- [`profilesStyles.ts`](../src/pages/profilesStyles.ts) — confirm bar and section header.

---

## 9. Pages — implementation notes

### `PickUserPage` — legacy, not routed

| Concern | Detail |
|---------|--------|
| Status | File remains; **not** in `App.tsx` after Firebase migration |
| Was | localStorage roster picker → `/log` |

### `LogDayPage` — [`src/pages/LogDayPage.tsx`](../src/pages/LogDayPage.tsx)

| State | Purpose |
|-------|---------|
| `logDate` | YYYY-MM-DD for workout + goal + hydration |
| `formRow` | `{ gym, steps, junk }` — `LogFormRow` type from `PersonLogCard` |
| `confirmOpen` | Workout confirm bar visibility |
| `validation` | Inline gym/junk message or null |

| Effect deps | Behavior |
|-------------|----------|
| `pathname === '/log'` | Legacy; challenge routes use `/challenge/:id/log` — effect may not fire on tab re-entry |
| `clearGeneration` | Snap `logDate` to today |
| `personId` | Snap `logDate` to today |
| `logDate`, `entries`, `personId`, `clearGeneration` | Load saved row into `formRow` or empty |
| `logDate`, `personId`, `clearGeneration`, `pathname` | Clear confirm + validation |

| Memo | Purpose |
|------|---------|
| `myHistoryRows` | `buildHistoryRows(..., { personId })` |
| `profilePtsTotal` | `calcPersonalGoalPts` for footer |
| `challengeTotalPts` | From `getTotals` for banner |

Early return `null` if `!person` (should not happen when authenticated).

### `SignInPage` — [`src/pages/SignInPage.tsx`](../src/pages/SignInPage.tsx)

- Single “Continue with Google” button → `useAuth().signIn()`.
- Shown for all routes when `!user`.

### `MyChallengesPage` — [`src/pages/MyChallengesPage.tsx`](../src/pages/MyChallengesPage.tsx)

- `getChallengesForUser(user.uid)` on mount (one-time fetch).
- Cards → `/challenge/:id/log`; create → `/challenge/new`.

### `CreateChallengePage` / `JoinChallengePage`

- See §Product features → Identity & navigation (Create challenge).
- Shared rule editor: [`RuleEditor.tsx`](../src/components/admin/RuleEditor.tsx); copy/examples in [`ruleDocs.ts`](../src/lib/rules/ruleDocs.ts).

### `LeaderboardPage` — [`src/pages/LeaderboardPage.tsx`](../src/pages/LeaderboardPage.tsx)

- Only `useChallenge()` — `entries`, `profiles`.
- `ranked = getTotals(...)`; `freeCounts = getFreeCounts(entries)`.
- Podium uses `ranked.slice(0, 3)` even when fewer than 3 players exist (shows 1–2 cards).
- Styled-components colocated in page file (not shared).

- **Known gap:** `getTotals` uses `PEOPLE` from config, not `challenge.participants` — may show zeros/wrong names until migrated.

### `HistoryPage` — [`src/pages/HistoryPage.tsx`](../src/pages/HistoryPage.tsx)

| State | Purpose |
|-------|---------|
| `showClear` | Admin panel open |
| `clearPw` | Password input |
| `clearErr` | Validation message |

- `rows` from `buildHistoryRows(entries, profiles, resetLog)` — all participants.
- **Clear all:** Kunle name/id check (legacy); password vs `challenge.adminPassword`.
- **Names:** `PEOPLE.find` often fails for Firebase UIDs — may show raw uid until `history.ts` uses `challenge.participants`.

### `profilesStyles.ts` — [`src/pages/profilesStyles.ts`](../src/pages/profilesStyles.ts)

- Exports `ProfileInputs` type and styled confirm/section pieces for `PersonalGoalPanel`.

---

## 10. Scoring reference (`src/lib/scoring.ts`)

Challenge weeks are **7-day windows** anchored at `CHALLENGE_START`, via `windowOf(date, start) = floor(dayIndex(date, start) / 7)`. They are **not** ISO calendar weeks.

### `calcPts(gym, steps, junk)` — base day formula

```
pts = 0
if went or free-gym → +1
if clean or free-junk → +1
if ate → −1
stepsPts = round(min(steps, 10000) / 10000 * 5, 1 decimal)
return round((pts + stepsPts) * 10) / 10
```

Used as the starting point for `calcPtsForLogDay` before cap/waiver adjustments.

### `calcPtsForLogDay(..., entries, personId, logDate)`

1. Determine `win = windowOf(logDate, CHALLENGE_START)`.
2. Filter `entries` to same `personId`, same window, **excluding** `logDate`’s calendar day.
3. Count `priorGym`, `priorClean`, `priorAte` on those other days.
4. Start from `calcPts` for today’s choices.
5. If today would score gym +1 but `priorGym >= 4` → subtract 1.
6. If today would score clean +1 but `priorClean >= 6` → subtract 1.
7. If today is `ate` and `priorAte === 0` → add 1 (waive first junk penalty).
8. Round to one decimal.

**Important:** Leaderboard sums **stored** `entry.pts`. `getTotals` still iterates **`PEOPLE`** from config — see §0 migration gaps.

### Personal goal functions

| Function | Use |
|----------|-----|
| `calcProfilePts(current, goal, start, direction)` | Core 0–30 progress |
| `calcPersonalGoalPtsForDay(profile, value, date)` | History row display; requires `lockedGoal` + goal + start |
| `calcPersonalGoalPts(profile)` | Leaderboard / totals; uses latest entry value or `startVal` |

### Aggregations

| Function | Behavior |
|----------|----------|
| `getWindowLimits(entries, personId, referenceDate?)` | Gym/clean day counts in reference week; `gymMaxed` / `cleanMaxed`; `windowNum` = `windowOf + 1` (1-based label) |
| `getFreeCounts(entries)` | Per-person lifetime `free-gym` / `free-junk` counts |
| `getTotals(entries, profiles)` | Initialize all `PEOPLE` at 0; add each workout `pts`; add `calcPersonalGoalPts`; sort desc |
| `fmtPts(n)` | Prefix `+` for positive |
| `ptsClass(n)` | `'pos' \| 'neg' \| 'zero'` for theme colors |
| `initials(name)` | First two chars uppercased |
| `stepsPtsFromEntry(steps)` | Steps portion only (history details column) |

---

## 11. Library modules (`src/lib/`)

| Module | File | Responsibility |
|--------|------|----------------|
| Firebase init | [`firebase.ts`](../src/lib/firebase.ts) | App init; exports `auth`, `db`, `provider` |
| Firestore API | [`firestoreApi.ts`](../src/lib/firestoreApi.ts) | `createChallenge`, `joinChallenge`, `getChallengesForUser`, subscriptions, writes, `DEFAULT_SCORING` |
| Config | [`config.ts`](../src/lib/config.ts) | `PEOPLE`, `SCRIPT_URL`, `CHALLENGE_START` / `CHALLENGE_END`, `FREE_LIMIT`, `PROFILE_MAX_PTS` |
| Dates | [`dates.ts`](../src/lib/dates.ts) | See §Product features — day picker, `windowOf`, formatters |
| Scoring | [`scoring.ts`](../src/lib/scoring.ts) | See §10; still uses `PEOPLE` until migrated |
| History rows | [`history.ts`](../src/lib/history.ts) | `buildHistoryRows`, `latestGoalRowIndex` |
| Sheets I/O | [`sheets.ts`](../src/lib/sheets.ts) | **LEGACY** — Apps Script GET/POST; not used at runtime |
| Selected person | [`selectedPersonStorage.ts`](../src/lib/selectedPersonStorage.ts) | **LEGACY** — localStorage picker |

---

## 12. Types (`src/types/index.ts`)

| Type | Notes |
|------|--------|
| `AppUser`, `Challenge`, `ChallengeParticipant`, `ScoringConfig` | Firebase / multi-challenge |
| `WorkoutEntry` | `userId` + **`personId` alias** for scoring/history |
| `ProfileData`, `GoalDayEntry`, `ResetLogEntry` | Goal tracking; reset log unions |
| `RankedPlayer` | Legacy leaderboard shape (`scoring.ts`) |
| `FirebaseRankedPlayer` | Planned Firestore-native leaderboard |
| `SheetsPayload`, `Raw*Row` | Legacy Sheets parsing |

UI history rows use `HistoryDisplayRow` from [`history.ts`](../src/lib/history.ts), not `HistoryRow` in types.

---

## 13. Configuration and environment

| Variable | Used in | Notes |
|----------|---------|--------|
| `VITE_FIREBASE_*` (6 vars) | `firebase.ts` | **Required** for the shipping app |
| `VITE_CHALLENGE_START` | `scoring.ts` / `dates.ts` | Weekly window anchor (until per-challenge `scoring` drives caps) |
| `VITE_PEOPLE` | `config.ts` → `scoring.ts` / `history.ts` | Legacy roster; mismatch with Firebase UIDs |
| `VITE_SCRIPT_URL` | `config.ts` | Legacy; unused when Firestore is active |
| `VITE_CHALLENGE_END`, `VITE_GOAL_RESET_*` | `config.ts` | Legacy env; per-challenge fields in Firestore |

**Typing:** [`src/vite-env.d.ts`](../src/vite-env.d.ts). **Netlify:** [`netlify.toml`](../netlify.toml).

---

## 14. Build and deploy

**Node.js ≥ 18** (use **20** per `.nvmrc`). `scripts/check-node.cjs` runs on `predev` / `prebuild` / `prepreview`.

| Command | Output |
|---------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit` + `vite build` → `dist/` |

SPA: all routes → `index.html`.

---

## 15. Legacy backend — Apps Script (`sheets.ts`)

The pre-Firebase app used Google Sheets via Apps Script. **`sheets.ts` remains** for reference and type compatibility; **runtime writes** go through `postToSheets` → `firestoreApi`.

<details>
<summary>Sheets GET/POST contract (historical)</summary>

**GET** `VITE_SCRIPT_URL` → `workout_log`, `profiles`, `goal_log`, `passwords`, `reset_log`.

**POST** `{ action, data }` with `no-cors`: `saveWorkout`, `saveProfile`, `saveGoalDay`, `appendResetLog`, `clearAll`.

See [`sheets.ts`](../src/lib/sheets.ts) normalizers and [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md).

</details>

---

## 16. Conventions for future changes

1. **New challenge-scoped route** — Add inside `ChallengeSetup` nested routes + `NavBar` tab.
2. **Fix leaderboard** — Totals from `challenge.participants`, not `PEOPLE`.
3. **Fix history names** — Resolve display names from `challenge.participants` in `history.ts`.
4. **New theme token** — `theme/theme.ts` + `styled.d.ts`.
5. **New Firestore field** — `types/index.ts` → `firestoreApi.ts` → context/pages.
6. **Delete `sheets.ts`** — After scoring/history no longer depend on config `PEOPLE`.

---

## 17. Related docs

| Document | Use |
|----------|-----|
| [`README.md`](../README.md) | Quick start, env, Netlify |
| [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md) | Pre-React monolith for behavior diffs |
| [`ARCHIVED_ENCOURAGEMENT_FEATURE.md`](ARCHIVED_ENCOURAGEMENT_FEATURE.md) | Removed log encouragement; `archive/encouragement-feature/` |
| [`.env.example`](../.env.example) | Env template |

---

*Last updated: Firebase migration (Auth, challenges, Firestore subscriptions) merged with expanded product-feature detail. Next: leaderboard/history using `challenge.participants` instead of `PEOPLE`.*
