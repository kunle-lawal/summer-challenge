import styled, { css } from 'styled-components';
import type { Member } from '@/types';

const TONES = ['sand', 'sage', 'clay', 'mist', 'rose', 'olive', 'dust', 'ash'] as const;
const TONE_COLORS: Record<string, string> = {
  sand: '#e6dec4', sage: '#d8dfca', clay: '#e0d2c1',
  mist: '#d2d9d4', rose: '#e0d2cc', olive: '#d5d4c2',
  dust: '#dad6cd', ash: '#cfcecb',
};

export function memberTone(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
  return TONES[Math.abs(hash) % TONES.length] ?? 'dust';
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<BadgeSize, ReturnType<typeof css>> = {
  sm: css`width: 28px; height: 28px; font-size: 9.5px;`,
  md: css`width: 36px; height: 36px; font-size: 11px;`,
  lg: css`width: 44px; height: 44px; font-size: 13px;`,
  xl: css`width: 56px; height: 56px; font-size: 15px;`,
};

const Wrap = styled.span<{ $size: BadgeSize; $isYou: boolean; $tone: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-family: ${({ theme }) => theme.font.mono};
  font-weight: 600;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  color: ${({ theme, $isYou }) => $isYou ? theme.color.accentInk : theme.color.ink};
  background: ${({ $isYou, theme, $tone }) =>
    $isYou ? theme.color.accent : TONE_COLORS[$tone] ?? theme.color.bg2};
  ${({ $size }) => sizes[$size]}
`;

interface Props {
  member: Pick<Member, 'name'>;
  size?: BadgeSize;
  isYou?: boolean;
}

export function MemberBadge({ member, size = 'md', isYou = false }: Props) {
  const tone = memberTone(member.name);
  return (
    <Wrap $size={size} $isYou={isYou} $tone={tone}>
      {memberInitials(member.name)}
    </Wrap>
  );
}
