/**
 * Design tokens — ported from the Claude Design handoff (`docs/challenge 2/project/styles.css`).
 *
 * Warm neutrals, ink-coloured primary actions, coral accent, 8pt grid.
 *
 * Two deliberate departures from the prototype's CSS, both recorded in
 * `docs/REDESIGN_DECISIONS.md`:
 *   - `ink3` is darkened from #8e8f97 (3.2:1 on white — fails WCAG AA) to
 *     #6e6f78 (4.95:1). It carries real text: labels, ranks, secondary values.
 *   - `ink4` is new, and is the only token allowed on decorative marks that
 *     carry no meaning.
 */

export interface ToneColors {
  /** Tile background. */
  bg: string;
  /** Glyph colour on that background. */
  ink: string;
}

/** Pastel tile tones. Assigned to rules by kind — see `lib/rules/ruleLook.ts`. */
export const TONE_NAMES = ['sky', 'lav', 'peach', 'mint', 'sand', 'rose'] as const;
export type ToneName = (typeof TONE_NAMES)[number];

export interface AppTheme {
  color: {
    // ── Surfaces ──────────────────────────────────────────────────────────
    /** App background behind every scrolling surface. */
    bg: string;
    /** Pressed / hover wash, one step darker than `bg`. */
    bg2: string;
    /** Card and raised-surface fill. */
    surface: string;
    /** Tinted card fill — one step off white, still reads as a card. */
    surface2: string;
    /** Hairline borders. */
    hair: string;
    /** Hairline on hover, and any border that must clear 3:1. */
    hair2: string;
    /** Faintest divider, for dividing rows inside one card. */
    hair3: string;

    // ── Dark panel (hero header) ──────────────────────────────────────────
    panel: string;
    panel2: string;
    onPanel: string;
    onPanel2: string;

    // ── Ink ───────────────────────────────────────────────────────────────
    /** Primary text, and the fill of primary buttons. */
    ink: string;
    /** Secondary text. 5.9:1 on surface. */
    ink2: string;
    /** Labels, ranks, muted values. 4.95:1 on surface. */
    ink3: string;
    /** Decorative only — never text that carries meaning. */
    ink4: string;

    // ── Accent ────────────────────────────────────────────────────────────
    accent: string;
    /** Accent darkened for text and hover; clears 4.5:1 on surface. */
    accentDeep: string;
    /** Accent wash for selected rows and pills. */
    accentSoft: string;
    /** Border that pairs with `accentSoft`. */
    accentLine: string;
    /** Text on a solid `accent` fill. */
    accentInk: string;

    // ── Semantic ──────────────────────────────────────────────────────────
    good: string;
    goodSoft: string;
    goodLine: string;
    bad: string;
    badSoft: string;
    badLine: string;
    gold: string;

    // ── Legacy aliases ────────────────────────────────────────────────────
    // Kept so un-ported components keep compiling and pick up the new palette
    // for free. Removed in the final phase once nothing references them.
    /** @deprecated use `accentSoft` */
    accentTint: string;
    /** @deprecated use `goodSoft` */
    goodTint: string;
    /** @deprecated use `badSoft` */
    badTint: string;
  };
  tone: Record<ToneName, ToneColors>;
  font: {
    display: string;
    body: string;
    /** Tabular figures. Same family as body — `font-variant-numeric` does the work. */
    mono: string;
  };
  radii: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    pill: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
  ease: {
    out: string;
    spring: string;
  };
  size: {
    base: string;
    padScreen: string;
    /** Every interactive target is at least this tall. */
    tap: string;
    /** The phone-width column the design is drawn at. */
    contentMax: string;
  };
}

const display = '"Sora", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
const body = '"Plus Jakarta Sans", system-ui, -apple-system, "Helvetica Neue", sans-serif';

export const appTheme: AppTheme = {
  color: {
    bg: '#f4f2ee',
    bg2: '#ebe8e1',
    surface: '#ffffff',
    surface2: '#faf9f6',
    hair: '#e4e1da',
    hair2: '#d7d3ca',
    hair3: '#efece6',

    panel: '#1b1c21',
    panel2: '#26272d',
    onPanel: '#f7f6f3',
    onPanel2: '#a2a3a9',

    ink: '#17181c',
    ink2: '#63646c',
    ink3: '#6e6f78',
    ink4: '#a9aab2',

    accent: '#cf5230',
    accentDeep: '#b34523',
    accentSoft: '#fbeae3',
    accentLine: '#f2d6c9',
    accentInk: '#ffffff',

    good: '#2f6b4f',
    goodSoft: '#e8f1eb',
    goodLine: '#cfe2d7',
    bad: '#a83226',
    badSoft: '#fbeae8',
    badLine: '#e7c4bf',
    gold: '#8a6d1f',

    accentTint: '#fbeae3',
    goodTint: '#e8f1eb',
    badTint: '#fbeae8',
  },
  tone: {
    sky: { bg: '#e4eaf2', ink: '#33486f' },
    lav: { bg: '#eae6f2', ink: '#4a3e6b' },
    peach: { bg: '#f8e6da', ink: '#82441f' },
    mint: { bg: '#e3eee7', ink: '#2f5c46' },
    sand: { bg: '#f5ecd8', ink: '#69541f' },
    rose: { bg: '#f6e3e6', ink: '#833944' },
  },
  font: { display, body, mono: body },
  radii: {
    xs: '8px',
    sm: '10px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    pill: '999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(23,24,28,.04)',
    md: '0 8px 24px -14px rgba(23,24,28,.28)',
    lg: '0 24px 48px -20px rgba(23,24,28,.34)',
  },
  ease: {
    out: 'cubic-bezier(.2,.8,.3,1)',
    spring: 'cubic-bezier(.34,1.2,.64,1)',
  },
  size: {
    base: '15px',
    padScreen: '20px',
    tap: '44px',
    contentMax: '480px',
  },
};
