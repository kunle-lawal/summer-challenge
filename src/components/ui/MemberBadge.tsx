import styled, { css } from 'styled-components';
import type { Member } from '@/types';
import type { ToneName } from '@/theme/theme';
import { TONE_NAMES } from '@/theme/theme';

/**
 * Member avatar — initials on a pastel tone, ported from the design's `.avatar`.
 *
 * The tone is derived from the name so the same person keeps the same colour
 * across every screen without storing anything. Colour is never the only
 * signal: the initials and the adjacent name always carry the identity (§3).
 */

export function memberTone(name: string): ToneName {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
  return TONE_NAMES[Math.abs(hash) % TONE_NAMES.length] ?? 'sky';
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<BadgeSize, ReturnType<typeof css>> = {
  sm: css`width: 32px; height: 32px; font-size: 11px;`,
  md: css`width: 36px; height: 36px; font-size: 12px;`,
  lg: css`width: 44px; height: 44px; font-size: 13px;`,
  xl: css`width: 56px; height: 56px; font-size: 17px;`,
};

const Wrap = styled.span<{ $size: BadgeSize; $tone: ToneName; $isYou: boolean; $tappable: boolean }>`
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  border: 0;
  padding: 0;
  font-family: ${({ theme }) => theme.font.display};
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  color: ${({ theme, $tone }) => theme.tone[$tone].ink};
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  ${({ $size }) => sizes[$size]}

  /* "You" gets a ring, not a second accent fill — one accent per region (§3). */
  ${({ $isYou, theme }) => $isYou && css`
    box-shadow: 0 0 0 2px ${theme.color.surface}, 0 0 0 3.5px ${theme.color.ink};
  `}

  ${({ $tappable }) => $tappable && css`
    cursor: pointer;
    transition: opacity 0.16s;
    &:hover { opacity: 0.82; }
  `}
`;

interface Props {
  member: Pick<Member, 'name'>;
  size?: BadgeSize;
  isYou?: boolean;
  /** Renders as a real <button> when set. Requires `label`. */
  onClick?: () => void;
  /** Accessible name. Required whenever `onClick` is set (§11). */
  label?: string;
}

export function MemberBadge({ member, size = 'md', isYou = false, onClick, label }: Props) {
  const tone = memberTone(member.name);
  const initials = memberInitials(member.name);

  if (onClick) {
    return (
      <Wrap
        as="button"
        type="button"
        $size={size}
        $tone={tone}
        $isYou={isYou}
        $tappable
        onClick={onClick}
        aria-label={label ?? member.name}
      >
        {initials}
      </Wrap>
    );
  }

  return (
    <Wrap $size={size} $tone={tone} $isYou={isYou} $tappable={false} aria-hidden="true">
      {initials}
    </Wrap>
  );
}

export { MemberBadge as Avatar };
