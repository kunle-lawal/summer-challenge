# v2 redesign — decision log

Source design: `docs/challenge 2/` (Claude Design handoff bundle).
Standards applied: `docs/ui-design-patterns.md`.

## Confirmed with the owner before the build

| Question | Decision |
|---|---|
| Log style | Step wizard (`LogSteps`), batch save via one `upsertEntry` call |
| Landing route | Home at `/c/:slug`; nav = Home · Board · History · Rules |
| Free passes | Spendable in the wizard, remaining count always visible |
| Desktop | No sidebar variant; phone-first layout, responsive up |
| Public leaderboard toggle | Dropped (Firestore read is unconditionally public) |
| Same-day edits toggle | Dropped |
| Invites | "Add member" types a name; no invite links, no self-join |
| Slug | Stays a random 6-char secret, not name-derived |
| Tracker goal | Stays per-member (`member.trackerConfig`) |
| Admin features | All existing capabilities preserved, restyled |
| Git | Branch `v2-redesign`, one commit per phase, local only |

## Calls made without asking

1. **Tracker goal setup flow** — the design has none. Added as a first-time step
   inside the log wizard, shown when the member has no `trackerConfig` for the
   tracker rule.
2. **Old components deleted** rather than kept alongside. Git preserves them.
3. **Rule identity by `kind`, not `id`.** The prototype hardcodes six rule ids
   (`gym`/`steps`/`sleep`/`junk`/`streak`/`weight`) for icons, tones and copy.
   Real rules are user-defined, so tone + icon key off `rule.kind` (the six kinds
   map 1:1 onto the six prototype rules). `rule.emoji` overrides when set.
4. **Contrast fix**: design's `--ink3` `#8e8f97` is 3.2:1 on white and fails
   WCAG AA. Darkened to `#6e6f78` (4.95:1).
5. **Touch targets** raised to the 44px working minimum. The design ships
   `.iconbtn` 42, `.chip` 42, `.seg button` 40, `.switch` 28.
6. **Micro-caps tamed**: kept for short section labels, dropped for content,
   tracking reduced `.09em` → `.06em`. `docs/ui-design-patterns.md` §2 calls
   letterspaced grey micro-caps the least legible configuration available.
7. **Body stays 15px** per the design (doc §2 asks 16px); inputs are forced to
   16px on mobile, which is the substantive reason behind that rule.
8. **Render smoke tests** via `react-dom/server`, no new dependency.

## Divergences from the prototype, and why

| Prototype | Shipped | Reason |
|---|---|---|
| `chal.ly/autumn-challenge` vanity slug | random 6-char slug | Slug is the only access secret; a guessable slug with public read is a security regression |
| Start/goal on the tracker *rule* | per-member `trackerConfig` | Goals are personal; the rule only carries `maxPoints`/`unit`/`decimals` |
| Two-way binary/penalty inputs | three-way incl. free pass | Prototype references free passes but gives no way to spend one |
| Counter scores uncapped | caps at `maxPoints` | Prototype's `scoring.js` is a simplification; the real engine is correct |
| History = audit feed | History = editable day list | Per the design. Audit viewer already lives in `/admin`, so nothing is lost |

## Notes logged during the build

### Free passes were already in the engine

`evaluate.ts` has scored `'free'` for binary and penalty rules since v2, and
`isFreePassExhausted` / `countFreePassesUsed` / `buildWeeklySummary().freePassUsage`
were all already there. The only thing missing was a way to *spend* one — the
gap was entirely in the UI. Added `getFreePassState()` alongside the existing
counters rather than a new module.

It takes an `excludeDate` because re-opening a day you already spent a pass on
must not count that pass against the balance you're allowed to spend *on that
day* — otherwise the number shown drops by one every time you revisit the day.

### Turning a rule off does not erase its history

`aggregateMember` recomputes every entry from its raw values; nothing reads the
`pts` snapshotted on the entry doc. So scoring deliberately ignores
`rule.active`: an inactive rule disappears from the log and from Today, but the
values already logged keep scoring exactly as before.

Making scoring honour the flag would have retroactively voided a rule's entire
contribution to the leaderboard the moment an owner toggled it — a destructive
surprise, and the opposite of the design's own promise that "edits apply from
today forward; past points never change".

That also makes the change UI-only, with no risk to the scoring engine.

### The challenge name had no write path

`updateChallengeConfig` only ever wrote the `config` sub-object, so the name —
documented as owner-editable — could not actually be edited. Added
`renameChallenge`. The slug deliberately does not follow the name.

