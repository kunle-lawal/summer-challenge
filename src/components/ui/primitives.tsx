import styled, { css, keyframes } from 'styled-components';

/**
 * Shared UI kit, ported from the design bundle's `styles.css`.
 *
 * Every interactive element here clears 44×44 (`docs/ui-design-patterns.md` §4).
 * The design ships several controls below that — `.iconbtn` 42, `.chip` 42,
 * `.seg button` 40, `.switch` 28 — and those are raised here, with the visible
 * element left at the drawn size where the hit area can grow around it instead.
 */

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Tabular figures. Any number that sits in a column or animates needs this. */
export const tnum = css`
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
`;

export const Num = styled.span`
  ${tnum}
`;

/**
 * Short section label. Never used for content — see REDESIGN_DECISIONS.md;
 * the design's `.label` is 11px uppercase at .09em in grey, which
 * `ui-design-patterns.md` §2 calls the least legible configuration available.
 * Kept for 1–3 word structural labels only, darkened, tracking eased to .06em.
 */
export const Label = styled.span`
  display: block;
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

export const Meta = styled.span`
  font-size: 13px;
  line-height: 19px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.ink2};
`;

export const Hint = styled.span`
  font-size: 13px;
  line-height: 19px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.ink2};
  text-wrap: pretty;
`;

export const ErrorText = styled.span`
  font-size: 13px;
  line-height: 19px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.bad};
`;

export const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export type ButtonTone = 'ink' | 'ghost' | 'accent' | 'danger';

const buttonTone = {
  ink: css`
    background: ${({ theme }) => theme.color.ink};
    border-color: ${({ theme }) => theme.color.ink};
    color: ${({ theme }) => theme.color.onInk};
    &:hover:not(:disabled) { background: ${({ theme }) => theme.color.panel2}; border-color: ${({ theme }) => theme.color.panel2}; }
    &:active:not(:disabled) { background: ${({ theme }) => theme.color.inkPress}; border-color: ${({ theme }) => theme.color.inkPress}; }
  `,
  ghost: css`
    background: ${({ theme }) => theme.color.surface};
    border-color: ${({ theme }) => theme.color.hair};
    color: ${({ theme }) => theme.color.ink};
    &:hover:not(:disabled) { background: ${({ theme }) => theme.color.surface2}; border-color: ${({ theme }) => theme.color.hair2}; }
    &:active:not(:disabled) { background: ${({ theme }) => theme.color.hair3}; }
  `,
  accent: css`
    background: ${({ theme }) => theme.color.accent};
    border-color: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accentInk};
    &:hover:not(:disabled) { background: ${({ theme }) => theme.color.accentDeep}; border-color: ${({ theme }) => theme.color.accentDeep}; }
  `,
  danger: css`
    background: ${({ theme }) => theme.color.surface};
    border-color: ${({ theme }) => theme.color.badLine};
    color: ${({ theme }) => theme.color.bad};
    &:hover:not(:disabled) { background: ${({ theme }) => theme.color.badSoft}; border-color: ${({ theme }) => theme.color.badLineHover}; }
  `,
} as const;

export const Button = styled.button<{ $tone?: ButtonTone; $block?: boolean; $sm?: boolean }>`
  min-height: ${({ $sm }) => ($sm ? '44px' : '52px')};
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.font.body};
  font-weight: 600;
  font-size: ${({ $sm }) => ($sm ? '14px' : '15px')};
  line-height: 22px;
  display: ${({ $block }) => ($block ? 'flex' : 'inline-flex')};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.16s ${({ theme }) => theme.ease.out}, border-color 0.16s, color 0.16s;
  ${({ $tone = 'ink' }) => buttonTone[$tone]}

  /* Renders as an <a> where it navigates; keep it looking like a button. */
  &:hover { text-decoration: none; }

  svg {
    width: 17px;
    height: 17px;
    stroke-width: 2;
    flex-shrink: 0;
  }

  &:disabled {
    background: ${({ theme }) => theme.color.hair3};
    border-color: ${({ theme }) => theme.color.hair};
    color: ${({ theme }) => theme.color.ink4};
    cursor: not-allowed;
  }
`;

export const LinkButton = styled.button`
  min-height: ${({ theme }) => theme.size.tap};
  padding: 0 10px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.accentDeep};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.xs};
  transition: background 0.16s, color 0.16s;

  &:hover { background: ${({ theme }) => theme.color.accentSoft}; }
