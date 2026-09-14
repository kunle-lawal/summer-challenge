# UI Design Standards

Read this before making any design change. These are industry baselines
drawn from WCAG 2.2, Apple's Human Interface Guidelines, Material Design
3, and Nielsen Norman Group research. They are not stylistic
preferences. Deviating from any of them requires a stated reason.

For Dalton web-app work, also read
`docs/specs/web-app-ui-foundations.md`. It records the approved product-specific
shell, navigation, People, Settings, and scrolling direction. That spec is
forward-looking and must not be mistaken for current implementation.

---

## 1. Layout and spacing

**Use an 8pt grid with 4pt subdivisions.** Every margin, padding, and
gap is a multiple of 8, or of 4 for fine intra-component spacing.
Material mandates this explicitly; Apple's output matches it by
convention. The point is that spacing decisions become automatic rather
than eyeballed.

Common values: 4, 8, 12, 16, 24, 32, 48.

**Internal spacing ≤ external spacing.** Padding inside a component
should be less than or equal to the gap between components. When
internal spacing exceeds external, elements appear to belong to the
wrong group.

**Spacing communicates grouping before borders do.** Elements placed
close together are read as related. Reach for spacing first. Add a
container — border, background, card — only when spacing alone fails.
NN/g is explicit that borders and backgrounds create visual clutter and
should be used sparingly.

**Never nest more than one level of container.** A card containing a
tinted block containing bordered inputs is three enclosures doing the
work of zero. If you find yourself nesting, the answer is spacing.

**Don't mix px and rem for spacing.** The 8pt grid works in absolute
units. Mixing rem — which scales with the user's root font size — with
fixed px produces unpredictable layouts when text is resized. Pick one
system.

---

## 2. Typography

**Body text on mobile: 16px minimum.** WCAG sets no absolute floor, but
16px is the established practical minimum for comfortable reading and
avoids iOS Safari's automatic zoom on input focus.

**Line height 1.5× for body, 1.2–1.3× for headings 24px and above.**
Round line heights to a multiple of 4 so baselines land on the grid,
even when the font size itself doesn't.

**Limit the type scale to 5–6 sizes.** More than that and the sizes stop
signalling anything. A workable ramp: 11, 12, 13, 15, 17, 22, 28.

**Establish hierarchy with size and weight before colour.** If two
elements are the same size and weight, colour alone will not reliably
tell a user which matters more.

**Avoid all-caps for anything longer than a short label.** It's the
least legible configuration available, and letterspaced micro-caps in
grey are the least legible version of that.

**Truncate with `min-width: 0` on flex children.** Text in a flex
container will not truncate without it. This is the single most common
cause of overflowing card layouts.

---

## 3. Colour

**Contrast minimums (WCAG 2.2 AA):**
- Body text: 4.5:1
- Large text (18pt+, or 14pt+ bold): 3:1
- UI component boundaries and states: 3:1
- Focus indicators: 3:1 against adjacent colours

**Never use colour as the sole carrier of meaning.** Pair it with text,
icon, position, or shape.

**One accent colour per screen region.** If the primary button, the
active border, and a status badge are all accented, none of them reads
as primary.

**Reserve the danger colour for confirmed destructive intent.** A red
Delete sitting permanently in a list is visual noise that trains people
to ignore red. Show it inside the menu or dialog where the action is
actually committed.

**Grey placeholder text on a light background usually fails 4.5:1.**
Check it. This is the most frequently missed contrast failure.

---

## 4. Touch targets and input

**Minimum sizes:**
- WCAG 2.2 SC 2.5.8 (AA): 24×24 CSS px, or smaller with sufficient
  spacing — imagine a 24px circle centred on each target; none may
  overlap
- Apple HIG: 44×44pt
- Material 3: 48×48dp
- **Build to 44×44 as the working minimum.** WCAG's 24px is a floor,
  not a target.

**The touch target is not the visible element.** A 16px icon reaches
44px through padding. Expand the hit area, not the glyph.

**8dp minimum between adjacent targets.** More for frequently used
controls.

**Every drag interaction needs a single-pointer alternative** (WCAG 2.2
SC 2.5.7). Drag-to-reorder must be paired with buttons, a menu, or
keyboard controls. Drag alone is a conformance failure.

**Use native input types.** Times, dates, and numbers get pickers, not
free text. This prevents an entire class of format error rather than
validating after the fact.

---

## 5. Forms

**Labels go outside the field, above it on mobile.** Always visible,
never disappearing on focus.

**Placeholder text is not a label.** NN/g's position is that
placeholders lower both usability and accessibility: the hint vanishes
exactly when the user needs it, fields containing text are less
noticeable as empty, users mistake placeholder text for a pre-filled
value, and screen reader support is inconsistent. Floating labels are
better than placeholder-as-label but still worse than a persistent
label outside the field.

**Never write "Optional" as placeholder text.** If a field is optional,
visual weight should say so. If weight can't say it, the field probably
shouldn't be visible by default.

**Match field width to expected input length.** A four-digit year does
not need a full-width field. Width is a format hint.

**Don't ask twice** (WCAG 2.2 SC 3.3.7). Information already provided in
a flow must be auto-populated or selectable, not re-entered.

**Prefill from context.** A form with sensible defaults and one
confirmation beats an empty form with fewer fields. When you can derive
a value from what the user has already done, derive it — and say where
it came from so it can be trusted or overridden.