### The prototype's rank animation overlaps at 200% zoom

`board.jsx` animates leaderboard reorders by absolutely positioning each row at
`index * 66px` inside a fixed-height container. That holds only while every row
is exactly 66px, and at 200% text zoom they aren't — the rows land on top of one
another. `ui-design-patterns.md` §13 requires the layout to survive that zoom, so
the standings are a normal list and the reorder isn't animated. A FLIP
implementation would restore it, if it turns out to be missed.

### Spacing follows the design, not the 8pt grid

§1 asks for multiples of 8 (or 4). The design's own CSS uses 6, 10, 14, 18 and
22px throughout, consistently. Reproducing it faithfully was the brief, the
rhythm is internally coherent, and nothing here harms anyone — so the design's
values are kept rather than silently regularised. Noting it because §1 asks for
deviations to be stated.

### Rows had no hover state when rendered as links

`Row`'s interactive styles were gated on `&:is(button)`. Home's leaderboard peek,
the History day list and the standings all render rows as `<Link>`, so they were
`<a>` elements getting no hover, no pointer cursor and no active state. Widened
to `&:is(button, a)`.

### Bugs found in existing code along the way

- `RuleEditor`'s delete button called `onClose` instead of `onDelete`, so
  deleting a rule silently did nothing. Gone in the rewrite.
- `setTrackerConfig` wrote its audit row as `member.rename` with a comment noting
  it was the closest available action. Added `member.tracker_config`.
- `updateChallengeConfig` only ever wrote `config`, so `Challenge.name` —
  documented as owner-editable — had no write path.
- `ErrorBoundary` showed "Something went wrong" plus the raw exception, which
  §9 names explicitly as the thing not to ship.

## Verification

Every commit on this branch typechecks and passes the full suite. Final state:

- `tsc --noEmit` clean
- 269 tests passing (199 inherited, 70 added)
- `vite build` succeeds
- dev server boots; every page module transforms without error
- zero hardcoded colour literals outside `src/theme/`
- no icon-only control without an accessible name; no `div` with a click handler

Not verified, for want of a browser driver in this repo: actual pixel rendering,
real-device touch behaviour, and the 200% zoom and 390px cases as rendered rather
than as reasoned about.

## Streak qualifiers

`StreakRule.qualifier` decides what counts as a day toward a streak:

- `'positive'` (default, and what every existing streak keeps) — the watched
  rule scored above zero.
- `'full'` — the watched rule earned everything it can award that day.

This exists because a streak watching a **counter** was farmable: any value
above zero scores, so a single logged step held a step streak open forever.
`'full'` makes the day have to hit the target. Binary rules were never
farmable — "No" scores zero and breaks the run — so nothing changes there.

A free pass still counts as a full day. Holding a run together is what passes
are for.

The predicate lives once, in `kinds.ts` as `qualifiesForStreak`, because two
places decide streak days — `computeStreakBonuses` for the leaderboard and
`getStreakRunAtDate` for the pips on the log. They previously each carried their
own `points > 0` check; if only one had learned about qualifiers, the log would
have shown a run the board refused to pay for.

The rule editor now warns when a streak watches a counter on `'positive'`, and
when it watches a capped binary at all.

## Counters that keep paying past the target

`CounterRule.overflow` is `'cap'` (default, and what every existing counter
keeps doing) or `'linear'`, where points carry on scaling at the same rate —
double the target is double the points. `dailyMax` puts a lid on a single day;
null means none at all.

Two interactions worth knowing:

- **`maxDailyPoints` still returns the points at target**, not the day's
  ceiling. A streak wanting `qualifier: 'full'` therefore still means "hit the
  target" — against an unbounded counter, anything else would be unsatisfiable,
  because there is no highest day.
- **No shipped template uses it.** An overflow counter's ceiling sits far above
  what anyone would realistically do every day, so it blows the
  no-rule-past-a-quarter budget by construction. That is the point of the
  option, not a flaw in it — but it makes it a tool for a custom challenge
  rather than something to bake into a balanced one. There's a test enforcing
  that templates stay bounded.

## Challenge templates

`src/lib/rules/templates.ts` replaces the create screen's three-way preset
segment with thirteen described templates plus an empty one, grouped by focus.
Each carries its own suggested length, so picking one sets the end date too.

| Focus | Templates |
|---|---|
| Balanced | Lock In · Base Camp · Winter Arc |
| Body composition | Cut · Recomp · Lean Season |
| Endurance | Run Club · Marathon Build |
| Habits & recovery | Reset · Clean Slate · Desk Job |
| Mind | Deep Work · Whole Person |

