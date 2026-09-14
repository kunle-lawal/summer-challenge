import type { SVGAttributes } from 'react';

/**
 * Single icon set, ported from the design bundle's `ui.jsx` ICONS map.
 *
 * Glyphs are 24×24, stroked with `currentColor`, and never carry meaning on
 * their own — every icon-only control also has an accessible name, and every
 * decorative icon is `aria-hidden`. See `docs/ui-design-patterns.md` §11.
 */

export type IconName =
  | 'home' | 'board' | 'history' | 'rules' | 'log'
  | 'plus' | 'minus' | 'check' | 'close' | 'back' | 'next' | 'down' | 'up'
  | 'user' | 'users' | 'gear' | 'more' | 'edit' | 'trash' | 'lock' | 'share'
  | 'copy' | 'cal' | 'clock' | 'flame' | 'target' | 'bolt' | 'star' | 'trophy'
  | 'dumbbell' | 'walk' | 'moon' | 'bowl' | 'scale' | 'search' | 'undo' | 'alert';

const PATHS: Record<IconName, JSX.Element> = {
  home: <><path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M10 21v-6h4v6" /></>,
  board: <path d="M5 20V11M12 20V4M19 20v-7" />,
  history: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.4l3 1.8" /></>,
  rules: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 10h7M9 14h7M9 18h4" /></>,
  log: <path d="M5 13l4 4L19 7" />,

  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 13l4 4L19 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M14 6l-6 6 6 6" />,
  next: <path d="M10 6l6 6-6 6" />,
  down: <path d="M6 10l6 6 6-6" />,
  up: <path d="M6 14l6-6 6 6" />,

  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21c0-3.6 3.1-6 7-6s7 2.4 7 6" /></>,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3 2.7-5.2 6-5.2S15 17 15 20" /><path d="M16 5.6a3.4 3.4 0 0 1 0 6.6M18 14.8c1.9.6 3 2.3 3 4.2" /></>,
  gear: <><path d="M4 8h10M18 8h2M4 16h4M12 16h8" /><circle cx="16" cy="8" r="2.2" /><circle cx="10" cy="16" r="2.2" /></>,
  more: <><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>,
  edit: <><path d="M4 20h4l11-11-4-4L4 16z" /><path d="M14 5l4 4" /></>,
  trash: <><path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.4" /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></>,
  share: <><path d="M12 16V4M8 8l4-4 4 4" /><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 5H6a1 1 0 0 0-1 1v9" /></>,
  cal: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 11h16" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.4l3 1.8" /></>,

  flame: <path d="M12 3s5 4.3 5 9a5 5 0 0 1-10 0c0-2 1-3.4 1-3.4S8 11 9.6 11C11 11 12 9.6 12 8c0-1.8 0-5 0-5z" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" /></>,
  bolt: <path d="M13 3L6 13h4.5L10 21l7-10h-4.5z" />,
  star: <path d="m12 3 2.6 5.6L20 9.4l-4 4 1 5.6L12 16.3 7 19l1-5.6-4-4 5.4-.8z" />,
  trophy: <><path d="M8 4h8v6a4 4 0 0 1-8 0z" /><path d="M5 5h3v3a3 3 0 0 1-3-3zM19 5h-3v3a3 3 0 0 0 3-3z" /><path d="M10 14h4v3l1 3H9l1-3z" /></>,

  dumbbell: <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />,
  walk: <><circle cx="13" cy="4.6" r="1.8" /><path d="M11 21l1.6-5.4L10 13l1-5 3 2 2.6.8M11 13l-2.4 3M14.6 15.6L16 21" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4A8.6 8.6 0 1 0 20 14.5z" />,
  bowl: <><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M3 20h18" /><path d="M12 8c-1.4-1.6.6-2.8 0-4" /></>,
  scale: <><path d="M12 4v3M5.5 20h13" /><path d="M8 7h8l3 8a4.6 4.6 0 0 1-14 0z" /></>,

  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></>,
  undo: <><path d="M4 9h11a5 5 0 0 1 0 10h-6" /><path d="M8 5L4 9l4 4" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.2v.3" /></>,
};

interface IconProps extends SVGAttributes<SVGElement> {
  name: IconName;
}

/**
 * Decorative by default. Pass `aria-hidden={false}` plus a `<title>` only when
 * the icon is the sole carrier of meaning — which it should never be.
 */
export function Icon({ name, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Legacy named exports
// ---------------------------------------------------------------------------
// Derived from the map above so there is exactly one copy of every path.
// Deleted in the final phase, once no page imports them.

type Bare = Omit<IconProps, 'name'>;
const named = (name: IconName) => (p: Bare) => <Icon name={name} {...p} />;

/** @deprecated use `<Icon name="home" />` */
export const HomeIcon = named('home');
/** @deprecated use `<Icon name="log" />` */
export const LogIcon = named('log');
/** @deprecated use `<Icon name="board" />` */
export const BoardIcon = named('board');
/** @deprecated use `<Icon name="history" />` */
export const HistoryIcon = named('history');
/** @deprecated use `<Icon name="plus" />` */
export const PlusIcon = named('plus');
/** @deprecated use `<Icon name="gear" />` */
export const GearIcon = named('gear');
/** @deprecated use `<Icon name="search" />` */
export const SearchIcon = named('search');
/** @deprecated use `<Icon name="back" />` */
export const ArrowIcon = named('back');
/** @deprecated use `<Icon name="next" />` */
export const ChevRightIcon = named('next');
/** @deprecated use `<Icon name="down" />` */
export const ChevDownIcon = named('down');
/** @deprecated use `<Icon name="check" />` */
export const CheckIcon = named('check');
/** @deprecated use `<Icon name="close" />` */
export const XIcon = named('close');
/** @deprecated use `<Icon name="lock" />` */
export const LockIcon = named('lock');
/** @deprecated use `<Icon name="star" />` */
export const StarIcon = named('star');
/** @deprecated use `<Icon name="share" />` */
export const ShareIcon = named('share');
/** @deprecated use `<Icon name="copy" />` */
export const CopyIcon = named('copy');
/** @deprecated use `<Icon name="flame" />` */
export const FlameIcon = named('flame');
/** @deprecated use `<Icon name="trophy" />` */
export const TrophyIcon = named('trophy');
