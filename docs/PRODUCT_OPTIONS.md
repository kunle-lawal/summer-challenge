# Product options and a recommended sequence

*Written September 2026, against the v2-redesign branch. Opinionated on purpose —
this is a recommendation with the reasoning exposed, not a menu. Where I'm
guessing, I say so.*

---

## Summary

The app works. The open question isn't which feature to build next — it's whether
two people will actually use it for nine weeks, and nobody has answered that yet.
**Phase 0 is running the challenge you already have.** Everything below is gated
on what that teaches you.

When you do build: three constraints decide most of it, and two of them are
things you can't engineer around.

---

## The three constraints

### 1. You cannot verify anything

Every rule in the app is a claim a person types about the physical world. The app
has no way to check any of it.

This is *the* constraint. It's easy to underrate because it isn't a bug and
nothing breaks — it just quietly caps how much the product can ever be worth,
because everything valuable downstream depends on the numbers meaning something.

Two data points for how bad it gets without verification:

- **Duolingo can watch you do the lesson** and still has a cheating epidemic —
  XP-farming bots, one user logging 45,000 XP in a week, leagues widely treated
  as meaningless.
- **Strava has GPS traces and an ML model weighing 57 signals**, and still deleted
  over four million fake activities — 2.3M e-bike rides and 1.6M car journeys
  logged as cycling.

Both have far more signal than a text box, and both got gamed. So:

> Public leaderboards, money stakes and sponsored challenges are all downstream
> of verification. Build any of them first and they'll be meaningless on launch
> day, and everyone will know.

**The answer isn't moderation, it's verification tiers.** Every entry carries how
it was established:

| Tier | How | Where it counts |
|---|---|---|
| **Self-reported** | Typed in | Private challenges between people who trust each other |
| **Attested** | Photo or a second member confirming | Private challenges with stakes |
| **Synced** | Read from HealthKit / Health Connect / Oura | Public leaderboards, money |

Show the tier on the entry. Let a challenge require a minimum tier per rule. This
one concept is what makes the whole social and money half of the product
possible, and it's why the native app matters more than it looks.

### 2. The automation door is closing, not opening

Researched September 2026. This is worse than most people assume:

| Source | Status | Verdict |
|---|---|---|
| **Apple Health** | No web API and no server-to-server API. Data stays on device | Impossible from a web app. Needs native, full stop |
| **iOS Screen Time** | Even a native app can't extract the numbers — readable only inside a sandboxed extension with no network access. Apple never shows developers the data | Effectively impossible. Drop it |
| **Fitbit Web API** | Being turned down **September 2026** | Dead |
| **Strava** | From 30 June 2026 needs an active $11.99/mo Strava subscription from the developer; Standard tier caps at 10 users | Viable, paid, tiny |
| **Oura** | OAuth2, 5,000 requests / 5 min | Works today |
| **Aggregators** (Terra, Rook, Junction) | ~$399/mo floor, and their Apple Health support is a *mobile SDK* because HealthKit needs on-device code anyway | Wrong price, and doesn't dodge the native requirement |

**Conclusion: steps-from-Apple-Health costs you a native app.** That's the real
price, and it's the same price whether you write HealthKit yourself or pay an
aggregator $399/mo to hand you an SDK that also needs a native app.

Don't design the product around auto-capture arriving cheaply. It won't.

### 3. In a group product, you can't gate participation

Charging for premium rule types doesn't work, and it's worth being precise about
why. You create a challenge using a paid rule; the other person is on free. Either:

- she can't join — the product is broken, or
- she joins but can't log that rule — the challenge is broken, or
- it works fine for her — the paywall doesn't exist.

There's no fourth option. This is why Kahoot, Zoom and Doodle charge the host.

> The paywall goes on **creating and administering**. Never on **participating**.

There's a second reason, which is that free participants *are* the acquisition
channel. Every person who joins someone else's challenge is a warm lead who has
used the product daily for eight weeks. Degrading their experience to convert
them is exactly backwards.

---

## Where the product is today

Worth stating plainly, because it's further along than it feels:

- **A working rule engine** with six kinds, streak qualifiers, counter overflow,
  weekly caps, free passes and per-member goal tracking. All plain JSON, no
  behaviour in the data — which makes it a genuinely good target for AI
  generation.
- **Thirteen tuned templates** across five focuses, each held to balance rules by
  test.
- **A balance linter — which already exists**, as assertions in
  `templates.test.ts`: no rule past a quarter of the ceiling, at least one free
  pass per week, no streak on a capped binary, no streak on a counter without
  full credit. It only runs at test time against hardcoded templates. Promoting
  it to a runtime `lintChallenge(config) → Diagnostic[]` is most of what's needed
  to trust generated challenges, and it would improve the manual editor too.
