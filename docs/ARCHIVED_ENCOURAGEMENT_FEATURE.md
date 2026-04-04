# Archived feature: log-day encouragement (“For today”)

This document preserves the **Summer Challenge** feature that showed a contextual encouragement card on **`/log`** when the selected workout day was **calendar today**. It was removed from the shipping app but kept under **`archive/encouragement-feature/`** for reuse (similar in spirit to keeping the legacy HTML documented in [`LEGACY_INDEX_REFERENCE.md`](../LEGACY_INDEX_REFERENCE.md)).

---

## What it did

- **Placement:** [`LogDayPage`](../src/pages/LogDayPage.tsx) header, below the total-points banner.
- **Visibility:** Only when **`logDate === today()`** (past selectable days showed nothing).
- **Standings:** Used **`getTotals(entries, profiles)`** (workouts + personal goal), same as the leaderboard — anonymous copy (no names).
- **Lines:** Two lines — opening (lead vs chase + gap) and either a **saved-today** follow-up, a **workout-day tip** from **`calcPtsForLogDay`** (steps / gym / clean marginal), or a generic fallback.
- **Variation:** Random template indices per **full page load**; **`encouragementHistory`** avoided repeating the exact last message and maintained a **7–12** length window of compact template ids before resetting.
- **React Strict Mode:** Module-level session cache reused indices within the same visit so picks were not doubled.
- **Hide UI:** Eye button (`title="Hide"`) + **“Show encouragement”** when hidden; **`encouragePanelStorage`** persisted per **`personId`**. When hidden, **`buildTodayEncouragement` was not called**.

---

## Archived source files

All paths are relative to the repo root.

| Path | Purpose |
|------|---------|
| [`archive/encouragement-feature/logEncouragement.ts`](../archive/encouragement-feature/logEncouragement.ts) | Main API: **`buildTodayEncouragement`**, **`LogFormRowLike`**, **`TodayEncouragement`** |
| [`archive/encouragement-feature/encouragementCopy.ts`](../archive/encouragement-feature/encouragementCopy.ts) | Large phrase pools; **`encouragementPoolSizes`**; **`leadFirstLineAt`**, **`chaseFirstLineAt`**, **`workoutTipLineAt`**, etc. |
| [`archive/encouragement-feature/encouragementHistory.ts`](../archive/encouragement-feature/encouragementHistory.ts) | **`loadEncourageState`**, **`recordEncourageShown`**, **`saveEncourageState`** |
| [`archive/encouragement-feature/encouragePanelStorage.ts`](../archive/encouragement-feature/encouragePanelStorage.ts) | **`isEncouragementHidden`**, **`setEncouragementHidden`** |

Imports in those files assume they live next to **`src/lib/dates.ts`**, **`src/lib/scoring.ts`**, and **`src/types/`** (i.e. **`../types`** from `src/lib`).

---

## `localStorage` keys (if you restore)

| Key | Used by |
|-----|---------|
| `summer-challenge-encouragement-v1:{personId}:{YYYY-MM-DD}` | Message history / anti-repeat |
| `summer-challenge-log-encouragement-hidden` | JSON map **`personId → true`** when user hid the card |

---

## How to restore in the React app

1. Copy the four **`archive/encouragement-feature/*.ts`** files into **`src/lib/`** (overwrite if re-adding after edits).
2. Wire **`LogDayPage`** again:
   - Import **`buildTodayEncouragement`** from **`../lib/logEncouragement`**.
   - Import **`isEncouragementHidden`**, **`setEncouragementHidden`** from **`../lib/encouragePanelStorage`**.
   - Add **`useMemo`** calling **`buildTodayEncouragement({ entries, profiles, personId, logDate, formRow })`** when not hidden (match prior **`encourageHidden`** gating).
   - Re-add styled components for the gold card, header row, eye button, **Show encouragement** button, and **`EyeIcon`** SVG (see git history before removal if you want the exact UI).
3. Run **`npm run build`** and update **`docs/APP_REFERENCE.md`** to describe the feature again.

There is **no** `tsconfig` include for `archive/`; archived files are reference-only until copied into **`src/lib/`**.

---

## Dependencies (unchanged in current app)

- **`getTotals`**, **`calcPtsForLogDay`**, **`fmtPts`** from **`src/lib/scoring.ts`**
- **`today()`** from **`src/lib/dates.ts`**
- **`WorkoutEntry`**, **`ProfileData`** from **`src/types`**

The production app previously added **`sumWorkoutPtsByPerson`** for an earlier iteration of this feature; that helper was removed when this archive was created. If you need workout-only totals again, reintroduce it in **`scoring.ts`** or compute inside the encouragement module.

---

## Related

- [`archive/encouragement-feature/README.md`](../archive/encouragement-feature/README.md) — short index of the four files.
- [`docs/APP_REFERENCE.md`](APP_REFERENCE.md) — active app reference (this feature is not listed there while archived).