### What every template is held to, by test

- **No single rule past a quarter of the ceiling.** Daily rules compound — +2 a
  day is 140 points over ten weeks, which quietly dwarfs anything weekly-capped.
  With two players there is nowhere to hide and one metric shouldn't settle it.
  Four templates failed this on first write and were retuned.
- **At least one free pass per week** on anything that can cost points, and
  roughly two a week on the easygoing ones.
- **No streak on a capped binary** (a capped day scores zero, so the run breaks
  every time the cap bites), and **no streak on a counter without
  `qualifier: 'full'`**.
- **A personal goal in every one**, so the result turns on who moved furthest
  from their own starting point rather than who started fitter.

### Numbers are computed, not written down

`ceilingOf` and `passSummary` derive the figures on each card from the rules
themselves. They were hand-written at first and had already drifted — one card
claimed 13 free passes where the rules handed out 14.

## The create screen was unreachable

`/new` could only be reached from the settings screen, which is behind the owner
password — and `/` redirects to your most recent challenge, so anyone who
already had one could not get to it at all. Starting a challenge is not an owner
action.

Added as a real `<Link>` (not a button with an onClick) at the foot of Home and
in the member picker, where someone who isn't on a roster lands.

---

# v3 — real accounts

## What was wrong

The v2 ruleset had no identity in it at all. `allow read: if true` on a
wildcard document path grants `list` as well as `get`, so the whole challenges
collection was enumerable and the six-character slug protected nothing. On top
of that, every write path was shape-validated but not authorised:

| | Consequence |
|---|---|
| `challenges/{id}` world-writable | Overwrite `ownerPasswordHash` and own somebody else's challenge |
| `slugIndex/{slug}` world-writable | Repoint a live link at a challenge you control |
| `entries` world-writable | Log days as anyone; overwrite one with `{}` to wipe it, despite deletes being denied |
| `members` world-writable | Rename or deactivate anyone |
| `auditLog` world-writable | Forge the only accountability record the app has |

The owner password was never a lock. The hash was world-readable *and*
world-writable, so it could simply be replaced.

## The shape of the fix

Three invariants:

1. Nothing is readable or writable without `request.auth`.
2. `list` is denied on every collection, which restores the slug to being a
   real secret.
3. Authority comes from two lookups a rule can actually perform —
   `challenges/{cid}.ownerUid` for admin, and the existence of
   `challenges/{cid}/membership/{uid}` for membership.

Point 3 is why membership is a uid-keyed document rather than a field. A
security rule can `get()` a document by id but cannot *query* a collection, so
"is this account a member?" has to be answerable at a predictable path.

## What that removed

The owner password is gone entirely — `ownerAuth.ts`, `AdminModeContext`, the
password gate screen, the per-tab session, and the password field on the create
form. Ownership is `challenge.ownerUid === user.uid`, which the rules check
independently. Hiding a control and refusing the write are now the same
decision rather than two that can disagree.

## Claiming is deliberately idempotent

Joining writes two documents — the membership record and the member slot — and
they can land in either order, or one can fail. So a slot is claimable when
nobody holds it *or* when you already do, and rewriting an identical claim is
permitted. A client that retries blindly succeeds instead of wedging.

The rules tests caught this: the first version required `uid == null`, which
made claiming work in exactly one order and left a half-finished join
unrecoverable.

## The quota moved somewhere it can't be cleared

The create cooldown lived in `localStorage`, so clearing site data reset it.
The counter now lives on `users/{uid}`, which only that account can write, and
the rules permit it to move by at most one and never downward.

## Verification

`npm run test:rules` starts the emulator and runs 67 tests written as the
attacks they prevent rather than by collection — every `describe` heading in
`firestore.rules.test.ts` was possible before this change.

`firebase.json` now exists, so the rules in this repo actually deploy. They
previously did not, and there was no way to tell whether the file matched what
was live.

## Still to do before this is genuinely production-ready

- **App Check is wired but off.** It needs `VITE_RECAPTCHA_SITE_KEY` and a
  console registration. Enforcement must not be switched on until the metrics
  show verified requests dominating, or every client on an older bundle breaks.
- **Sign in with Apple is written but disabled** (`APPLE_ENABLED`). It needs an
  Apple Developer account, a Services ID and a key. Apple only *requires* it
  once an iOS app offers another social login, so it can wait for the native
  build.
- **TTL for abandoned challenges** — no retention policy exists yet.
- **The quota is written but not enforced** — the rules protect the counter;
  nothing reads it yet at create time.
