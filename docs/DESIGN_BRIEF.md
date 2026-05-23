# Summer Challenge v2 — Design Brief

A brief for designing the visual and interaction direction of v2. Send this to your designer alongside the low-fi mockup. For deeper product/technical decisions, see `V2_PLAN.md` — but the designer shouldn't need it.

---

## TL;DR

We're rebuilding a friend-group habit/fitness challenge app from scratch. Anyone can spin up a public challenge with a custom rule set, share the URL with friends, and start logging. There are no accounts — identity is "pick which name in this challenge is you." Mobile-first.

The previous version was a single hardcoded challenge with a dense, desktop-style log page that crammed five things on one screen. v2 needs to feel **immediately understandable** to someone arriving via a friend's shared link, and **rewarding to come back to every day**.

Tone reference: take **Duolingo's intuitiveness and warmth** + **Strava's data pride and granularity**. Avoid the "corporate wellness platform" feeling.

---

## What this app is

A small, opinionated tool for **friend groups of ~5–20 people** to run shared habit or fitness challenges over a fixed period (typically 30–90 days). The classic use case: six friends commit to a "summer challenge" with rules like "gym 4×/week, 10k steps/day, no junk food, hit your weight goal." Points accrue, a leaderboard ranks everyone, the group has bragging rights at the end.

In v2, anyone can create one of these challenges in under a minute, configure their own rules, and share a single URL with friends. Each challenge is its own self-contained world.

### What it is NOT

- Not a serious fitness app — no workout libraries, no form coaching, no calorie databases.
- Not a social network — no follows, no comments, no public feeds.
- Not a habit tracker for individuals — the social element is the whole point.
- Not gamified to the point of feeling juvenile — adults are using this.

---

## Who it's for

- **Primary user:** an adult in a friend group (work crew, college friends, fitness buddies) who proposed a group challenge and wants to organize it.
- **Secondary user:** the friends they invite — joining via link, picking their name, logging.
- **Tertiary "owner" role:** the creator gets a password that unlocks admin actions (add/remove members, edit config).

Identity model that affects design:
- No accounts, no sign-up, no profile photos.
- A user "picks their name" on first visit; that selection is cached locally.
- The same person can be in many challenges simultaneously, with a different name in each.
- The challenge URL is the only "credential." Anyone with the link can view and log for anyone.

---

## Design references

**Reach for these:**