- **Free passes are already the single highest-value retention mechanic** you
  have. Duolingo's equivalent (Streak Freeze) cut churn 21% for at-risk users and
  lifts long-term retention 10%. The 1–2 per week rate is right.

What's missing is covered below.

---

## Phase 0 — Run the challenge. No code.

**Cost: zero. Do this first.**

There's a nine-week template that starts today and ends 15 November. Run it with
one other person.

The reason this comes first isn't diligence theatre. Every phase below is
expensive, and all of them assume a thing nobody has tested: that two people will
log something daily for nine weeks. Fitness apps have the steepest churn curve of
any consumer subscription category, D30 retention of 3.5–4%, and the single most
predictive churn signal is whether a habit forms in the **first two weeks**.

You'll learn more in fourteen days of real use than in a month of building. In
particular you'll find out:

- which rules get logged and which get quietly skipped
- whether the wizard is too slow at 11pm when you're tired
- whether free passes get spent, hoarded, or forgotten
- whether the leaderboard is motivating or demoralising when someone's ahead
- what you both wanted to track and couldn't

That last one is the requirements document for Phase 1, and right now it's
speculation.

---

## Phase 1 — Make the engine expressive

**Answers: can it say what people actually ask for?**
**Needs: nothing. Pure web work.**

### 1a. The four-axis remodel

Today each rule kind welds together four independent decisions:

| | binary | counter | tracker | streak |
|---|---|---|---|---|
| **input** — what you log | boolean | number | number | nothing |
| **window** — what it scores over | a day | a day | whole run | a run of days |
| **curve** — value → points | flat | linear | linear | flat |
| **basis** — measured against | fixed target | fixed target | your baseline | derived |

These are orthogonal, but the union treats every combination as its own kind. So
the kinds needed grow **multiplicatively**, and adding them one at a time never
catches up:

| Someone asks for | Which is | Possible today? |
|---|---|---|
| "who walks the most" | counter × others | Yes, since counter overflow landed |
| "3 gym sessions this week" | binary × **week** | No |
| "who loses the most weight" | tracker × **others** | **No — and not fixable with a new kind.** `tracker` scores progress ÷ *your own* goal, so it normalises the answer away. Two people with different targets both score 100% |
| "first 5k ever" | binary × **once** | No |
| "training for a 5k" | counter × **schedule** | No — every rule has one fixed target for the whole run |
| "who looks leanest" | **judged** | No — no concept of a subjective or voted outcome |

Separating the axes makes Quota, Contest, Milestone and "most weight lost" fall
out for free rather than being four more bespoke kinds. It's also a far better AI
target: four orthogonal choices beats a growing menu of special cases.

`Rule` stays the stored format, so existing documents migrate mechanically — the
union becomes a set of named presets *over* the axes rather than the primitive.

**Two things the remodel does not solve**, which need their own answers:

- **Progression.** A moving target ("week 1 run 2km, week 6 run 5km") is either a
  fifth axis or a property of the target. The 5k-training case is unreachable
  without it.
- **Judged outcomes.** A vote, an attestation, a verdict at the end. New input
  type plus a resolution flow.

### 1b. Promote the linter to runtime

`lintChallenge(config) → Diagnostic[]`, reusing the rules already in
`templates.test.ts`. Warnings in the rule editor, a gate on AI-generated
challenges. Cheap, and it's the difference between AI generation being a demo and
being trustworthy.

### 1c. Single-player

"Training for a 5k" has no opponent. If solo challenges are in scope it changes
more than the engine — the leaderboard, the podium and half of Home assume a
competitor. **Decide this before designing the remodel**, because it affects the
shape of `basis`.

---

## Phase 2 — Native, and with it verification

**Answers: can the numbers be trusted?**
**This is the keystone. Most of the rest depends on it.**

A Capacitor wrapper around the existing React app. Same codebase, ships to the
App Store. What it unlocks, roughly in value order:

1. **HealthKit + Health Connect** — steps, sleep, workouts, weight, read
   automatically. This *is* the verification tier, and it removes the biggest
   source of logging friction at the same time.
2. **Real push notifications** — web push works on iOS 16.4+ but only for an
   installed PWA, which almost nobody does.
3. **Camera** — photo proof as the log. Sweatmates and GymRats make a sweaty
   selfie *be* the entry; Forfeit has AI check the photo matches the claim.
   Lowest friction and highest proof at once.
4. **Live Activity / Dynamic Island** — "3 rules left, Ella is 12 ahead." Nobody
   in this category does this well, and it fits the product exactly.
5. **Home screen widget** with the streak.