`;

/**
 * Icon-only control. The glyph stays at the design's 19px; the hit area is
 * padded out to 44 rather than the visible box being grown — §4.
 */
export const IconButton = styled.button<{ $onPanel?: boolean }>`
  width: ${({ theme }) => theme.size.tap};
  height: ${({ theme }) => theme.size.tap};
  flex: 0 0 auto;
  border: 1px solid ${({ theme, $onPanel }) => ($onPanel ? 'rgba(255,255,255,.14)' : theme.color.hair)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $onPanel }) => ($onPanel ? 'rgba(255,255,255,.08)' : theme.color.surface)};
  color: ${({ theme, $onPanel }) => ($onPanel ? theme.color.onPanel : theme.color.ink)};
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.16s ${({ theme }) => theme.ease.out}, border-color 0.16s;

  &:hover {
    background: ${({ theme, $onPanel }) => ($onPanel ? 'rgba(255,255,255,.15)' : theme.color.surface2)};
    border-color: ${({ theme, $onPanel }) => ($onPanel ? 'rgba(255,255,255,.22)' : theme.color.hair2)};
  }
  &:active { background: ${({ theme, $onPanel }) => ($onPanel ? 'rgba(255,255,255,.2)' : theme.color.hair3)}; }

  svg { width: 19px; height: 19px; }
`;

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export const Card = styled.div<{ $tint?: boolean; $sunk?: boolean }>`
  background: ${({ theme, $tint, $sunk }) =>
    $sunk ? theme.color.bg : $tint ? theme.color.surface2 : theme.color.surface};
  border: 1px solid ${({ theme, $sunk }) => ($sunk ? theme.color.hair3 : theme.color.hair)};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 16px;
`;

export const Pill = styled.span<{ $tone?: 'plain' | 'accent' | 'good' | 'flat' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: 7px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink2};
  white-space: nowrap;
  ${tnum}

  ${({ $tone, theme }) => $tone === 'accent' && css`
    background: ${theme.color.accentSoft};
    border-color: ${theme.color.accentLine};
    color: ${theme.color.accentDeep};
  `}
  ${({ $tone, theme }) => $tone === 'good' && css`
    background: ${theme.color.goodSoft};
    border-color: ${theme.color.goodLine};
    color: ${theme.color.good};
  `}
  ${({ $tone, theme }) => $tone === 'flat' && css`
    background: ${theme.color.hair3};
    border-color: transparent;
  `}
`;

export const Sep = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.hair};
`;

export const Note = styled.p`
  border: 1px solid ${({ theme }) => theme.color.hair};
  background: ${({ theme }) => theme.color.surface2};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.ink2};
`;

// ---------------------------------------------------------------------------
// Sections and lists
// ---------------------------------------------------------------------------

export const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;

  > ${Meta} { white-space: nowrap; flex: 0 0 auto; }
`;

