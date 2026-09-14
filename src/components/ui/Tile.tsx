import styled from 'styled-components';
import type { ToneName } from '@/theme/theme';
import type { Rule } from '@/types';
import { ruleLook } from '@/lib/rules/ruleLook';
import { Icon, type IconName } from './Icons';

/**
 * Coloured icon tile. Purely decorative — the rule name always sits beside it,
 * so the tile never carries meaning alone (§3).
 */

const Box = styled.span<{ $tone: ToneName; $lg: boolean }>`
  width: ${({ $lg }) => ($lg ? '48px' : '36px')};
  height: ${({ $lg }) => ($lg ? '48px' : '36px')};
  border-radius: ${({ theme, $lg }) => ($lg ? theme.radii.md : theme.radii.sm)};
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  font-size: ${({ $lg }) => ($lg ? '22px' : '17px')};
  line-height: 1;
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].ink};

  svg {
    width: ${({ $lg }) => ($lg ? '22px' : '18px')};
    height: ${({ $lg }) => ($lg ? '22px' : '18px')};
    stroke-width: 1.9;
  }
`;

interface TileProps {
  tone?: ToneName;
  icon?: IconName;
  emoji?: string;
  size?: 'md' | 'lg';
}

export function Tile({ tone = 'sky', icon = 'bolt', emoji, size = 'md' }: TileProps) {
  return (
    <Box $tone={tone} $lg={size === 'lg'} aria-hidden="true">
      {emoji ?? <Icon name={icon} />}
    </Box>
  );
}

export function RuleTile({ rule, size }: { rule: Pick<Rule, 'kind' | 'emoji'>; size?: 'md' | 'lg' }) {
  const look = ruleLook(rule);
  return <Tile tone={look.tone} icon={look.icon} emoji={look.emoji} size={size} />;
}