Not worth chasing: **iOS Screen Time**. Even native, the data can't leave the
sandbox.

---

## Phase 3 — Social

**Answers: does it spread?**
**Gated on Phase 2. Building this before verification produces a leaderboard
everyone knows is fiction.**

Also gated on something the app doesn't have: **real accounts**. Identity today
is "pick a name on this device" with no authentication. Anything public needs
sign-in, moderation, anti-cheat and a privacy model. That's a substantial piece
of work in its own right and it should be costed separately.

### Transfers cleanly from the Duolingo model

- **Streaks** — 60% commitment lift; a streak wager gives +14% day-7 retention.
- **Streak freeze** — already shipped as free passes.
- **Leagues.** Worth noting Duolingo's leagues are *pseudonymous strangers matched
  by activity level*, not friends. The matchmaking is the trick: competition only
  motivates when it feels winnable. A friends-only leaderboard where one person
  is visibly fitter demotivates by week two.
- **Badges, profiles, celebration animations, notification personality** — all
  fine, all cheap, none load-bearing.

### Does not transfer, and would backfire

- **XP as a usage currency.** XP rewards app activity; here, app activity is
  *logging*. You'd be paying people to log, which pays people to lie.
- **Daily quests** ("earn 30 XP today"). You can't manufacture a gym session at
  11pm. A quest you can't complete on demand is a notification telling you you
  failed.
- **Hearts, and streak repair by purchase.** Buying back a streak here means
  buying a gym session you didn't do.

### Worth adding, not on anyone's list yet

- **Duo streak** — a *shared* streak that breaks if either person misses. Turns
  competition into mutual obligation; ideal for a two-person challenge.
- **Comeback mechanic** — the worst moment in the product is being 80 points down
  in week three. Something has to make the back half matter: a double-points
  week, a final contest, a catch-up handicap.
- **Rest days as first class.** A fitness app that scores a planned rest day as
  failure is wrong.
- **Recap / "Wrapped"** — a shareable end-of-challenge card. This is the actual
  growth loop; it's the thing that gets posted.
- **Challenge remix** — fork a public challenge's config and tweak it. Nearly
  free once challenges can be public, because the rule set is already plain JSON.

---

## Phase 4 — Money

**Answers: will anyone pay?**
**Gated on retention being real, which Phase 0 starts answering.**

### Recommended: the creator pays, everyone plays

One person pays to run a challenge; participants join free. It follows directly
from constraint 3, and it matches who's actually motivated — the organiser is the
one who wants it to happen.

Challenges are naturally episodic at 8–12 weeks, which suits a per-challenge or
per-season price better than a subscription. Free tier: one active challenge,
small group, core rules. Paid: larger groups, AI generation, verification tiers,
the recap.

### The B2B question, answered honestly

The market is real — $60–72B — but the **challenge platform slice is
commoditised** at $2–4.50 per employee per month. Incumbents (Limeade $4–10,
WellRight ~$8, Personify, Vitality) sell coaching, biometric screening, health
assessments and incentive administration. Challenges are a *feature* of their
product. To win enterprise you'd need SOC2, HR procurement, annual contracts and
RFPs, and you'd be building a different company where this engine is maybe 20% of
the surface area.

**But there's a wedge inside it**: gyms, run clubs, sports teams, small
companies. Self-serve, one organiser pays, no procurement, no security review.

Note what that is: **it's the creator-pays model with a bigger group.** Same
motion, same product, larger number. That's the version of "sell to companies"
worth chasing, because it doesn't fork the roadmap into two products.

### Consumer subscription — right eventually, wrong now

The category data flatters it: Health & Fitness leads every category at ~35–40%
trial-to-paid, with the highest lifetime revenue of any vertical at $35.64/yr
median. But freemium day-35 conversion is **2.1%** against 10.7% for a hard
paywall, fitness has the steepest churn curve of any consumer subscription
category with 40–60% cancelling by February, and D30 retention is 3.5–4%.

Subscription revenue is downstream of retention. It's a reward for solving
engagement, not a way to avoid solving it.

### Stakes and a rake — strong, later

DietBet and StepBet run a poker rake: the platform takes a cut of the pool and
never risks its own money. The legality argument is that participants control the
outcome, so it's skill rather than chance — contested, and varies by
jurisdiction. It drags in payments, KYC, payouts and chargebacks.

Most importantly, **money makes verification mandatory**. DietBet requires photo
weigh-ins with a code word for exactly this reason. Real business, gated on
Phase 2.

### Rejected

- **Gating loggable items** — constraint 3. Breaks the group.
- **Cosmetics** — no gameplay distortion, fine as a garnish, not a business.
- **Selling data** — it's health data. No.

---

## The sequence, in one table