export const List = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap = 6 }) => $gap}px;
`;

/**
 * Name block inside a Row. `min-width: 0` is what makes the text truncate
 * instead of overflowing the row — §2, the single most common cause of
 * broken card layouts.
 */
export const Name = styled.span`
  flex: 1;
  min-width: 0;
  display: block;

  b {
    display: block;
    font-weight: 600;
    font-size: 15px;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  ${Meta} {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const Row = styled.div<{ $you?: boolean; $lead?: boolean; $off?: boolean; $bare?: boolean }>`
  width: 100%;
  text-align: left;
  border: 1px solid ${({ theme }) => theme.color.hair};
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 14px;
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;

  > svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    color: ${({ theme }) => theme.color.ink3};
  }

  ${({ $bare }) => $bare && css`background: none; border-color: transparent;`}
  ${({ $lead, theme }) => $lead && css`background: ${theme.color.surface2};`}
  ${({ $you, theme }) => $you && css`
    background: ${theme.color.accentSoft};
    border-color: ${theme.color.accentLine};
  `}
  ${({ $off }) => $off && css`opacity: 0.55;`}

  /* Rows render as button, a, or div depending on what they do. */
  &:is(button, a) {
    cursor: pointer;
    text-decoration: none;
    font-weight: 400;
    transition: background 0.16s ${({ theme }) => theme.ease.out}, border-color 0.16s;

    &:hover {
      background: ${({ theme, $you }) => ($you ? theme.color.accentSoftHover : theme.color.surface2)};
      border-color: ${({ theme, $you }) => ($you ? theme.color.accentLine : theme.color.hair2)};
    }
    &:active { background: ${({ theme }) => theme.color.hair3}; }
  }
`;

/** Rank number in a standings row. */
export const Rank = styled.span<{ $first?: boolean }>`
  width: 22px;
  text-align: center;
  font-family: ${({ theme }) => theme.font.display};
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme, $first }) => ($first ? theme.color.accent : theme.color.ink3)};
  flex: 0 0 auto;
  ${tnum}
`;

/** Points value at the end of a row. */
export const Points = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-weight: 600;
  font-size: 15px;
  line-height: 22px;
  flex: 0 0 auto;
  letter-spacing: -0.02em;
  ${tnum}
`;

export const Tick = styled.span<{ $done?: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  background: ${({ theme, $done }) => ($done ? theme.color.ink : theme.color.surface)};
  border: 1px solid ${({ theme, $done }) => ($done ? theme.color.ink : theme.color.hair)};
  color: ${({ theme, $done }) => ($done ? theme.color.onInk : theme.color.ink3)};
  transition: background 0.18s ${({ theme }) => theme.ease.out}, border-color 0.18s, color 0.18s;

  svg { width: 14px; height: 14px; stroke-width: 2.4; }
`;

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;

  /* Labels sit above the field and stay visible — §5. Placeholders are
     never used as labels anywhere in this app. */
  > label {
    font-size: 11px;
    line-height: 16px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.ink3};
  }
`;

export const Input = styled.input<{ $text?: boolean; $w?: 'sm' | 'md' }>`
  min-height: 50px;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  padding: 0 14px;
  width: 100%;
  transition: border-color 0.16s, box-shadow 0.16s;
  ${tnum}

  font-family: ${({ theme, $text }) => ($text ? theme.font.body : theme.font.display)};
  font-size: ${({ $text }) => ($text ? '15px' : '18px')};
  font-weight: ${({ $text }) => ($text ? 500 : 600)};
  letter-spacing: ${({ $text }) => ($text ? '0' : '-0.01em')};

  /* Width is a format hint — a 4-digit year doesn't need a full-width box. §5 */
  max-width: ${({ $w }) => ($w === 'sm' ? '132px' : $w === 'md' ? '200px' : 'none')};

  &:focus {
    border-color: ${({ theme }) => theme.color.ink};
    box-shadow: 0 0 0 3px rgba(23, 24, 28, 0.08);
    outline: 0;
  }
`;

export const Select = styled(Input).attrs({ as: 'select' })`
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  padding-right: 44px;
  background-image:
    linear-gradient(45deg, transparent 50%, ${({ theme }) => theme.color.ink2} 50%),
    linear-gradient(135deg, ${({ theme }) => theme.color.ink2} 50%, transparent 50%);
  background-position: calc(100% - 20px) 22px, calc(100% - 14px) 22px;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
`;

export const Choices = styled.div`
  display: flex;
  gap: 8px;
`;

export const Choice = styled.button`
  flex: 1;
  min-width: 0;
  min-height: 74px;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: 0 14px;
  font-weight: 600;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s, border-color 0.16s, color 0.16s;

  small {
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.ink2};
  }

  &:hover { background: ${({ theme }) => theme.color.surface2}; border-color: ${({ theme }) => theme.color.hair2}; }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.color.ink};
    border-color: ${({ theme }) => theme.color.ink};
    color: ${({ theme }) => theme.color.onInk};
    small { color: ${({ theme }) => theme.color.onInk2}; }
  }
`;

export const Chips = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const Chip = styled.button`
  min-height: ${({ theme }) => theme.size.tap};
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.surface};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.16s, border-color 0.16s, color 0.16s;
  ${tnum}

  &:hover { background: ${({ theme }) => theme.color.surface2}; border-color: ${({ theme }) => theme.color.hair2}; }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.color.ink};
    border-color: ${({ theme }) => theme.color.ink};
    color: ${({ theme }) => theme.color.onInk};
  }
