/**
 * Visual identity for a rule: a pastel tone and a glyph.
 *
 * The design prototype hardcodes six rule *ids* (`gym`, `steps`, `sleep`,
 * `junk`, `streak`, `weight`) and gives each a domain icon — a dumbbell, a
 * walking figure, a moon. Real rules are user-defined, so there is no id to
 * key off and no way to know a rule's domain.
 *
 * The six prototype rules map exactly onto the six rule kinds, so identity
 * keys off `kind` instead, with a generic glyph per kind. A rule that sets
 * `emoji` overrides the glyph with it — that's the one place the owner can
 * put the domain back in. See docs/REDESIGN_DECISIONS.md.
 */
import type { IconName } from '@/components/ui/Icons';
import type { ToneName } from '@/theme/theme';
import type { Rule, RuleKind } from '@/types';

export interface RuleLook {
  tone: ToneName;
  icon: IconName;
  /** Set when the rule carries its own emoji; render this instead of `icon`. */
  emoji?: string;
}

const BY_KIND: Record<RuleKind, { tone: ToneName; icon: IconName }> = {
  // A yes/no habit — the glyph is the answer you're hoping for.
  binary: { tone: 'lav', icon: 'check' },
  // A number that scales toward a target; bars read as "more is better".
  counter: { tone: 'sky', icon: 'board' },
  // Land inside a band.
  range: { tone: 'mint', icon: 'target' },
  // The thing you're trying not to do.
  penalty: { tone: 'peach', icon: 'alert' },
  // Consecutive days.
  streak: { tone: 'sand', icon: 'flame' },
  // Progress toward a personal goal.
  tracker: { tone: 'rose', icon: 'scale' },
};

export function ruleLook(rule: Pick<Rule, 'kind' | 'emoji'>): RuleLook {
  const base = BY_KIND[rule.kind] ?? { tone: 'sky' as const, icon: 'bolt' as const };
  const emoji = rule.emoji?.trim();
  return emoji ? { ...base, emoji } : base;
}
