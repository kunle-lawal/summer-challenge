# Claude Code task — Summer Challenge v2 UI

You are picking up a project where the business logic, type system, and visual design are all already done. Your job is to build the **React UI** that consumes the existing hooks and renders the screens from the design file.

The previous Claude Code task built `src/types/`, `src/lib/`, `src/lib/rules/`, and `src/context/`. **Do not modify those.** Treat them as a stable contract.

---

## First: fetch the design and read the foundations

### 1. Fetch the design file

```
Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/tNrgR61Se1C3QqYG-QY_-A?open_file=index.html
Implement: index.html
```

This is the **visual source of truth**. Colors, typography, spacing rhythm, component aesthetics, animation moments — all come from here. The README in the design file may include specific instructions; follow them.

### 2. Then read these, in order

1. **`docs/V2_PLAN.md`** — full product spec. You need §6 (URL structure), §7 (UI / IA), §8 (audit logging from the UI side). Skim the rest.
2. **`docs/DESIGN_BRIEF.md`** — tone, principles, screen list, key flows, states to design. Aligns your work with what the designer was asked to deliver.
3. **`src/types/index.ts`** — all data types. You'll import from `@/types` constantly.
4. **`src/lib/` and `src/context/`** — the hooks and functions you'll consume. Open `src/context/ChallengeContext.tsx`, `src/context/SelectedMemberContext.tsx`, and `src/context/AdminModeContext.tsx` to see the hook APIs.
5. **`docs/lowfi-mockup.html`** — IA reference only. Use it to understand which content belongs on which screen. **The Claude Design output overrides it visually.**

After reading, confirm understanding by listing the five top-level routes from V2_PLAN §6 and which hook each screen will need before writing any code.

---

## Hard rules — do not violate

1. **Do not reimplement scoring, aggregation, or any business logic.** If you need a number, find it in `src/lib/`. If a function doesn't exist for what you need, **add a `TODO(business-logic):` comment and stub the value** — don't invent computation in a component. Flag missing functions at the end of the phase.
2. **Do not modify `src/types/`.** If a type needs to change, stop and surface the issue.
3. **Do not modify `src/lib/` or `src/context/`.** If a hook is missing something you need, add a `TODO(hook-extension):` comment and use a workaround. Flag at end of phase.
4. **Mobile-first.** Design at 380px width first; scale up. Bottom nav on mobile, optional top nav on desktop ≥768px.
5. **All Firestore reads go through `useChallenge()`.** No direct Firestore imports in components.
6. **All Firestore writes go through `src/lib/` functions.** Components call `addMember(...)`, never `addDoc(...)`.

---

## Scope

### In scope

