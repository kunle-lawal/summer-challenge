# Summer Challenge v2 — Redesign Plan

This document plans the next major version of the app. It is a **planning artifact**, not a final spec: sections marked **[Decision]** capture choices already made, sections marked **[Proposal]** capture my recommendations awaiting confirmation, and **[Open]** flags things still to discuss.

The current shipping app is documented in [`APP_REFERENCE.md`](./APP_REFERENCE.md). This plan replaces large parts of it; on cutover, that doc will be updated to reflect v2 and the v1 description archived for reference.

---

## 1. Vision

**v1** was a single hardcoded workout challenge for one fixed roster, backed by a Google Sheet, with a clustered single-page log experience and no real concept of identity.

**v2** is a tool for **anyone to spin up their own public challenge**, share a link, define their own rules, and track progress with friends — backed by Firebase, with a mobile-first UI that takes Strava's data-richness and Duolingo's intuitiveness as references.

Three big shifts:

1. **Challenges become the core primitive.** A user can create, join, and participate in many challenges at once. Each one has its own roster, rules, and history.
2. **Configurable rule system.** Creators pick which metrics to track (gym, steps, water, runs, weight, custom) and tune scoring per challenge.
3. **No accounts, ever.** Identity stays lightweight: pick-a-member-per-challenge, cached in local storage. The challenge URL is the "account." Owner control is gated by a creator-set password.

---

## 2. What's changing at a glance

| Area | v1 | v2 |
|------|----|----|
| Backend | Google Sheets via Apps Script | **Firestore** (no Functions for v1) |
| Auth | None | None — challenge URL + owner password |
| Challenges | One hardcoded challenge | **Many user-created public challenges** |
| Roster | Fixed `VITE_PEOPLE` env var | **Owner adds/removes members per challenge** |
| Rules | Hardcoded (gym, steps, junk, personal goal) | **Configurable rule system per challenge** |
| Logging | Lock-in forever, no edits | **Edit window of "today + yesterday"; owner override** |
| Challenge end | No concept | **Locked, view-only; owner can reopen** |
| Audit | None | **Every action logged per challenge** |
| Abuse protection | None | **App Check + 1-hour client-side create cooldown** |
| UI | Desktop-first, single dense Log page | **Mobile-first, simplified IA, Duolingo-style flows** |
| Entry point | App URL → fixed challenge | **`/` redirects to recent challenge or `/new`** |
| Hosting | Netlify | Netlify (unchanged) |
| Real-time | Refresh on tab visit | Same (no listeners for v1) |

---

## 3. Key decisions

### 3.1 Cloud Functions — **[Decision] Skip for v1, revisit later**

Compute scoring, totals, and leaderboards on the client. Reasons:

- Trust model is intentionally loose — Functions wouldn't add meaningful security.
- Firestore free tier covers small-group reads easily.
- Scoring rules are still evolving; keeping them client-side means no deploy cycle per tweak.
- Functions require the Blaze (pay-as-you-go) plan, which is overhead we don't need yet.

**Add Functions later when:**