**Validate on blur, not on keystroke.** Inline errors while typing
interrupt. State the problem, quantify the gap, and say what to do:
"Password is 6 characters. Add at least 2 more."

---

## 6. Information density and progressive disclosure

**Show essentials; put the rest one interaction away.** Categorise every
element on a screen as essential, useful, or rarely needed. Rarely
needed goes behind disclosure.

**Frequency determines permanence.** A control used by most people every
session is visible. A control used occasionally is one tap deep. A
destructive or irreversible control is two.

**Progressive disclosure is not hiding.** The affordance must remain
visible and must describe what it reveals. A dashed outline with a `+`
and a field name is disclosure; an unlabelled chevron is hiding.

**Hidden fields get filled less often.** Before demoting a field, check
whether the product depends on the data. If it does, keep it visible or
prompt for it.

**Every value appears exactly once.** Duplicated data is the most common
cause of bloated components and it is always a rendering bug, not a
design tradeoff.

**Compose lines by filtering, then joining.** `[a, b, c].filter(Boolean)
.join(' · ')`. Never concatenate with literal separators — that is what
produces dangling `·` when a value is absent.

**Don't print raw stored values.** Geocoder output, URLs, timestamps,
and IDs are storage formats. Derive display from them: an address
becomes a Map action, a URL becomes a link chip showing the bare domain,
a category becomes an icon colour.

---

## 7. Actions and reversibility

**Every destructive action needs a confirmation, an undo, or both.**
Undo is better. Confirmation dialogs get dismissed reflexively;
undo respects that people act faster than they read.

**Primary action right, secondary left,** in dialogs and footers. Follow
the platform convention rather than inventing one.

**Label buttons with the action, not a generic verb.** "Add item", not
"Submit". The label should complete "I want to…".

**Provide a visible exit from every state.** Cancel, back, close,
dismiss. Modes without exits trap people.

**Confirm before discarding user input.** Closing a partially filled
form without warning is data loss.

---

## 8. Modes and context

**Prefer editing in place over a covering surface.** A modal or sheet
that hides the surrounding content forces the user to hold that content
in working memory. When a decision depends on nearby information — a
time that depends on adjacent times, a value that depends on a list —
covering that information is a design error.

**If a covering surface is unavoidable, bring the needed context into
it,** and state it once. Repeating the same fact in three places is
worse than omitting it.

**Constrain expandable content to the viewport.** An inline editor that
grows taller than the screen has become a modal with extra steps. Set a
height budget before laying out, and treat it as binding.

**One expanded item at a time** in a list. Multiple simultaneous
expansions break layout and lose the user's place.

---

## 9. Feedback and state

**Every screen needs four states designed:** loading, empty, error, and
populated. Empty states are the most frequently skipped and the most
consequential for new users.

**Show system status immediately.** Any action taking more than ~100ms
needs a visible response.

**Preserve input across interruption.** Mobile app switching destroys
unsaved state. Persist drafts.

**Error messages state what happened, why, and what to do.** Never a
code. Never "Something went wrong."

---

## 10. Motion

**150–250ms for most transitions.** Faster feels broken; slower feels
sluggish.

**Ease-out for entrances, ease-in for exits.**

**Animate layout changes that would otherwise jump.** An element
expanding by 200px instantly reads as a page change, not an expansion.

**Respect `prefers-reduced-motion`.** Provide a non-animated path.

**Motion must never be the only feedback.** It's supplementary.

---

## 11. Accessibility baseline (WCAG 2.2 AA)

Beyond contrast and target size covered above:

- **Focus must be visible and unobscured** (SC 2.4.11). Sticky headers,
  toolbars, and overlays must not cover the focused element. Focus
  indicators need a 2px perimeter at 3:1 contrast.
- **Full keyboard operability.** Every action reachable and executable
  without a pointer, with no focus traps.
- **Logical focus order** matching visual order.
- **Semantic HTML first, ARIA second.** A `<button>` beats a `<div>`
  with a click handler and `role="button"`.
- **Accessible names on all icon-only controls.** A trash glyph with no
  name is announced as "button".
- **Decorative imagery is `aria-hidden`.** Don't make screen reader
  users listen to redundant icon descriptions.
- **Help stays in a consistent location** across screens (SC 3.2.6).

---

## 12. Anti-patterns

Do not ship any of these:

- The same value rendered more than once in a component
- Raw URLs, file paths, or geocoder strings as body text
- Placeholder text serving as the label
- "Optional" written in a placeholder
- A permanently visible, one-tap destructive action
- Three or more levels of nested containers
- Drag as the only reordering mechanism
- An expandable region that exceeds the viewport
- Free-text entry for dates, times, or durations
- A composed line with a dangling separator
- Category or status shown twice — once as colour, once as text
- More than one accent colour competing in a single region
- Buttons labelled "Submit"

---

## 13. Pre-flight checklist

Before considering a change complete:

- [ ] Every spacing value is a multiple of 4
- [ ] No value renders twice
- [ ] All text meets 4.5:1; large text and UI boundaries meet 3:1
- [ ] All interactive targets reach 44×44 including padding
- [ ] Removing any single data field produces no visual gap or orphaned
      separator
- [ ] Keyboard-only path works end to end, focus always visible
- [ ] Loading, empty, and error states exist
- [ ] Destructive actions are reversible or confirmed
- [ ] Layout survives the longest realistic content without overflow
- [ ] Layout survives 200% text zoom
- [ ] Every drag has a non-drag alternative
- [ ] Tested at 390px width
