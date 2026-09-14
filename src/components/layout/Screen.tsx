import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Count } from '@/components/ui/feedback';
import { Meta, tnum } from '@/components/ui/primitives';

/**
 * Screen shell, ported from the design's `.screen` / `.body` / `.sheet`.
 *
 * The design is drawn at 390×844 and specifies no desktop variant, so rather
 * than inventing one the column is capped at `size.contentMax` and centred,
 * with the app background either side. Everything inside is fluid down to
 * 320px. See docs/REDESIGN_DECISIONS.md.
 */

export const Screen = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  max-width: ${({ theme }) => theme.size.contentMax};
  margin: 0 auto;
  background: ${({ theme }) => theme.color.bg};
  position: relative;

  @media (min-width: 520px) {
    border-left: 1px solid ${({ theme }) => theme.color.hair};
    border-right: 1px solid ${({ theme }) => theme.color.hair};
  }
`;

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.bg};
`;

/** The padded content column inside `Body`. Sections are separated by 22px. */
export const Sheet = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 18px 20px 26px;
`;

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

const TopBarWrap = styled.div<{ $center?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 8px;
  flex: 0 0 auto;

  > .tt {
    flex: 1;
    min-width: 0;
    text-align: ${({ $center }) => ($center ? 'center' : 'left')};

    > b {
      display: block;
      font-family: ${({ theme }) => theme.font.display};
      font-size: 16px;
      line-height: 22px;
      font-weight: 600;
      letter-spacing: -0.015em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    > ${Meta} {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

/** Keeps the title optically centred when there's no trailing control. */
const Spacer = styled.span`
  width: ${({ theme }) => theme.size.tap};
  flex: 0 0 auto;
`;

interface TopBarProps {
  title: ReactNode;
  sub?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  center?: boolean;
  className?: string;
}

export function TopBar({ title, sub, left, right, center, className }: TopBarProps) {
  return (
    <TopBarWrap $center={center} className={className}>
      {left ?? (center ? <Spacer aria-hidden="true" /> : null)}
      <div className="tt">
        <b>{title}</b>
        {sub && <Meta>{sub}</Meta>}
      </div>
      {right ?? <Spacer aria-hidden="true" />}
    </TopBarWrap>
  );
}

// ---------------------------------------------------------------------------
// Hero — the dark panel header
// ---------------------------------------------------------------------------

export const Hero = styled.header`
  background: ${({ theme }) => theme.color.panel};
  color: ${({ theme }) => theme.color.onPanel};
  padding: 0 20px 20px;
  position: relative;
  flex: 0 0 auto;

  ${Meta} { color: ${({ theme }) => theme.color.onPanel2}; }

  /* Focus needs 3:1 against what's behind it — ink would vanish here (§11). */
  :focus-visible { outline-color: ${({ theme }) => theme.color.onPanel}; }

  ${TopBarWrap} { padding: 16px 0 6px; }
`;

const ProgressWrap = styled.div`
  margin-top: 16px;

  > .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 7px;
    white-space: nowrap;

    > .lbl {
      font-size: 11px;
      line-height: 16px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${({ theme }) => theme.color.onPanel2};
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    > .v {
      font-family: ${({ theme }) => theme.font.display};
      font-size: 11px;
      line-height: 16px;
      font-weight: 600;
      color: ${({ theme }) => theme.color.onInk};
      flex: 0 0 auto;
      ${tnum}
    }
  }

  > .track {
    height: 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.14);
    overflow: hidden;

    > i {
      display: block;
      height: 100%;
      border-radius: 3px;
      background: ${({ theme }) => theme.color.accent};
      transition: width 0.7s ${({ theme }) => theme.ease.out};
    }
  }
`;

interface HeroProgressProps {
  /** The visible label. Say what the bar is measuring toward. */
  label: string;
  value: string;
  pct: number;
  /** Overrides the accessible name when `label` reads oddly out of context. */
  ariaLabel?: string;
}

export function HeroProgress({ label, value, pct, ariaLabel }: HeroProgressProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <ProgressWrap>
      <div className="hd">
        <span className="lbl">{label}</span>
        <span className="v">{value}</span>
      </div>
      <div
        className="track"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? label}
      >
        <i style={{ width: `${clamped}%` }} />
      </div>
    </ProgressWrap>
  );
}

// ---------------------------------------------------------------------------
// Hero stats
// ---------------------------------------------------------------------------

export const Stats = styled.div`
  display: flex;
  margin-top: 18px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
`;

const StatCell = styled.div<{ $hot?: boolean }>`
  flex: 1;
  min-width: 0;
  padding: 10px 12px 11px;
  background: rgba(255, 255, 255, 0.04);

  & + & { border-left: 1px solid rgba(255, 255, 255, 0.13); }

  > b {
    display: block;
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 600;
    font-size: 19px;
    line-height: 26px;
    letter-spacing: -0.025em;
    color: ${({ theme, $hot }) => ($hot ? theme.color.accentOnPanel : theme.color.onInk)};
    ${tnum}
  }

  > span {
    display: block;
    font-size: 10px;
    line-height: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.onPanel2};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

interface StatProps {
  value: number | string;
  unit?: string;
  caption: string;
  decimals?: number;
  hot?: boolean;
}

export function Stat({ value, unit, caption, decimals = 0, hot }: StatProps) {
  return (
    <StatCell $hot={hot}>
      <b>
        {typeof value === 'number' ? <Count value={value} decimals={decimals} /> : value}
        {unit}
      </b>
      <span>{caption}</span>
    </StatCell>
  );
}

// ---------------------------------------------------------------------------
// Sticky footer actions
// ---------------------------------------------------------------------------

export const FootBar = styled.div`
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  padding: 12px 20px calc(16px + env(safe-area-inset-bottom, 0px));
  background: ${({ theme }) => theme.color.surface};
  border-top: 1px solid ${({ theme }) => theme.color.hair};

  > button { flex: 1; }
  > button[data-secondary] { flex: 0 0 auto; min-width: 104px; }
`;

// ---------------------------------------------------------------------------
// "Logging as …" chip
// ---------------------------------------------------------------------------

export const WhoAmI = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 0 12px;
  min-height: ${({ theme }) => theme.size.tap};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.color.onPanel2};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;

  b { color: ${({ theme }) => theme.color.onInk}; font-weight: 600; }
  svg { width: 14px; height: 14px; stroke-width: 2; }

  &:hover { background: rgba(255, 255, 255, 0.13); color: ${({ theme }) => theme.color.onInk}; }
`;