| Reference | What to borrow |
|-----------|----------------|
| Duolingo | Intuitive tap targets, celebratory moments, friendly empty states, clarity over cleverness, daily-streak as motivator |
| Strava | Pride in numbers, dense activity feeds, leaderboards that feel earned, clean typographic hierarchy |
| Letterboxd | Personality without being childish, opinionated visual identity, dense info presented elegantly |
| Linear | Restraint, keyboard-feel polish (we're web but this should still inform interactions) |

**Avoid:**

- Generic corporate wellness aesthetics (rounded squircles, pastel teal/coral, stock-photo "active lifestyle" energy).
- Over-gamified UIs with XP bars, badges everywhere, level-up animations.
- AI-default purple-gradient-on-white with Inter as the only font.
- Anything that would feel out of place on the phone of a 35-year-old in a group chat called "Gym Bros 2026."

---

## Design principles

1. **Mobile-first.** Design at 380px width. Desktop is "mobile-but-wider," not a separate experience. Bottom nav over top tabs on mobile.
2. **One thing per screen.** v1's biggest failure: the Log page mixed five concerns. Split aggressively. Date picker on its own. Rule logging on its own. History on its own.
3. **The data is the design.** Numbers, dates, names, ranks — these are the content. Frame them generously instead of decorating around them.
4. **Friendly, never patronizing.** This is for adults. No "Great job, champ!" copy. Tone is closer to a smart, slightly dry friend than a coach.
5. **Reward consistency, don't shame absence.** Celebrate streaks; never make missed days feel bad. The app should be a place people *want* to return to, not one that nags.
6. **Easy to enter, easy to share.** Creating a challenge is one decision-rich screen, not a 7-step wizard. Sharing is a single tap, single URL.
7. **Owner controls are present but quiet.** Most users never see admin surfaces. They should be discoverable but not in the way.

---

## What's intentionally undesigned (your call)

The mockup that accompanies this brief is **deliberately grayscale and uses a generic font**. We have made no commitments on:

- **Color palette.** No brand colors yet. Pick a direction that fits the references.
- **Typography.** Pick something with personality — display + body pairing. Avoid Inter, Roboto, generic system fonts.
- **Iconography.** Use a real icon set with character (Phosphor, Tabler, Lucide, custom). No generic Material defaults.
- **Illustration style.** If you want empty-state illustrations or a mascot, propose it.
- **Animations.** We have moments where they'd land (logging completion, streak milestone, leaderboard rank-up). Propose where they should live.
- **Dark mode.** Required for v1 or v2-first? Your call — argue for a stance.

What we HAVE committed to (do not reopen these):

- Mobile-first.
- No sign-up screens of any kind.
- No standalone landing page — bare `/` redirects to a recent challenge or `/new`.
- Tab nav at the bottom on mobile.

---

## The screens

Grouped by user role. Bold = must-design-now; italic = secondary, can wait.

### Entry surfaces

**Create Challenge wizard** — three logical steps, ideally one scroll on mobile rather than a multi-page flow:
1. Name & dates (challenge name, start date, optional end date, timezone)
2. Rules (pick a preset: Classic / Minimal / Custom; tune each rule)
3. Owner password & first members (set password, add 2–8 starter members)

End state: share screen with the URL and a copy button. Tap "View challenge" to enter.

**Challenge Home (`/c/:slug`)** — the front door. Shown when someone clicks a shared link.
- Challenge name, dates, current week number.
- "You are: [member name]" or "Pick yourself" CTA if no member cached.
- A big "Log today" CTA (or "Already logged ✓" state).
- Top 3 podium peek (linked → full leaderboard).
- Member count, days remaining.
- Footer: "Create your own challenge" affordance (always present, never primary).

**Pick Member** — full-screen, no chrome. Vertical list of member buttons with initials. Tapping → cached + redirect to Log.

### Daily / core surfaces

**Log Day** — the most important screen. Spec in §"Log Day in detail" below.

**Leaderboard** — ranked table of all active members. v1 inspiration was a podium on top + table below; v2 should rethink. Key data per row: rank, name, total points, days logged, per-rule breakdown (expandable?). Dense but readable on 380px width.

**History** — event log of every entry across all members, newest first. Each row: who, what, when, points earned. Filterable by member and rule. Paginated.

**_Member profile (`/c/:slug/m/:id`)_** — drill-in from any member's name. Their total, their per-rule breakdown, their entry history, their streak status, their tracker progress.

### Admin surfaces

**_Admin landing (`/c/:slug/admin`)_** — password gate. After unlock: settings home with three cards: Members, Rules & Dates, Audit Log.

**_Member management_** — list of all members (active + removed), add/remove/rename actions, conflict-resolution UI when a rename collides.

**_Config editor_** — edit dates, edit rules, add/remove rules. This is the most complex admin screen — needs careful thought. Each rule type has different config fields.

**_Audit log viewer_** — chronological log of every state-changing action. Filterable by action type and actor. Each entry shows: who, what action, before → after diff.

---

## Log Day in detail

This is the screen people see every day. Get this right and the rest follows.

### What's on it

- A **date selector** at the top. Most days that's just "Today" — but the user can scroll back up to ~30 days to log retroactively (we have an edit window of "today + yesterday" for normal users).
- A **stack of rule cards** — one per rule the challenge has configured. Each card shows: rule name, the user's current value (if logged), the points earned, and an input for changing it.
- A **save state** per card or a single save at the bottom. Designer's call which feels right.
- A **week-summary indicator** — current week number, week's caps used (e.g. "Gym: 3/4 this week").
- A **lifetime free-pass indicator** — for rules with free-pass quotas, show remaining.
- A **today's points banner** — what the user earned today.

### Rule card variants — six types, consistent shell, different inputs

| Rule kind | Real-world example | Input pattern |
|-----------|-------------------|---------------|
| Binary | "Went to gym?" | Three buttons: Yes / No / ★ Free pass |
| Counter | "Steps today" | Number input + progress toward target (e.g. 7,200 / 10,000) |
| Range | "Hours of sleep" | Number input + range hint (7–9) |
| Penalty | "Ate junk?" | Three buttons: Clean / Slipped / ★ Free pass |
| Streak | "7-day clean streak" | Derived — no input, just shows status (4/7 days, or "✓ Earned!") |
| Tracker | "Weight" | Number input + per-member goal progress bar (start → today → goal) |

The shell — name, current value, points, edit state — should feel identical across all six. The input area is the differentiator.

### States to design

For every card:
- **Empty** — never logged for this day, prompts for input.
- **Logged & editable** — entry exists, today/yesterday, can be tapped to edit. Shows "edit window closes [time]."
- **Logged & locked** — entry exists, >1 day old, no edits possible.
- **Free pass used** — visually distinct so the user knows.
- **Capped** — the rule hit its weekly cap; points earned are 0 with explanation.
- **Penalty waived** — first infraction of the week, scored as 0 with explanation.

For the whole screen:
- **Ended challenge** — read-only, banner explaining the challenge has ended, all inputs disabled.
- **Pre-start challenge** — challenge hasn't begun yet, banner with countdown.
- **No rules configured** — edge case, prompts owner to add rules.

### Edit window UI

When an entry is editable (today or yesterday), surface that. When the window is closing soon, surface that more clearly. When it's locked, the card should feel locked — not just disabled but visually distinct (subtler color, lock icon, "logged at 9:24 PM" timestamp instead of an input).

---

## Patterns to invent

These appear on multiple screens; designing them once is worth careful thought:

1. **Member identity badge** — name + initials, no avatars in v1. Used in leaderboard, history rows, member profile header, log card byline.
2. **Rule card shell** (described above).
3. **Date chip / picker** — used on Log Day; mobile-friendly horizontal scroll.
4. **Bottom navigation** — primary mobile nav. ~4–5 items max.
5. **"Owned by you" indicator** — when the cached selected member matches the entry owner, subtle visual cue.
6. **Empty states** — new challenge with no entries, no members yet, search-with-no-results in History. Each should feel intentional, not blank.
7. **Celebration moments** — completing a daily log, hitting a streak day, reaching a tracker goal, owner finishing the create flow. Propose what these feel like.
8. **Toast / inline feedback** — when an action succeeds (logged, saved, copied URL). v1 had nothing here; v2 should be considered.

---

## Key flows to design end-to-end

Walk these from first tap to completion. If any screen in a flow feels weak, that's where to focus.

### Flow 1 — I'm the creator

1. Open `/new`
2. Fill out wizard (name, dates, rules, password, first members)
3. Land on share screen
4. Copy URL, paste into group chat
5. Open the challenge as a participant (pick myself, log my first day)

### Flow 2 — I'm a friend who got the link

1. Tap the link in group chat → land on Challenge Home
2. "Pick yourself" → see member list → tap my name
3. Land on Challenge Home now showing "You are: Sarah"
4. Tap "Log today" → fill in rules → save
5. Tap "Leaderboard" to see where I stand

### Flow 3 — Daily return

1. Open the app (it remembers me + the challenge)
2. Land on Challenge Home
3. Tap "Log today"
4. Fill 3–5 rule cards in <30 seconds
5. See updated totals + maybe a celebration moment
6. Glance at leaderboard, close app

### Flow 4 — Owner manages members

1. Open challenge → tap settings/gear
2. Enter password → land on admin home
3. Tap Members → see list → add new member ("Jenna")
4. "Jenna" already exists → see conflict prompt with suggestion ("Jenna 2")
5. Accept suggestion → added.

### Flow 5 — Challenge ends

1. End date hits → status flips to `ended`.
2. Anyone visiting sees a banner at top of Challenge Home: "This challenge ended on May 20. Final standings below."
3. Log Day shows a locked state — no inputs work.
4. Leaderboard and History remain fully browsable.

---

## What's NOT in scope

So you don't waste time designing things we don't need:

- Login / signup screens (no auth).
- Profile photo upload, avatar customization (initials only).
- Push notifications, email digests.
- Social features: following, commenting, reacting, sharing to social networks.
- Cross-challenge views (no "my totals across all challenges").
- A standalone landing page (`/` is a redirect).
- Onboarding tour / coach marks.
- Photo upload with workout entries.
- Workout libraries / how-to content.

---

## Open design questions (your call to argue)

The brief is opinionated about IA and tone; it is silent on aesthetics. Push back on any of these in your direction proposal:

1. **Color palette** — any direction that fits the references. Suggest 2–3 candidate moods.
2. **Type pairing** — display + body. Personality, please.
3. **Mascot or motif?** — Strava has the "K" logo; Duolingo has Duo. Does v2 want anything?
4. **Light or dark default?** — and is dark mode required for v1?
5. **Empty-state strategy** — illustrations, photography, text, or animated states?
6. **Where animation lives** — propose 2–3 key moments and leave the rest still.
7. **Density posture** — Strava is dense; Duolingo is roomy. We're between. How far in either direction?
8. **Member badges** — initials in a colored chip is the obvious move. Anything more interesting available without avatars?

---

## Companion files

- **`V2_PLAN.md`** — full product/technical plan. Source of truth on product decisions. Probably more than you need.
- **`lowfi-mockup.html`** — accompanying low-fidelity wireframe of the major screens. Open in a browser at desktop width to see all screens at once; the frames themselves are mobile-sized.

The mockup is **intentionally undesigned**. Anything you see there that looks like an aesthetic decision (font, color, spacing rhythm) is a placeholder, not a constraint. The structure, content, and component shapes are the actual signal.

---

*If anything here conflicts with V2_PLAN.md, this brief loses — V2_PLAN is the canonical product spec. But flag the conflict so we update both.*