`;

export const Segmented = styled.div`
  display: flex;
  gap: 2px;
  padding: 3px;
  background: ${({ theme }) => theme.color.hair3};
  border-radius: ${({ theme }) => theme.radii.md};

  button {
    flex: 1;
    min-height: ${({ theme }) => theme.size.tap};
    border: 0;
    border-radius: 8px;
    background: none;
    font-weight: 600;
    font-size: 14px;
    color: ${({ theme }) => theme.color.ink2};
    cursor: pointer;
    transition: background 0.18s, color 0.18s;

    &:hover { color: ${({ theme }) => theme.color.ink}; }

    &[aria-pressed='true'] {
      background: ${({ theme }) => theme.color.surface};
      color: ${({ theme }) => theme.color.ink};
      box-shadow: ${({ theme }) => theme.shadow.sm};
    }
  }
`;

/**
 * The visible track stays the design's 48×28; the button pads out to a 44px
 * hit area around it, so the control is thumb-sized without looking heavier.
 */
export const Switch = styled.button`
  width: 48px;
  min-height: ${({ theme }) => theme.size.tap};
  border: 0;
  background: none;
  padding: 0;
  position: relative;
  cursor: pointer;
  flex: 0 0 auto;
  display: grid;
  place-items: center;

  &::before {
    content: '';
    width: 48px;
    height: 28px;
    border-radius: 14px;
    background: ${({ theme }) => theme.color.hair2};
    transition: background 0.18s;
  }

  &::after {
    content: '';
    position: absolute;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.onInk};
    box-shadow: 0 1px 2px rgba(23, 24, 28, 0.2);
    transition: transform 0.22s ${({ theme }) => theme.ease.out};
  }

  &[aria-checked='true']::before { background: ${({ theme }) => theme.color.ink}; }
  &[aria-checked='true']::after { transform: translateX(20px); }
`;

export const Stepper = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.color.hair};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  button {
    width: 48px;
    min-height: 48px;
    border: 0;
    background: none;
    color: ${({ theme }) => theme.color.ink2};
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.16s, color 0.16s;

    &:hover { background: ${({ theme }) => theme.color.surface2}; color: ${({ theme }) => theme.color.ink}; }
    svg { width: 18px; height: 18px; stroke-width: 2.2; }
  }

  output {
    flex: 1;
    text-align: center;
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 600;
    font-size: 18px;
    letter-spacing: -0.02em;
    ${tnum}
  }
`;

/**
 * Disclosure affordance for adding an item. Visible and labelled with what it
 * reveals — §6 draws the line between disclosure and hiding right here.
 */
export const AddRow = styled.button`
  width: 100%;
  min-height: 52px;
  border: 1px dashed ${({ theme }) => theme.color.hair2};
  border-radius: ${({ theme }) => theme.radii.md};
  background: none;
  color: ${({ theme }) => theme.color.ink2};
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.16s, border-color 0.16s, color 0.16s;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
    border-color: ${({ theme }) => theme.color.ink3};
    color: ${({ theme }) => theme.color.ink};
  }

  svg { width: 17px; height: 17px; stroke-width: 2; }
`;

// ---------------------------------------------------------------------------
// Meters
// ---------------------------------------------------------------------------

export const Track = styled.div<{ $thin?: boolean }>`
  height: ${({ $thin }) => ($thin ? '4px' : '6px')};
  border-radius: 3px;
  background: ${({ theme }) => theme.color.hair3};
  overflow: hidden;

  > i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: ${({ theme }) => theme.color.ink};
    transition: width 0.6s ${({ theme }) => theme.ease.out};
  }
`;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const enterAnim = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;

export const slideInAnim = keyframes`
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: none; }
`;

export const riseAnim = keyframes`
  from { transform: translateY(18px); opacity: 0; }
  to { transform: none; opacity: 1; }
`;

export const fadeAnim = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

/** Staggered entrance. Motion is never the only feedback — §10. */
export const Enter = styled.div<{ $delay?: number }>`
  animation: ${enterAnim} 0.3s ${({ theme }) => theme.ease.out} both;
  animation-delay: ${({ $delay = 0 }) => $delay}ms;
`;

export const Skeleton = styled.div<{ $h?: number }>`
  height: ${({ $h = 60 }) => $h}px;
  background: ${({ theme }) => theme.color.hair3};
  border-radius: ${({ theme }) => theme.radii.md};
  animation: ${pulseAnim} 1.5s ease-in-out infinite;
`;
