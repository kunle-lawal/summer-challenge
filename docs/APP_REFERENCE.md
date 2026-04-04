# Summer Challenge — implementation reference

This document describes **how the React app is structured**, **why key decisions were made**, and **where to change things** for future work. It is meant to avoid re-scanning the whole repo for routine updates.

**Agent / maintainer agreement:** Cursor is configured (`.cursor/rules/app-reference.mdc`) to **read this doc when making changes** to the app. If a change **alters behavior** (routing, data/sync, context, env, scoring, theme contract, build/deploy, Sheets actions), **update this file in the same PR/change** so it stays accurate. Purely cosmetic tweaks usually do not require doc updates unless they add/remove major UI surfaces described here.

---

## 1. Purpose and stack

| Piece | Choice | Why |
|-------|--------|-----|
| Build | **Vite 5** | Fast dev server, simple `dist/` output for static hosting. |
| UI | **React 18 + TypeScript (strict)** | Typed domain model and predictable UI updates vs the legacy single HTML file. |
| Styling | **[styled-components](https://styled-components.com/)** | Component-local CSS, theme via `ThemeProvider`, matches the prior custom dark theme without a separate CSS bundle. |
| Routing | **React Router v6** | `/pick` (choose profile), `/log` (your card + personal goal), `/board`, `/history`; Netlify SPA redirects. |
| Data | **In-memory cache + Google Apps Script** | Same model as legacy: GET JSON to hydrate; POST `no-cors` with `{ action, data }` for mutations (Sheets backend unchanged). |

**Legacy app:** Full pre-React `index.html` is archived in [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md) at repo root.

---

## 2. Repository layout (quick map)

```
summer-challenge/
├── archive/                # Optional frozen feature code (not in the build); see docs below
├── index.html              # Vite HTML shell only (fonts + #root)
├── vite.config.ts
├── package.json
├── scripts/
│   └── check-node.cjs      # predev/prebuild: require Node >= 18 (Vite 5)
├── netlify.toml            # build, publish=dist, SPA redirect, NODE_VERSION
├── .env.example            # Documented VITE_* variables
├── .nvmrc                  # Node 20 (align with Netlify)
├── LEGACY_INDEX_REFERENCE.md
├── docs/
│   └── APP_REFERENCE.md    # ← this file
└── src/
    ├── main.tsx            # BrowserRouter → Theme → GlobalStyle → SelectedPersonProvider → ChallengeProvider → App
    ├── App.tsx             # Loading gate + Routes (person gate on `/log`)
    ├── vite-env.d.ts       # import.meta.env typing
    ├── types/index.ts      # Domain + API row types
    ├── lib/                # Pure/config + I/O helpers
    ├── theme/              # Tokens, ThemeProvider, global reset
    ├── context/            # ChallengeProvider + useChallenge
    ├── components/         # layout/, log/, history/, profile/ (+ personalGoalHorizontalStyles)
    └── pages/                # Route-level screens (+ profilesStyles for goal UI)
```

There is **no `hooks/` folder** today: **`useChallenge`** and **`useSelectedPerson`** from context. Add `src/hooks/` if you introduce shared hooks (e.g. `useToday`, `useSheetSync`).

---

## 3. Bootstrap and routing

| File | Role |
|------|------|
| [`src/main.tsx`](../src/main.tsx) | Mounts React. Order: `BrowserRouter` → `AppThemeProvider` → `GlobalStyle` → **`SelectedPersonProvider`** → `ChallengeProvider` → `App`. Router must wrap anything using `useLocation` / `NavLink`. |
| [`src/App.tsx`](../src/App.tsx) | If `loading` or `initError` → full-screen `LoadingOverlay` (while loading, message uses **`getStoredPerson()`** for “Welcome back, {name}…” when a valid id is in **`localStorage`**). Else: `Routes`: `/pick` has no `Layout`; `Layout` wraps `/log` (with **`RequirePerson`**), `/board`, `/history`; `/` and `*` → **`HomeRedirect`** (`/log` if a person is selected in context, else `/pick`). |

**Who am I? — `SelectedPersonProvider` / `useSelectedPerson`**

**File:** [`src/context/SelectedPersonContext.tsx`](../src/context/SelectedPersonContext.tsx)

- **Persists** the chosen roster member in **`localStorage`** via [`src/lib/selectedPersonStorage.ts`](../src/lib/selectedPersonStorage.ts) (key `summer-challenge-selected-person-id`). The stored id is **re-validated** against current **`PEOPLE`** from config on read; unknown ids are **cleared from storage** on provider init and behave as no selection.
- **`setSelectedPerson` / `clearSelectedPerson`** update memory + storage. NavBar **Switch user** clears and routes to `/pick`.

**Routes**

| Path | Page component | File |
|------|----------------|------|
| `/pick` | `PickUserPage` | `src/pages/PickUserPage.tsx` |
| `/log` | `LogDayPage` | `src/pages/LogDayPage.tsx` |
| `/board` | `LeaderboardPage` | `src/pages/LeaderboardPage.tsx` |
| `/history` | `HistoryPage` | `src/pages/HistoryPage.tsx` |

---

## 4. Theme (`src/theme/`)

| File | Purpose |
|------|---------|
| [`theme.ts`](../src/theme/theme.ts) | **`AppTheme`** interface + **`appTheme`** concrete object: `color.*`, `font.display` / `font.body`, `radii.*`. Add new tokens here first. |
| [`styled.d.ts`](../src/theme/styled.d.ts) | Augments **`styled-components` `DefaultTheme`** to extend `AppTheme` so `props.theme` is typed in every styled component. |
| [`AppThemeProvider.tsx`](../src/theme/AppThemeProvider.tsx) | Thin wrapper: `ThemeProvider theme={appTheme}`. |
| [`GlobalStyle.tsx`](../src/theme/GlobalStyle.tsx) | `createGlobalStyle`: box-sizing reset, `body` font/background/color from theme. |

**Reason:** Central tokens keep the UI consistent; components use `${({ theme }) => theme.color.gold}` instead of scattering hex values (except a few podium grays that mirror the legacy design).

---

## 5. Global context — `ChallengeProvider` / `useChallenge`

**File:** [`src/context/ChallengeContext.tsx`](../src/context/ChallengeContext.tsx)

**Responsibilities**

- On mount: if `isScriptConfigured()` → `fetchSheetsJson(SCRIPT_URL)` → `cacheFromPayload` → local state. On failure or missing URL → `initError` message; overlay stays up (same UX idea as legacy).
- Holds the **authoritative in-memory mirror** of backend data:

  | Field | Meaning |
  |-------|---------|
  | `entries` | Workout log rows (normalized). |
  | `profiles` | Per-person goal metadata + `entries` (daily goal values). |
  | `passwords` | Map of string keys → password strings (default `'1234'` if missing). |
  | `resetLog` | Goal set / goal reset audit rows from Sheets. |

- **`refreshFromSheets()`** — Refetch and replace cache. Used when visiting secondary routes (see Layout).
- **`updateCache(fn)`** — Functional update for optimistic/local merges after saves.
- **`clearAllLocal()`** — Clears cache in memory and increments **`clearGeneration`**.
- **`checkPassword(key, input)`** — Compares to `passwords[key]` or default.
- **`postToSheets(action, data)`** — Delegates to `lib/sheets.ts` (no-cors POST).
- **`syncing`** — True while a background refresh runs (drives bottom-right spinner).

**`clearGeneration`**

- Incremented inside **`clearAllLocal()`** after admin “Clear all” on History.
- **`LogDayPage`** and **`PersonalGoalPanel`** `useEffect` depend on it to reset local form state without coupling those components to History directly.

**Why one context:** The legacy app used a single global `cache` object; context preserves that mental model and avoids prop drilling for entries/profiles across tabs.

---

## 6. Layout and shared UI components

**File:** [`src/components/layout/Layout.tsx`](../src/components/layout/Layout.tsx)

- Renders `<NavBar />`, `<main><Outlet /></main>`, `<SheetSpinner />`.
- **`useEffect`:** When `pathname` is `/board` or `/history`, and initial load finished (`!loading && !initError`), calls **`refreshFromSheets()`**. **Does not** refetch on `/log` — preserves in-progress daily entries (same rule as legacy tab switch).

| Component | File | Role |
|-----------|------|------|
| `NavBar` | [`NavBar.tsx`](../src/components/layout/NavBar.tsx) | Sticky header, today’s date, `NavLink` tabs with `end` + `active` class; **Switch user** (when `person` is set) clears selection and goes to `/pick`. |
| `LoadingOverlay` | [`LoadingOverlay.tsx`](../src/components/layout/LoadingOverlay.tsx) | Full-screen blocking state during init/error. |
| `SheetSpinner` | [`SheetSpinner.tsx`](../src/components/layout/SheetSpinner.tsx) | Fixed bottom-right “Syncing sheets…”. |

**Log-specific**

| Component | File | Role |
|-----------|------|------|
| `PersonLogCard` | [`PersonLogCard.tsx`](../src/components/log/PersonLogCard.tsx) | One person’s gym/steps/junk, points, save + confirm bar; takes **`logDate`** (YYYY-MM-DD) for which day is being logged; styled-components colocated here. **Weekly gym/clean caps** (4 / 6 scoring days per challenge week) apply to **points only** via **`calcPtsForLogDay`** — all options stay selectable; **free gym / free junk** options are still disabled when that person’s **`FREE_LIMIT`** free passes are used up. |
| `PersonalGoalPanel` | [`PersonalGoalPanel.tsx`](../src/components/profile/PersonalGoalPanel.tsx) | Single-person personal goal UI in a **horizontal grid** (same column pattern as **`PersonLogCard`**); receives **`logDate`** from **`LogDayPage`** so goal value save/load matches the selected workout day. Uses [`personalGoalHorizontalStyles.ts`](../src/components/profile/personalGoalHorizontalStyles.ts) + confirm bits from **`profilesStyles.ts`**. No in-app goal reset / unlock entry point (goal stays locked per product choice). |
| `HistoryEntriesTable` | [`HistoryEntriesTable.tsx`](../src/components/history/HistoryEntriesTable.tsx) | Shared history table (date, time, optional player column, type pills, details, pts). Optional **footer** (`footerProfilePts`): workouts sum + current personal-goal total. **`strikeNonLatestGoalPts`**: used on **`LogDayPage`** to strike through older goal rows. **`HistoryPage`** omits both. Optional **`pageSize`**: paginates rows (newest on page 1; **Newer** / **Older** controls). |

---

## 7. Pages (route screens) — behavior and local state

### `PickUserPage` — [`src/pages/PickUserPage.tsx`](../src/pages/PickUserPage.tsx)

- **Role:** First-run / “who are you?” screen; lists **`PEOPLE`**. Choosing a person calls **`setSelectedPerson`** and **`navigate('/log')`** (replace).

### `LogDayPage` — [`src/pages/LogDayPage.tsx`](../src/pages/LogDayPage.tsx)

- **Requires:** `person` from **`useSelectedPerson`** (enforced by **`RequirePerson`** in `App.tsx`).
- **Reads:** `entries`, `profiles`, `updateCache`, `postToSheets`, `clearGeneration` from context.
- **Local state:** **`logDate`** (workout day: **`today`** through **`WORKOUT_LOG_LOOKBACK_DAYS`** ago, inclusive — see **`workoutLogSelectableDates()`** / **`clampWorkoutLogDate`** in **`dates.ts`**), one `LogFormRow` (`gym`, `steps`, `junk`), confirm flag, validation message — for the **selected person only**. **Day** is chosen with **custom date chips**, not the native `type="date"` control, so mobile and desktop styling match (selected vs other allowed days).
- **Header:** shows **total challenge points** for the selected person (**`getTotals`** — same workout + personal-goal total as the leaderboard).
- **Renders:** that person’s **`PersonLogCard`** (passes **`logDate`**), then **`PersonalGoalPanel`** (passes the same **`logDate`** — goal value is for that calendar day), then **“Your past logs”**: **`buildHistoryRows(entries, profiles, [], { personId })`** (workouts + personal goal dailies only; **no** `resetLog` / goal set–reset rows) + **`HistoryEntriesTable`** with **`footerProfilePts={calcPersonalGoalPts(…)}`**, **`strikeNonLatestGoalPts`**, **`pageSize`** (paginated), sorted newest first.
- **Resets** `logDate` to **`today()`** when `pathname === '/log'`, when **`clearGeneration`** changes, or when **`person.id`** changes; form hydrates from cache for **`logDate`** when **`entries`** / **`personId`** / **`clearGeneration`** change.
- **Save:** Builds `WorkoutEntry` with **`date = logDate`**, **`pts` from `calcPtsForLogDay`** (raw `calcPts` plus weekly gym/clean scoring caps), merges into `entries` via `updateCache`, `postToSheets('saveWorkout', entry)`.

### `profilesStyles.ts` — [`src/pages/profilesStyles.ts`](../src/pages/profilesStyles.ts)

- **`ProfileInputs`** type and styled pieces still used by **`PersonalGoalPanel`** (password bar, confirm bar, section header). The main goal card layout lives in **`src/components/profile/personalGoalHorizontalStyles.ts`**.

### `LeaderboardPage` — [`src/pages/LeaderboardPage.tsx`](../src/pages/LeaderboardPage.tsx)

- **Reads-only** from context; uses **`getTotals`**, **`getFreeCounts`**, **`initials`**, **`fmtPts`**, **`ptsClass`** from `lib/scoring.ts`.
- Podium + rankings grid; responsive column hiding matches legacy breakpoints.

### `HistoryPage` — [`src/pages/HistoryPage.tsx`](../src/pages/HistoryPage.tsx)

- Builds rows via **`buildHistoryRows`** (`lib/history.ts`), sorts like legacy (date desc, then time); table UI is **`HistoryEntriesTable`** with the player column visible and **`pageSize`** pagination.
- **Clear all:** shown only when the **selected person** (from **`useSelectedPerson`**, if any) is **Kunle** (`id` or `name` case-insensitive match). Uses password `checkPassword('__admin', …)`, then `clearAllLocal()` + `postToSheets('clearAll', {})`.

---

## 8. Library modules (`src/lib/`)

| Module | File | Responsibility |
|--------|------|------------------|
| Config | [`config.ts`](../src/lib/config.ts) | Reads **`import.meta.env`**, `PEOPLE` JSON parse with defaults, `SCRIPT_URL`, **`CHALLENGE_START`** / **`CHALLENGE_END`**, goal-reset date bounds, `FREE_LIMIT`, `PROFILE_MAX_PTS`, `isScriptConfigured()`. |
| Selected person | [`selectedPersonStorage.ts`](../src/lib/selectedPersonStorage.ts) | **`localStorage`** read/write for the chosen **`PEOPLE[].id`**; **`getStoredPerson()`** for overlays / welcome line. |
| Dates | [`dates.ts`](../src/lib/dates.ts) | `today`, `todayDisplay`, `normalizeDateToYYYYMMDD` (Sheets serial/ISO), `dayIndex` / **`windowOf`** (7-day windows from **`CHALLENGE_START`** — used with scoring), **`minYYYYMMDD`**, **`WORKOUT_LOG_LOOKBACK_DAYS`**, **`workoutLogDateBounds`**, **`workoutLogSelectableDates`**, **`clampWorkoutLogDate`**, **`formatDateDisplayYMD`**, **`formatLogDateChipLabel`**, history display formatters. |
| Scoring | [`scoring.ts`](../src/lib/scoring.ts) | `calcPts` (per-day components before weekly caps; **`ate`** always applies −1 in the base), **`calcPtsForLogDay`** (caps gym/clean by **`windowOf(..., CHALLENGE_START)`** with **`WEEKLY_GYM_SCORE_DAYS`** / **`WEEKLY_CLEAN_SCORE_DAYS`**; **first `ate` per person per challenge week** waives the junk −1; further **`ate`** in that window keep −1), `calcProfilePts`, **`calcPersonalGoalPtsForDay`** / **`calcPersonalGoalPts`** (progress toward goal, 0–30; **no** per-day “missed log” penalty), `getWindowLimits` (same window + **`windowNum`** = `windowOf + 1` for sidebar; caps enforced in **`calcPtsForLogDay`**, not by disabling inputs), `getFreeCounts`, **`getTotals`** (workout sum per person + **one** `calcPersonalGoalPts`, not a sum of goal-log rows), `initials`, `fmtPts`, `ptsClass`, `stepsPtsFromEntry`. |
| Sheets I/O | [`sheets.ts`](../src/lib/sheets.ts) | `fetchSheetsJson`, `postToSheets`, `cacheFromPayload`, normalizers for workout/profile/goal/password/reset rows → **`ChallengeCache`**. |
| History rows | [`history.ts`](../src/lib/history.ts) | `buildHistoryRows(entries, profiles, resetLog, opts?)` → discriminated **`HistoryDisplayRow`**. Optional **`opts.personId`** limits rows to one user (used on **`LogDayPage`**). Goal rows use **`calcPersonalGoalPtsForDay`** (current profile) for displayed pts. **`latestGoalRowIndex`** for log-page strike-through. |

**Reason:** Keeps components thin and testable. Weekly workout caps use **`windowOf(date, CHALLENGE_START)`** — consecutive 7-day periods from the challenge start date (same idea as the legacy app), not calendar Monday–Sunday.

---

## 9. Types (`src/types/index.ts`)

Key exports (non-exhaustive):

- **`Person`**, **`WorkoutEntry`**, **`GoalDayEntry`**, **`ProfileData`**
- **`ResetLogEntry`** — union of `goal_set` / `goal_reset` shapes
- **`SheetsPayload`** + **`Raw*Row`** interfaces for defensive parsing
- **`RankedPlayer`** — includes **`personId`** (stable join key; legacy UI sometimes inferred id from name)

Add new backend fields here first, then update **`sheets.ts`** normalizers and any UI that displays them.

---

## 10. Configuration and environment

| Variable | Used in | Notes |
|----------|---------|--------|
| `VITE_SCRIPT_URL` | `lib/config.ts` | Required for live data; empty or placeholder → init error overlay. |
| `VITE_CHALLENGE_START` | `lib/config.ts` | Week window math for gym/clean caps. |
| `VITE_CHALLENGE_END` | `lib/config.ts` | Inclusive challenge end date (default **2026-04-17**); available for scheduling / future use. |
| `VITE_PEOPLE` | `lib/config.ts` | JSON array of `{ id, name }`; invalid/missing → built-in default roster. |
| `VITE_GOAL_RESET_OPEN` / `VITE_GOAL_RESET_CLOSE` | `lib/config.ts` | Unlock-goal reset allowed only inside this window. |

**Typing:** [`src/vite-env.d.ts`](../src/vite-env.d.ts) — extend `ImportMetaEnv` when adding new `VITE_*` keys.

**Netlify:** [`netlify.toml`](../netlify.toml) — set the same env vars in the Netlify UI; **`NODE_VERSION = "20"`** avoids old-Node build failures with Vite 5.

---

## 11. Build and deploy

**Node.js ≥ 18** is required locally (Vite 5 uses syntax Node 14 and older cannot parse — e.g. `SyntaxError: Unexpected reserved word` in `node_modules/vite/bin/vite.js`). Use **Node 20** per `.nvmrc` / Netlify. Before `dev`, `build`, and `preview`, npm runs **`scripts/check-node.cjs`** (`predev` / `prebuild` / `prepreview`) and exits with a short message if Node is too old.

| Command | Output |
|---------|--------|
| `npm run dev` | Node check → Vite dev server |
| `npm run build` | Node check → `tsc --noEmit` then `vite build` → **`dist/`** |

Netlify **`publish`** directory is **`dist`**. SPA rule sends all routes to `index.html`.

---

## 12. Backend contract (unchanged from legacy)

- **GET** `VITE_SCRIPT_URL` → JSON with `workout_log`, `profiles`, `goal_log`, `passwords`, `reset_log` (and optional `error`).
- **POST** same URL, body `JSON.stringify({ action, data })`, **`mode: 'no-cors'`** (browser cannot read response; fire-and-forget).

Actions still align with the legacy inline script (`saveWorkout`, `saveProfile`, `saveGoalDay`, `appendResetLog`, `clearAll`, …). If the Apps Script contract changes, update **`postToSheets` call sites** in pages/context and **`cacheFromPayload`** / normalizers in **`sheets.ts`**.

---

## 13. Conventions for future changes

1. **New tab/route** — Add route in `App.tsx`, `NavBar` tab list, and optionally `SECONDARY_ROUTES` in `Layout.tsx` if it should trigger background refresh (alongside `/board` and `/history`).
2. **New theme token** — Add to `AppTheme` + `appTheme` in `theme/theme.ts`; use via `props.theme` in styled components.
3. **New server field** — Extend `types/index.ts` → `sheets.ts` normalizers → context consumers.
4. **New shared hook** — Prefer `src/hooks/useThing.ts` and document it in this file when added.
5. **Styling** — Prefer styled-components next to the feature; extract to `*Styles.ts` if a page grows large (see Profiles).

---

## 14. Related docs

| Document | Use |
|----------|-----|
| [`README.md`](../README.md) | Quick start, env, Netlify |
| [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md) | Old monolithic HTML/JS for diffing behavior |
| [`ARCHIVED_ENCOURAGEMENT_FEATURE.md`](ARCHIVED_ENCOURAGEMENT_FEATURE.md) | Removed **“For today”** log encouragement; source under **`archive/encouragement-feature/`** |
| [`.env.example`](../.env.example) | Env template |

---

*Last aligned with the codebase layout as of the React migration (Vite + React + TS + styled-components + React Router). Update this file when you add routes, env vars, or major folders.*