| Phase | Question it answers | Cost | Gated on |
|---|---|---|---|
| **0. Run the challenge** | Will two people use this for nine weeks? | Zero | Nothing. Start now |
| **1. Engine + linter** | Can it express what people ask for? | Weeks, web only | Phase 0 findings |
| **2. Native + verification** | Can the numbers be trusted? | The big one | Phase 0 saying yes |
| **3. Social / public** | Does it spread? | Large — needs real accounts too | Phase 2 |
| **4. Money** | Will anyone pay? | Small to start | Retention being real |

Two through-lines worth keeping in view:

- **Verification is the keystone twice over** — it's what makes public
  leaderboards meaningful *and* what makes money-on-the-line possible.
- **Native is not a parallel track.** It's the enabling decision for
  verification, push, photo proof and Live Activities — which between them
  determine whether people log at all.

---

## What I'd do on Monday

Run the challenge. Log for two weeks. Write down every time the app annoyed you
and every time you wanted to track something you couldn't.

Then re-read Phase 1 with that list in hand, because half of it will probably be
wrong.

---

## Sources

Platform:
[Apple HealthKit limitations](https://www.themomentum.ai/blog/what-you-can-and-cant-do-with-apple-healthkit-data) ·
[HealthKit data access](https://openwearables.io/blog/apple-healthkit-api-what-data-you-can-access-and-how) ·
[Screen Time API reality](https://dev.to/nikki_eke/what-no-one-tells-you-about-building-with-apples-screen-time-api-3o98) ·
[Screen Time API issues](https://riedel.wtf/state-of-the-screen-time-api-2024/) ·
[Fitbit Web API sunset](https://openwearables.io/integrations/fitbit) ·
[Strava API pricing 2026](https://appsforstrava.com/blog/strava-developer-program-changes-2026) ·
[Strava rate limits](https://developers.strava.com/docs/rate-limits/) ·
[Oura API](https://cloud.ouraring.com/v2/docs) ·
[Terra pricing](https://tryterra.co/pricing) ·
[Wearables interoperability stack](https://healthapiguy.substack.com/p/the-wearables-interoperability-stack)

Engagement:
[Duolingo gamification tactics](https://www.strivecloud.io/blog/blog-gamification-examples-boost-user-retention-duolingo) ·
[Duolingo streaks mechanics](https://duolingo.deconstructoroffun.com/mechanics/streaks) ·
[Duolingo gamification secrets](https://www.orizon.co/blog/duolingos-gamification-secrets) ·
[Duolingo gaming principles](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth) ·
[Duolingo cheating problem (Kotaku)](https://kotaku.com/duolingo-app-cheats-hacks-leagues-xp-why-duohacker-1850506482) ·
[Duolingo cheating](https://screenshot-media.com/culture/gaming/duolingo-cheating-problem/) ·
[Strava deletes 4M activities](https://marathonhandbook.com/strava-deletes-over-4-million-cheating-activities/) ·
[Strava removes 2.3M rides](https://www.cyclingweekly.com/news/strava-removes-2-3-million-rides-from-leaderboards-in-clampdown-on-cheats) ·
[Strava AI anti-cheat](https://techcrunch.com/2024/05/16/strava-taps-ai-to-weed-out-leaderboard-cheats-unveils-family-plan-dark-mode-and-more) ·
[Habit statistics](https://habi.app/insights/habit-tracker-statistics/) ·
[Gamification in habit apps](https://guul.games/blog/gamification-in-habit-tracking-apps-examples-and-results) ·
[Group fitness challenge apps](https://habithuddle.com/blog/group-fitness-challenge-app) ·
[Forfeit](https://apps.apple.com/us/app/forfeit-habit-contracts/id1633125787)

Monetization:
[Corporate wellness platform market](https://www.businessresearchinsights.com/market-reports/corporate-wellness-platforms-market-128639) ·
[Wellness program cost per employee](https://avidonhealth.com/hr-people-operations/employee-wellness-program-cost/) ·
[Corporate wellness platforms compared](https://www.deskbreak.app/workplace-wellness-programs/corporate-platforms) ·
[Health & fitness subscription benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/) ·
[State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) ·
[Fitness app paywall benchmarks](https://www.rocketshiphq.com/paywall-optimization-fitness-apps/) ·
[Fitness app churn](https://retentioncheck.com/churn-benchmarks/fitness-apps) ·
[How DietBet makes money](https://fourweekmba.com/how-does-dietbet-make-money/) ·
[HealthyWage review](https://www.sidehustlenation.com/healthywage-review/) ·
[Wellness betting and gambling law](https://www.onlinecasinoselite.org/post/social-dieting-websites-legally-mimic-online-gambling)
