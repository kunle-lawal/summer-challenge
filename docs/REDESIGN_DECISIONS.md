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

## Challenge templates

`src/lib/rules/templates.ts` replaces the create screen's three-way preset
segment with four described templates. Each carries its own suggested length,
so picking one sets the end date too.

| Template | Weeks | Ceiling | For |
|---|---|---|---|
| Lock In | 9 | 578 | The balanced default — gym, steps, sleep, food, two streaks, personal goal |
| Base Camp | 8 | 530 | Unpredictable schedules; consistency over intensity |
| Cut | 9 | 674 | A strict body-composition push where the personal goal decides it |
| Start empty | 9 | — | Build your own |

### Two constraints every template is tuned against

**Streaks fire on days where the watched rule scored above zero.** That makes a
streak on a **capped binary** break the instant the cap bites (a capped day
scores 0), and a streak on a **counter** free to farm (one logged step keeps it
alive). Base Camp's Move rule is deliberately uncapped for exactly this reason.
`templates.test.ts` rejects both shapes.

**Daily rules compound.** Over nine weeks a rule worth +2 a day is worth ~126
points, which quietly dwarfs anything weekly-capped. Every template is budgeted
so no single rule exceeds a quarter of its ceiling — with two people there is
nowhere to hide, and one metric shouldn't settle it. That's a test too, and it
fails if the numbers drift.

Every template also carries a tracker, so the result turns on who moved furthest
against their own starting point rather than who started fitter.

## The create screen was unreachable

`/new` could only be reached from the settings screen, which is behind the owner
password — and `/` redirects to your most recent challenge, so anyone who
already had one could not get to it at all. Starting a challenge is not an owner
action.

Added as a real `<Link>` (not a button with an onClick) at the foot of Home and
in the member picker, where someone who isn't on a roster lands.