- We want scheduled jobs (e.g. challenge-end recap, daily reminder, auto-archive ended challenges).
- We want push notifications.
- We want to prevent client-side scoring tampering (which today doesn't matter because anyone can already edit anyone).

### 3.2 Edit window — **[Decision] Today + yesterday**

- Entries dated **today or yesterday** (relative to the challenge's timezone) are editable by the logger who created them.
- Entries older than that are locked.
- Owner has **always-override** to edit anything (via password-gated admin mode), as long as the challenge is `active`.
- Every edit writes to the audit log with `before` and `after` values.

### 3.3 Slug strategy — **[Decision] Auto-generated short code only**

- Auto-generate a 6-character base32 slug on create (e.g. `aB3xR9`) → URL is `/c/aB3xR9`.
- No vanity rename in v1. The slug is the slug forever. Keeps URLs stable and avoids name-squatting headaches.

### 3.4 Rule kinds — **[Decision] Six composable kinds, all shipping in v1**

Rather than hardcoding gym/steps/junk, define a small set of **rule kinds** the creator composes per challenge. Each kind defines how a value is captured, scored, and capped.

| Kind | Captures | Example rules |
|------|----------|---------------|
| `binary` | Yes / No / [optional Free pass] | Went to gym, ate clean, no alcohol, meditated, stretched |
| `counter` | Number toward a daily target | Steps (10k = 5pts), water (8 cups = 3pts), pushups (100 = 4pts), miles run |
| `range` | Number inside a window | Sleep 7–9 hours, calories 1800–2200, weight in maintenance band |
| `penalty` | Bad-thing toggle with weekly waiver | Ate junk, smoked, missed workout |
| `streak` | Bonus for N consecutive successful days of another rule | "7-day clean streak = +5 bonus" |
| `tracker` | Continuous metric, like v1 personal goal | Weight loss/gain, body fat %, mile time |

**Free-pass tokens** become a property on `binary` and `penalty` kinds rather than a separate concept — e.g. "Gym binary rule with 5 free passes" or "Junk penalty with first-of-week waiver."

**Weekly caps** also move to per-rule config — gym's 4-day cap is a property of the gym rule, not global.

**Trackers are capped at one per challenge** in v1. Most challenges only need one continuous metric (typically weight). Multiple trackers add UI complexity in member setup; revisit in v3 if there's demand.

**Streak rules** reference another rule by id and reward consecutive days where that rule scored positive. They don't capture their own input — purely derived. Configurable: `{ ruleRef: ruleId, daysRequired: 7, bonusPoints: 5, repeatable: bool }`.

**Suggested defaults when creating a challenge:** offer a "Classic" preset that mirrors v1 (gym binary, steps counter, junk penalty, weight tracker), plus a "Minimal" preset (just one binary), plus "Custom."

### 3.5 Challenge end behavior — **[Decision] Locked, view-only**

When a challenge reaches its `endDate` (or owner manually ends it):

- Status flips to `ended`.
- **All editing is disabled** for everyone — logger edit window and owner override both close. Members can no longer create new entries for any date.
- Leaderboard, history, and member profiles remain **fully viewable**.
- Owner can flip status back to `active` from admin if a post-hoc fix is needed; flipping back re-opens editing per the normal rules.
- The challenge home shows an "ended" banner with final standings.

### 3.6 Abuse mitigation — **[Decision] Client cooldown + Firebase App Check**

Without auth, throttling challenge creation is genuinely tricky. Two layers:

- **Client-side cooldown (UX)**: localStorage stores last-create timestamp; the Create flow shows a friendly "you just created one — try again in N minutes" if attempted again within **1 hour**. Bypassable by clearing storage, but discourages casual spam.
- **Firebase App Check (real enforcement)**: enable App Check on the Firestore project. It cryptographically verifies that write requests come from our real app domain (via reCAPTCHA Enterprise on web), blocking automated abuse. Works without Cloud Functions, no per-request code.

Entry-level rate limiting is not added — Firestore's built-in quotas are sufficient for legitimate use, and a member spamming their own log doesn't hurt anyone but themselves.

**Member name conflicts on rename:** owner attempts to rename "Alex" → "Bob" when a "Bob" already exists → **block the rename**, surface "Bob is taken — try `Bob 2`?" with the suffixed name pre-filled. Same logic on initial member-add.

---

## 4. Domain model

### 4.1 Primitives

| Concept | Description |
|---------|-------------|
| **Challenge** | Top-level container. Has slug, name, owner password hash, config (dates, rules), members, entries, audit log. Public to anyone with the URL. |
| **Member** | A named participant inside one challenge. Has unique name within that challenge, an id, active/removed state. A real human picks "which member am I" per challenge; that choice is cached locally. |
| **Rule** | A scoring rule definition inside a challenge config. See §3.4. |
| **Entry** | One day's logged values for one member. Holds the raw inputs (per rule) and a computed `pts` snapshot. |
| **AuditLogEntry** | One immutable record of any action — create challenge, add/remove member, create/edit/delete entry, config change, owner login. |

### 4.2 Identity & selection

- No user accounts, no sign-in.
- Each browser stores `selectedMemberId` **scoped per challenge slug** in localStorage: key `sc:selected:{slug}` → memberId.
- Visiting `/c/{slug}/log` without a cached selection redirects to `/c/{slug}/pick`.
- A user can be "Alex" in challenge A and "Sandro" in challenge B simultaneously — selections are independent.

### 4.3 Owner model

- Whoever creates a challenge sets an **owner password** at creation. Stored in Firestore as a hash (SHA-256 with random salt; this is for casual gating, not real security).
- "Admin mode" is a per-tab state: enter the password once on a settings screen, get full edit rights until tab close.
- Admin mode unlocks: add/remove members, rename members, edit any entry, change config, end/reopen challenge.
- Lost password = lost owner controls. We surface this clearly at create time.

### 4.4 Removed members

- Removing a member sets `active: false`, **does not delete their data**.
- Removed members:
  - Do **not** appear in the Pick Member screen.
  - Are **excluded from Leaderboard** — their entries do not count toward standings, and their name does not appear in rankings.
  - **Still appear in History** with a "(removed)" tag — History is an event log of what actually happened, so erasing them would be dishonest. Past entries remain visible for context.
  - Their member profile page is reachable by direct URL but not linked from anywhere.
  - Their cached `selectedMemberId` on any device becomes orphaned → that device falls back to Pick screen.
- If an owner re-adds a member with the same name later, **a new member record is created** with a new id — the removed one is not "revived." (Re-adding a literal previous record could be a v3 feature; not worth the complexity now.)

---

## 5. Firestore schema

All scoring/aggregation is client-side. Schema is read-friendly: a single challenge with its members, entries, and audit log can be hydrated with one collection group read per subcollection.

```
challenges/{challengeId}
  ├─ slug: string                 # immutable URL slug
  ├─ name: string                 # display name
  ├─ createdAt: timestamp
  ├─ ownerPasswordHash: string
  ├─ ownerPasswordSalt: string
  ├─ status: 'active' | 'ended'
  ├─ config:
  │     ├─ startDate: 'YYYY-MM-DD'
  │     ├─ endDate: 'YYYY-MM-DD' | null
  │     ├─ weekAnchor: 'YYYY-MM-DD'
  │     ├─ timezone: string       # IANA, e.g. 'America/Chicago'
  │     └─ rules: Rule[]          # see §3.4
  │
  ├─ members/{memberId}
  │     ├─ name: string           # unique within challenge
  │     ├─ createdAt: timestamp
  │     ├─ active: boolean
  │     └─ removedAt: timestamp | null
  │
  ├─ entries/{entryId}
  │     ├─ memberId: string
  │     ├─ date: 'YYYY-MM-DD'
  │     ├─ values: { [ruleId: string]: any }
  │     ├─ pts: number            # computed snapshot for sort/leaderboard
  │     ├─ createdAt: timestamp
  │     ├─ updatedAt: timestamp
  │     └─ createdByMemberId: string | null   # cached identity at time of action
  │
  └─ auditLog/{logId}
        ├─ timestamp: timestamp
        ├─ actorMemberId: string | null
        ├─ actorIsOwner: boolean
        ├─ action: AuditAction          # enum, see §8
        ├─ target: { kind, id }
        ├─ before: any | null
        └─ after: any | null

slugIndex/{slug}
  └─ challengeId: string          # for fast slug→id lookup
```

**Indexes needed:**

- `entries` by `(memberId, date desc)` — member history pages.
- `entries` by `date desc` — overall history.
- `auditLog` by `timestamp desc`.
- `slugIndex` is a flat top-level collection so slug→id lookup is a single document read.

**Security rules (v1):** entirely permissive reads, writes constrained to shape validation (no field type confusion). Real access control is the URL secret + owner password. This matches the existing trust model and will need revisiting if we ever introduce auth.

---

## 6. URL structure

| Path | Purpose | Member required? |
|------|---------|------------------|
| `/` | **Redirect** — to most-recently-visited challenge in localStorage, else to `/new` | No |
| `/new` | Create challenge wizard | No |
| `/c/:slug` | Challenge home — quick view of standings + your status | No (but prompts pick) |
| `/c/:slug/pick` | Pick which member you are in this challenge | No |
| `/c/:slug/log` | Log today's entry | Yes |
| `/c/:slug/board` | Leaderboard | No |
| `/c/:slug/history` | Full history | No |
| `/c/:slug/m/:memberId` | Member profile (per-rule breakdown, streaks, history) | No |
| `/c/:slug/admin` | Owner admin (password gate) | No |
| `/c/:slug/admin/audit` | Audit log viewer (owner only) | No |
| `/c/:slug/rules` | Read-only rule reference for participants | No |

Notes:
- **No standalone landing page.** The only "entry surfaces" are `/new` and any challenge URL. Hitting the bare domain falls through to the user's recent challenge or, if none, the create wizard.
- **"Create a new challenge" is a header affordance on every challenge page** — a `+` icon or button in the top bar so participants can spin up their own without going home first.
- Challenge home `/c/:slug` is the new front door for a given challenge — replaces v1's tab-soup. Cards lead to Log, Board, History.
- "Switch member" goes to `/c/:slug/pick`.
- "Switch challenge" is a separate top-level affordance (recently visited challenges in localStorage, surfaced from the top-bar menu).

---

## 7. UI / information architecture

### 7.1 Principles

- **Mobile-first** — design at 380px width first, scale up. Sticky bottom tabs over sticky top header for primary nav.
- **One thing per screen** — v1's Log page mixed date picker, log card, goal panel, history table, and totals banner on one scroll. v2 splits these.
- **Duolingo-style intuition** — big tappable targets, progressive disclosure, celebrations on lock-in, friendly empty states.
- **Strava-style data** — leaderboard and history are dense and rich; let people drill into a member's profile to see their breakdown.

### 7.2 Proposed screen flow

```
                  ┌────────────────┐
                  │   `/` (redirect)│ → recent challenge or `/new`
                  └────┬───────────┘
                       │
                       ▼
            ┌─────────────────────┐         ┌──────────┐
            │   Challenge Home    │ ←─────  │  /new    │  (header "+" from
            │   /c/:slug          │         └──────────┘   any challenge page)
            │  ─────────────────  │
            │  • Today's status   │
            │  • Top 3 podium     │
            │  • Big "Log today"  │
            │  • Stats peek       │
            └──┬───────┬───────┬──┘
               │       │       │
        ┌──────▼──┐ ┌──▼───┐ ┌─▼──────┐
        │ Log Day │ │Board │ │History │
        └─────────┘ └──────┘ └────────┘
```

- **Bottom nav (mobile):** Home · Log · Board · History — Admin behind a gear icon.
- **Log screen:** one rule per "card" stacked vertically (instead of v1's horizontal grid), with date selector pinned at top. Tap a card to expand its input, tap Save to commit just that rule's value for the day, or "Save all" at bottom.

### 7.3 Member profile (new)

A member's name in any list is tappable → `/c/:slug/m/:memberId` → shows that member's: totals, per-rule breakdown, streak, recent entries, % of weekly cap used. This addresses v1's "everything's mashed together" complaint.

### 7.4 Onboarding (new)

A first-time creator gets a three-step wizard:
1. **Name & dates** — challenge name, start, optional end, timezone.
2. **Rules** — pick a preset (Classic / Minimal / Custom) and tune.
3. **Owner password & members** — set password, add first batch of members.

After create: a share screen with the URL, a "copy link" button, and a "view challenge" CTA.

---

## 8. Audit logging

Every state-changing action writes one `auditLog` doc. Owner-only audit screen lists them newest-first, paginated.

### 8.1 Logged actions

| Action | Trigger | `target` | `before`/`after` |
|--------|---------|----------|------------------|
| `challenge.create` | Create wizard finishes | challenge | null / snapshot |
| `challenge.config_change` | Owner edits dates/rules | challenge | old config / new config |
| `challenge.status_change` | Owner ends or reopens challenge | challenge | old status / new status |
| `member.add` | Owner adds member | member | null / member |
| `member.remove` | Owner removes member | member | active / removed |
| `member.rename` | Owner renames member | member | old name / new name |
| `entry.create` | Member logs a day | entry | null / entry |
| `entry.update` | Edit within window or by owner | entry | old values / new values |
| `entry.delete` | Owner-only | entry | entry / null |
| `owner.login` | Admin password accepted | challenge | — |
| `owner.login_failed` | Wrong password attempt | challenge | — |

### 8.2 Actor identity

Audit records `actorMemberId` (whoever is locally selected on the device performing the action) and `actorIsOwner` (whether admin mode was active). Both can be null on the create-challenge action since no member is selected yet.

This is **not tamper-proof** — a sophisticated user could spoof the actor since there's no auth. It's a behavioral record for a trusted-but-curious group, not a forensic log.

---

## 9. Scoring & computation

### 9.1 Where it runs

- **Client only** for v1. See §3.1.
- Stored `entry.pts` is recomputed and re-written whenever the entry is saved or edited.
- Leaderboard and history pages recompute aggregates on hydrate.

### 9.2 What changes from v1

- v1's `scoring.ts` becomes a **rule engine** in `src/lib/rules/`:
  - `evaluateRule(rule, value, context)` → `{ pts, notes }`
  - `evaluateEntry(challenge, entry, allEntries)` → `{ totalPts, perRule: {...} }`
  - `aggregateMember(challenge, memberId, allEntries)` → totals
- Weekly cap logic moves from hardcoded gym/clean into per-rule config: `{ kind: 'binary', weeklyCap: { maxDays: 4, scope: 'positive' } }`.
- Free passes move into per-rule config: `{ kind: 'binary', freePasses: { count: 5, lifetime: true } }`.
- Junk-style "first per week waived" becomes a property of `penalty` rules: `{ kind: 'penalty', weeklyFirstWaived: true }`.

### 9.3 Personal goal generalization

v1's personal goal becomes the `tracker` rule kind. Multiple trackers per challenge are allowed (track both weight and mile time, for instance). Each tracker has its own max-points contribution (default 30, configurable).

---

## 10. Tech & repo changes

### 10.1 New / changed dependencies

- Add: `firebase` (modular SDK v10+), `firebase/firestore`, `firebase/app`.
- Remove: nothing yet — Apps Script call sites will be replaced, not deleted, until v2 is live.
- Consider: `nanoid` for slug generation, `date-fns-tz` for timezone-aware date math (v1 uses local `Date` only).

### 10.2 New env variables

| Var | Purpose |
|-----|---------|
| `VITE_FIREBASE_API_KEY` | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web config |
| `VITE_FIREBASE_APP_ID` | Firebase web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | (optional, unused for v1) |

The v1 vars `VITE_SCRIPT_URL`, `VITE_PEOPLE`, `VITE_CHALLENGE_START`, `VITE_CHALLENGE_END`, `VITE_GOAL_RESET_*` all go away — those concepts move into per-challenge config in Firestore.

### 10.3 Proposed file layout

```
src/
├── lib/
│   ├── firebase.ts            # init + exports
│   ├── appCheck.ts            # Firebase App Check setup
│   ├── challenges.ts          # CRUD on challenges + create-cooldown check
│   ├── members.ts             # CRUD on members + name conflict resolution
│   ├── entries.ts             # CRUD on entries + edit-window logic
│   ├── audit.ts               # auditLog writer
│   ├── ownerAuth.ts           # password hash + admin-mode state
│   ├── rules/
│   │   ├── kinds.ts           # rule type definitions
│   │   ├── evaluate.ts        # per-entry evaluation
│   │   ├── aggregate.ts       # member/leaderboard rollups (excludes inactive members)
│   │   └── presets.ts         # Classic / Minimal templates
│   ├── selectedMember.ts      # per-slug localStorage
│   ├── recentChallenges.ts    # localStorage list for `/` redirect + switcher
│   └── dates.ts               # tz-aware (keep + extend v1)
│
├── context/
│   ├── ChallengeContext.tsx   # bound to one challenge slug
│   ├── SelectedMemberContext.tsx
│   └── AdminModeContext.tsx   # owner password state
│
├── pages/
│   ├── RootRedirect.tsx       # `/` → recent challenge or `/new`
│   ├── CreateChallengePage.tsx
│   ├── ChallengeHomePage.tsx
│   ├── PickMemberPage.tsx
│   ├── LogDayPage.tsx
│   ├── LeaderboardPage.tsx
│   ├── HistoryPage.tsx
│   ├── MemberProfilePage.tsx
│   ├── AdminPage.tsx
│   ├── AuditPage.tsx
│   └── RulesReferencePage.tsx
│
└── components/
    ├── log/
    │   ├── RuleCard.tsx       # one per rule kind
    │   ├── BinaryRuleCard.tsx
    │   ├── CounterRuleCard.tsx
    │   ├── RangeRuleCard.tsx
    │   ├── PenaltyRuleCard.tsx
    │   ├── TrackerRuleCard.tsx
    │   └── DatePicker.tsx
    ├── leaderboard/
    ├── history/
    ├── admin/
    │   ├── MemberList.tsx
    │   ├── RuleEditor.tsx
    │   ├── ConfigEditor.tsx
    │   └── PasswordGate.tsx
    └── layout/
        ├── BottomNav.tsx       # new (replaces top tabs on mobile)
        ├── TopBar.tsx
        └── ChallengeSwitcher.tsx
```

The old `archive/` directory and v1 sheets module stay until v2 ships, then move to a `legacy/` folder for reference.

---

## 11. Phased rollout

Rough sequencing — each phase is independently mergeable.

**Phase 0 — Foundation**
- Firebase project setup, env wiring, security rules baseline.
- `firebase.ts` init, smoke-test read/write.
- New routing skeleton (`/c/:slug/...`) with stub pages.

**Phase 1 — Rule engine, no UI**
- Build rule kinds, evaluator, aggregator with full unit tests.
- Port v1 hardcoded logic onto rule kinds as the "Classic" preset to prove parity.

**Phase 2 — Create + read a challenge**
- Create wizard → write Firestore doc.
- Challenge home, pick member, basic log day for `binary` and `counter` only.

**Phase 3 — Full rule support**
- All rule kinds in log UI.
- Leaderboard + history.
- Edit window logic + audit logging.

**Phase 4 — Admin**
- Password gate, member add/remove, config editing, audit viewer.

**Phase 5 — Polish**
- Member profile, share screen, onboarding wizard polish, empty states, celebrations.
- Mobile nav, animations, copy pass.

**Phase 6 — Cutover**
- Domain points to v2 build.
- Archive v1 docs, update `APP_REFERENCE.md`.

---

## 12. Decisions log

All open questions from the first draft have been answered. Recorded here for traceability.

| # | Question | Decision |
|---|----------|----------|
| 1 | Edit window length | **Today + yesterday** are editable by the logger; owner override while challenge is active. (§3.2) |
| 2 | Slug strategy | **Auto-generated 6-char base32 slug only**; no vanity rename in v1. (§3.3) |
| 3 | Removed-member display | **Excluded from Leaderboard**; still shown in History with "(removed)" tag. (§4.4) |
| 4 | Multiple trackers per challenge | **Capped at one** in v1; revisit in v3 if demand emerges. (§3.4) |
| 5 | Streak rule kind | **Ship in v1**; cheaper now than retrofitting. (§3.4) |
| 6 | Challenge end behavior | **Locked view-only for everyone** (including owner); owner can flip status back to active to make fixes. (§3.5) |
| 7 | Landing page | **No landing page**. Bare `/` redirects to recent challenge or `/new`. "Create new challenge" lives as a header affordance on every challenge page. (§6) |
| 8 | Owner password recovery | **No recovery.** Surfaced clearly at create time. Lose it = lose owner controls. (§4.3) |
| 9 | Rate limiting | **Two-layer**: 1-hour localStorage cooldown on challenge creation for UX, **Firebase App Check** for real abuse protection. No per-entry throttling. (§3.6) |
| 10 | Member name conflicts on rename | **Block** the rename, **suggest a numeric suffix** (e.g. "Bob 2") pre-filled in the input. Same logic on initial add. (§3.6) |

---

## 13. Out of scope for v2 (call out so we don't drift)

- Real auth / user accounts.
- Cloud Functions, push notifications, scheduled jobs.
- File/photo uploads (workout pics, weigh-in screenshots).
- Cross-challenge views ("my totals across all challenges I'm in").
- Social features beyond a single challenge (following users, public profiles).
- Importing v1 data (you confirmed nothing in flight).

These all become reasonable v3 candidates once v2 is real.

---

*Document status: decisions locked; ready to inform implementation. Update inline as new questions arise during build.*
