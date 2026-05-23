import type { SVGAttributes } from 'react';

type IconProps = SVGAttributes<SVGElement>;

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const HomeIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>;
export const LogIcon = (p: IconProps) => <svg {...base} {...p}><path d="M5 12.5 10 17 19 7"/></svg>;
export const BoardIcon = (p: IconProps) => <svg {...base} {...p}><path d="M6 21V11"/><path d="M12 21V5"/><path d="M18 21v-7"/></svg>;
export const HistoryIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
export const PlusIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 5v14M5 12h14"/></svg>;
export const GearIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>;
export const SearchIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/></svg>;
export const ArrowIcon = (p: IconProps) => <svg {...base} {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>;
export const ChevRightIcon = (p: IconProps) => <svg {...base} {...p}><path d="m9 6 6 6-6 6"/></svg>;
export const ChevDownIcon = (p: IconProps) => <svg {...base} {...p}><path d="m6 9 6 6 6-6"/></svg>;
export const CheckIcon = (p: IconProps) => <svg {...base} {...p}><path d="M5 12.5 10 17 19 7"/></svg>;
export const XIcon = (p: IconProps) => <svg {...base} {...p}><path d="M6 6l12 12M18 6l-12 12"/></svg>;
export const LockIcon = (p: IconProps) => <svg {...base} {...p}><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
export const StarIcon = (p: IconProps) => <svg {...base} {...p}><path d="m12 3 2.6 5.6L20 9.4l-4 4 1 5.6L12 16.3 7 19l1-5.6-4-4 5.4-.8Z"/></svg>;
export const ShareIcon = (p: IconProps) => <svg {...base} {...p}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>;
export const CopyIcon = (p: IconProps) => <svg {...base} {...p}><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>;
export const FlameIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-1-3 3-6Z"/></svg>;
export const TrophyIcon = (p: IconProps) => <svg {...base} {...p}><path d="M8 4h8v6a4 4 0 0 1-8 0Z"/><path d="M5 5h3v3a3 3 0 0 1-3-3ZM19 5h-3v3a3 3 0 0 0 3-3Z"/><path d="M10 14h4v3l1 3H9l1-3Z"/></svg>;
