import { useEffect, useRef, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { Button, LinkButton, fadeAnim, riseAnim, tnum } from './primitives';

/**
 * Feedback and status components: animated figures, modal, toast, empty state.
 *
 * Every screen needs loading, empty, error and populated designed (§9); the
 * empty and error states live here so no page has to invent its own.
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Animated number
// ---------------------------------------------------------------------------

function useCountUp(value: number, ms = 800, from = 0): number {
  const [n, setN] = useState(() => (prefersReducedMotion() ? value : from));
  const current = useRef(n);
  current.current = n;

  useEffect(() => {
    if (prefersReducedMotion()) {
      setN(value);
      return;
    }
    const start = performance.now();
    const a = current.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF is throttled in hidden tabs — never leave the number stuck mid-count.
    const snap = setTimeout(() => setN(value), ms + 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(snap);
    };
  }, [value, ms]);

  return n;
}

const NumSpan = styled.span`
  ${tnum}
`;

export function Count({ value, decimals = 0, ms = 800 }: { value: number; decimals?: number; ms?: number }) {
  const n = useCountUp(value, ms);
  return <NumSpan>{n.toFixed(decimals)}</NumSpan>;
}

// ---------------------------------------------------------------------------
// Ring
// ---------------------------------------------------------------------------

const RingWrap = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  position: relative;
  flex: 0 0 auto;
`;

const RingInner = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const Arc = styled.circle`
  transition: stroke-dashoffset 0.9s ${({ theme }) => theme.ease.out};
`;

interface RingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}

export function Ring({ value, max, size = 96, stroke = 10, color, track, children }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.max(0, Math.min(1, value / max)) : 0;
  const [on, setOn] = useState(prefersReducedMotion());

  useEffect(() => {
    const id = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(id);
  }, []);

  return (
    <RingWrap $size={size}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? 'rgba(255,255,255,.16)'} strokeWidth={stroke} />
        <Arc
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? 'currentColor'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={on ? c * (1 - pct) : c}
        />
      </svg>
      <RingInner>{children}</RingInner>
    </RingWrap>
  );
}

// ---------------------------------------------------------------------------
// Bar
// ---------------------------------------------------------------------------

const BarTrack = styled.div<{ $thin?: boolean }>`
  height: ${({ $thin }) => ($thin ? '4px' : '6px')};
  border-radius: 3px;
  background: ${({ theme }) => theme.color.hair3};
  overflow: hidden;

  > i {
    display: block;
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ${({ theme }) => theme.ease.out};
  }
`;

export function Bar({ value, max, color, thin }: { value: number; max: number; color?: string; thin?: boolean }) {
  const [on, setOn] = useState(prefersReducedMotion());
  useEffect(() => {
    const id = setTimeout(() => setOn(true), 100);
    return () => clearTimeout(id);
  }, []);
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <BarTrack $thin={thin} aria-hidden="true">
      <i style={{ width: on ? `${pct}%` : 0, background: color ?? 'currentColor' }} />
    </BarTrack>
  );
}

// ---------------------------------------------------------------------------
// Abstract mark
// ---------------------------------------------------------------------------

const popAnim = 'pop';

const MarkSvg = styled.svg`
  flex: 0 0 auto;

  @keyframes ${popAnim} {
    0% { transform: scale(0.94); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .spark { animation: ${popAnim} 0.3s ${({ theme }) => theme.ease.out} both; }
`;

/** Concentric geometry, no face. Used on celebration and empty states. */
export function Mark({ size = 72, happy = false, face, accent }: { size?: number; happy?: boolean; face?: string; accent?: string }) {
  const a = accent ?? 'currentColor';
  return (
    <MarkSvg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="34" fill="none" stroke={a} strokeWidth="1" opacity=".28" />
      <circle cx="36" cy="36" r="23" fill="none" stroke={a} strokeWidth="1.5" opacity=".55" />
      <circle cx="36" cy="36" r="12" fill={face ?? a} />
      {happy && <circle className="spark" cx="58" cy="14" r="4" fill={a} />}
    </MarkSvg>
  );
}

// ---------------------------------------------------------------------------
// Empty / error state
// ---------------------------------------------------------------------------

const EmptyWrap = styled.div<{ $muted?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 32px 24px;
  text-align: center;
  color: ${({ theme, $muted }) => ($muted ? theme.color.ink4 : theme.color.accent)};

  h2 { font-size: 19px; line-height: 26px; color: ${({ theme }) => theme.color.ink}; }

  p {
    font-size: 14px;
    line-height: 21px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.ink2};
    max-width: 280px;
  }
`;

interface EmptyStateProps {
  title: string;
  /** States what happened, why, and what to do. Never a code (§9). */
  body: string;
  action?: { label: string; onClick: () => void };
  muted?: boolean;
}

export function EmptyState({ title, body, action, muted }: EmptyStateProps) {
  return (
    <EmptyWrap $muted={muted}>
      <Mark size={80} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action && (
        <Button type="button" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </EmptyWrap>
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(23, 24, 28, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 60;
  animation: ${fadeAnim} 0.16s ${({ theme }) => theme.ease.out};
`;

const Sheet = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.size.contentMax};
  background: ${({ theme }) => theme.color.surface};
  border-radius: 20px 20px 0 0;
  padding: 20px 20px calc(24px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ${riseAnim} 0.22s ${({ theme }) => theme.ease.out};
  max-height: 86vh;
  overflow-y: auto;

  p {
    font-size: 14px;
    line-height: 21px;
    color: ${({ theme }) => theme.color.ink2};
    font-weight: 500;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;

  /* Primary right, secondary left — platform convention (§7). */
  > button { flex: 1; }
`;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}

/**
 * Bottom-sheet modal. Escape and the scrim both dismiss, focus moves in on
 * open and cycles within while open, and focus returns to the opener on close
 * — every state has a visible exit (§7, §11).
 */
export function Dialog({ title, children, actions, onClose }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener.current?.focus?.();
    };
  }, [onClose]);

  return (
    <Scrim onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <Sheet role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2>{title}</h2>
        {children}
        <Actions>{actions}</Actions>
      </Sheet>
    </Scrim>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

const ToastWrap = styled.div`
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  margin: 0 auto;
  max-width: ${({ theme }) => theme.size.contentMax};
  z-index: 40;
  background: ${({ theme }) => theme.color.ink};
  color: ${({ theme }) => theme.color.onInk};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 8px 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  font-size: 14px;
  box-shadow: ${({ theme }) => theme.shadow.md};
  animation: ${riseAnim} 0.22s ${({ theme }) => theme.ease.out};

  > span { flex: 1; min-width: 0; }

  ${LinkButton} {
    color: ${({ theme }) => theme.color.accentOnInk};
    flex: 0 0 auto;
    &:hover { background: rgba(255, 255, 255, 0.12); color: ${({ theme }) => theme.color.onInk}; }
  }
`;

interface ToastProps {
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Undo beats confirmation — people act faster than they read (§7). Lives in
 * `role="status"` so it's announced without stealing focus.
 */
export function Toast({ children, actionLabel, onAction }: ToastProps) {
  return (
    <ToastWrap role="status">
      <span>{children}</span>
      {actionLabel && onAction && (
        <LinkButton type="button" onClick={onAction}>
          {actionLabel}
        </LinkButton>
      )}
    </ToastWrap>
  );
}