| Area | Files |
|------|-------|
| Routing | `src/App.tsx`, `src/main.tsx` (provider chain) |
| Design system | `src/theme/` (tokens, GlobalStyle, AppThemeProvider) — rebuilt to match the design file |
| Shared layout | `src/components/layout/Layout.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `LoadingState.tsx`, `ErrorBoundary.tsx` |
| Root redirect | `src/pages/RootRedirect.tsx` |
| Create challenge | `src/pages/CreateChallengePage.tsx` + sub-components for the wizard steps |
| Challenge home | `src/pages/ChallengeHomePage.tsx` |
| Pick member | `src/pages/PickMemberPage.tsx` |
| Log Day | `src/pages/LogDayPage.tsx` + `src/components/log/*` (one component per rule kind) |
| Leaderboard | `src/pages/LeaderboardPage.tsx` + `src/components/leaderboard/*` |
| History | `src/pages/HistoryPage.tsx` + `src/components/history/*` |
| Member profile | `src/pages/MemberProfilePage.tsx` |
| Admin | `src/pages/AdminPage.tsx`, `AuditPage.tsx`, + `src/components/admin/*` |
| Rules reference | `src/pages/RulesReferencePage.tsx` |
| Shared UI | `src/components/ui/*` — buttons, inputs, badges, initials chip, progress bar, etc. extracted from the design |

### Out of scope

- Anything in `src/lib/`, `src/context/`, or `src/types/`. Read-only.
- Firestore security rules (`firestore.rules` from prior task).
- App Check production wiring.
- Authentication of any kind.
- Cloud Functions.
- Component-level unit tests (manual review is fine for UI; the business logic is the tested layer).
- Storybook setup.
- E2E tests.
- Production deployment.

---

## v1 code handling

Before writing v2 UI, **deal with the v1 code**:

1. Run `ls src/pages/ src/components/` to see what's there.
2. If v1 pages still exist (`LogDayPage.tsx` referencing `sheets.ts`, etc.), **move them to `legacy/`**:
   ```bash
   mkdir -p legacy
   git mv src/pages legacy/v1-pages
   git mv src/components legacy/v1-components
   mkdir -p src/pages src/components
   ```
3. Leave `src/types/`, `src/lib/`, and `src/context/` untouched.
4. If `legacy/` already exists (the previous Claude Code task may have done this), confirm and skip.

The v1 code remains in `legacy/` as a behavior reference but is no longer imported anywhere.

---

## Conventions

- **TypeScript strict mode.** No `any`. No `@ts-ignore` unless flagged with a comment explaining why.
- **styled-components** for styling. Theme tokens from `src/theme/theme.ts` — extend the existing v1 theme structure with design-file values.
- **`import type` for type-only imports.**
- **One responsibility per file.** A page imports components; components don't import other pages.
- **Components are presentational where possible.** Pages own data fetching via hooks; components receive props.
- **No inline scoring math.** If you write `entry.gym === 'yes' ? 1 : 0` in a component, you've already lost. Use the helpers in `src/lib/rules/`.
- **Path alias `@/`** points to `src/`. Use it for cross-folder imports.

---

## Routing

From V2_PLAN §6, set up these routes in `src/App.tsx` with React Router v6:

| Path | Page | Provider wrap | Member required? |
|------|------|---------------|------------------|
| `/` | `RootRedirect` | none | — |
| `/new` | `CreateChallengePage` | none | — |
| `/c/:slug` | `ChallengeHomePage` | `ChallengeProvider` | no (prompts pick) |
| `/c/:slug/pick` | `PickMemberPage` | `ChallengeProvider` | no |
| `/c/:slug/log` | `LogDayPage` | `ChallengeProvider`, `SelectedMemberProvider`, **`RequireMember`** | **yes** |
| `/c/:slug/board` | `LeaderboardPage` | `ChallengeProvider` | no |
| `/c/:slug/history` | `HistoryPage` | `ChallengeProvider` | no |
| `/c/:slug/m/:memberId` | `MemberProfilePage` | `ChallengeProvider` | no |
| `/c/:slug/admin` | `AdminPage` | `ChallengeProvider`, **`AdminModeProvider`**, **`RequireAdmin`** | no |
| `/c/:slug/admin/audit` | `AuditPage` | `ChallengeProvider`, `AdminModeProvider`, `RequireAdmin` | no |
| `/c/:slug/rules` | `RulesReferencePage` | `ChallengeProvider` | no |
| `*` | redirect to `/` | none | — |

- `RootRedirect` reads `recentChallenges` from localStorage; if any, redirects to the most recent's `/c/:slug`. Else redirects to `/new`.
- `RequireMember` reads `useSelectedMember()`; if null, redirects to `/c/:slug/pick`.
- `RequireAdmin` reads `useAdminMode()`; if not authenticated, redirects to `/c/:slug/admin` (which shows the password gate).

---

## The six rule card components

This is the highest-stakes UI work. Each rule kind needs its own component, all sharing a common shell. Build them as:

```
src/components/log/
├── RuleCard.tsx              # shared shell — name, current value, pts, edit-window indicator
├── BinaryRuleCard.tsx        # yes / no / ★ free
├── CounterRuleCard.tsx       # numeric input + progress to target
├── RangeRuleCard.tsx         # numeric input + range hint
├── PenaltyRuleCard.tsx       # clean / slipped / ★ free
├── StreakRuleCard.tsx        # derived, no input — shows N/M days
├── TrackerRuleCard.tsx       # numeric input + per-member goal progress bar
└── ruleCardRouter.tsx        # given a Rule, returns the right card component
```

### States every card must handle

| State | Trigger | Visual cue |
|-------|---------|------------|
| **Empty** | No entry exists for this rule on this date | Prompts for input, neutral framing |
| **Logged & editable** | Entry exists, date is today or yesterday | Shows logged value + edit affordance; surfaces edit-window deadline |
| **Logged & locked** | Entry exists, date is older than yesterday | Read-only, lock icon, timestamp ("logged 9:24 PM") |
| **Free pass used** | Value is `'free'` (binary/penalty) | Visually distinct so user remembers they spent a pass |
| **Capped** | Rule hit weekly cap on a prior day | Shows "0 pts — weekly cap reached" with explanation |
| **Penalty waived** | First infraction this week, `weeklyFirstWaived: true` | Shows "0 pts — first slip waived" |

Use `EvaluatedRule.cappedFromWeekly`, `waivedFromPenalty`, `usedFreePass` flags from `src/lib/rules/aggregate.ts` to drive these states. Don't recompute.

### Whole-screen Log Day states

- **Pre-start**: challenge `startDate` is in the future → banner with countdown, all cards disabled.
- **Active**: normal state.
- **Ended**: challenge `status === 'ended'` → banner, all cards locked, no save buttons.
- **No rules configured**: edge case for new challenges → CTA pointing the owner to admin.

---

## Dependencies

Most should already be installed. Confirm by reading `package.json`. Install only if missing:

```bash
npm install react-router-dom@^6 styled-components
npm install -D @types/styled-components
```

For icon set, install one — pick the one that best matches the design file:

```bash
# pick ONE based on the design
npm install lucide-react       # clean, consistent
npm install @phosphor-icons/react  # more character
npm install @tabler/icons-react    # large catalog
```

If the design file uses custom SVG icons, copy those into `src/components/ui/icons/` instead.

---

## Order of work — work in phases, stop for review between each

### Phase A — Foundation

1. Fetch the design file. Read its README.
2. Deal with v1 code (move to `legacy/` if not already done).
3. Extract design tokens from the design file into `src/theme/theme.ts` and `src/theme/GlobalStyle.tsx`. This includes colors, font families (web-load if not system), font sizes, spacing scale, radii, shadows, breakpoints.
4. Set up routing skeleton in `src/App.tsx` with every route from the table above, but every page is a stub that renders just its name.
5. Build `RootRedirect`.
6. Build `RequireMember` and `RequireAdmin` guards.
7. Build `Layout`, `TopBar`, `BottomNav` — wire them as outlets for the routed pages. The top bar must include the "+" affordance that links to `/new` from every challenge page (per V2_PLAN §6).
8. Verify `npm run build` succeeds and you can navigate between stub pages.

**Stop. Confirm routing works end-to-end with stubs. Wait for review.**

### Phase B — Entry surfaces

1. `CreateChallengePage` — wizard with three logical sections (Name & dates, Rules, Owner password & members). Use `createChallenge()` from `src/lib/challenges.ts` at submit. Save preset selection state and call `getPreset('classic')` etc. from `src/lib/rules/presets.ts`.
2. `PickMemberPage` — full-screen, no chrome, lists members via `useChallenge().members.filter(m => m.active)`. On tap → `setSelectedMember(member.id)` and navigate to `/c/:slug/log`.
3. `ChallengeHomePage` — pulls `useChallenge()` and `useSelectedMember()`. Shows challenge name, week info, days remaining, top-3 podium peek (via `getLeaderboard()`), "Log today" CTA, this-week summary tiles.
4. Build any shared `src/components/ui/*` primitives (Button, InitialsChip, Badge, Card, ProgressBar) as you encounter the need. Don't pre-build them.

**Stop. Confirm you can create a challenge, pick a member, and land on home. Wait for review.**

### Phase C — Log Day

The big one. Do this in sub-steps:

1. Build `RuleCard` shared shell + `ruleCardRouter`.
2. Build `BinaryRuleCard` and `CounterRuleCard` first — they cover the two most common patterns and unlock the rest.
3. Wire saving via `upsertEntry()` from `src/lib/entries.ts`.
4. Build `PenaltyRuleCard`, `RangeRuleCard`, `TrackerRuleCard`.
5. Build `StreakRuleCard` (derived, no input).
6. Wire the date-chip strip at top using `workoutLogSelectableDates()` from `src/lib/dates.ts` (or the v2 equivalent).
7. Wire the week-summary indicator via `getWeeklySummary()` from `src/lib/rules/aggregate.ts`.
8. Implement every state from the "States every card must handle" table.
9. Implement the four whole-screen states (pre-start, active, ended, no rules).

**Stop. Confirm logging works for all six rule kinds across all states. Wait for review.**

### Phase D — Read views

1. `LeaderboardPage` — full standings via `getLeaderboard()`. Active members only (inactive already excluded by the aggregator). Designer probably includes a podium treatment for top 3 and per-rule breakdown for the rest.
2. `HistoryPage` — full event log via a Firestore listener on `auditLog` + `entries` (the `ChallengeProvider` may already expose this; if not, add a `TODO(hook-extension):` and use what's available). Newest first, paginated, filter chips by member and rule.
3. `MemberProfilePage` — drill-in for one member: total, per-rule breakdown, recent entries, streak status, tracker progress.

**Stop. Wait for review.**

### Phase E — Admin + polish

1. `AdminPage` — password gate using `verifyOwnerPassword()` + `setAdminMode()`. Once unlocked, admin landing with three cards: Members, Rules & Dates, Audit Log.
2. Member management screen — list (active + inactive), add (with conflict resolution showing suggested name), rename, remove.
3. Config editor — edit dates, edit existing rules, add/remove rules. Each rule kind gets its own editor sub-component.
4. `AuditPage` — chronological view of `auditLog` entries with `before`/`after` diffing.
5. `RulesReferencePage` — read-only view of the rule set for participants who want to see what's configured.
6. Empty states for every list (no entries, no members, no audit history).
7. Error boundaries on each route.
8. Toast/inline feedback on save actions.
9. Celebration moments (designer should have specified where — implement those, skip if not specified).
10. Edit-window countdown UI (e.g. "editable for 14 more hours") on logged entries.

**Stop. End of task.**

---

## Hook API quick reference

Don't reread the context files for trivial usage — here's the shape. Verify against the actual exports before relying on this.

```ts
// useChallenge — within a ChallengeProvider, scoped to current slug
const {
  challenge,           // Challenge | null
  members,             // Member[]
  entries,             // Entry[]
  auditLog,            // AuditLogEntry[]
  loading,             // boolean
  error,               // Error | null
} = useChallenge();

// useSelectedMember — within a SelectedMemberProvider
const {
  member,              // Member | null — already resolved against the active list
  setSelectedMember,   // (id: string) => void
  clearSelectedMember, // () => void
} = useSelectedMember();

// useAdminMode — within an AdminModeProvider
const {
  isAdmin,             // boolean
  unlock,              // (password: string) => Promise<boolean>
  lock,                // () => void
} = useAdminMode();
```

If actual hook shapes differ, **trust the source, not this doc**.

---

## Things you'll likely need to ask the prior task for (flag at phase end)

These may be missing or named differently. Don't invent them — flag and stub:

- A `getWeeklySummary(challenge, memberId, date)` aggregator for the Log Day's weekly counter.
- A `formatRuleValueForDisplay(rule, value)` helper for showing entry values consistently in History.
- An `evaluateEntryWithFlags(...)` that returns `EvaluatedEntry` with provenance flags (capped, waived, free) for individual rule cards.
- A `getMemberStreak(memberId, ruleId)` helper for `StreakRuleCard`.

If any of these are missing, the design language for those states still needs to be implemented — just stub the data with `// TODO(hook-extension)` and move on.

---

## What "done" looks like

- All routes in the routing table resolve and render.
- All six rule card kinds work in their happy-path state.
- Every "must handle" card state is visually distinct.
- Whole-screen states (pre-start, active, ended) work.
- Admin gate is enforceable; admin actions write audit entries (which they will, automatically, via the existing `src/lib/` functions).
- `npm run build` succeeds with no TypeScript errors.
- The app renders cleanly on a 380px-wide mobile viewport AND on a 1280px desktop viewport without horizontal scroll or broken layouts.
- No business logic in components — verifiable by `git grep "calc\|score\|aggregate" src/components src/pages` returning nothing meaningful.

---

## When in doubt

- **Visual ambiguity → defer to the design file.** If the design says one thing and this doc says another, the design wins on aesthetics; this doc wins on data and behavior.
- **Behavioral ambiguity → defer to V2_PLAN.md.** If the design implies a behavior that conflicts with V2_PLAN, surface the conflict.
- **Don't refactor `src/lib/`, `src/context/`, or `src/types/`.** Flag with `TODO(hook-extension):` or `TODO(business-logic):` and continue.
- **Don't add new business logic.** A component computing points is the wrong shape; surface it instead.
- **Don't commit at the end of every sub-step.** Commit at phase boundaries. Let the user review and push themselves.

---

## Resuming after interruption

1. `ls src/pages src/components src/theme` — see what exists.
2. `npm run build` — check what compiles.
3. Open the design file URL again to refresh visual context.
4. Open `docs/V2_PLAN.md` §6–§7 and `docs/DESIGN_BRIEF.md` to refresh product context.
5. Search for `TODO(hook-extension):` and `TODO(business-logic):` comments — these are deferred decisions to revisit.
6. Identify which phase A–E the tree corresponds to and resume from there.