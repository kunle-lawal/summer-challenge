import type { StreakRule } from "@/types";
import styled from "styled-components";
import { CheckIcon } from "@/components/ui/Icons";
import { RuleShell, BodySm, Pill, FootRow } from "./RuleCard";

const Dots = styled.div`
	display: flex;
	gap: 6px;
	align-items: center;
	flex-wrap: wrap;
`;

const Dot = styled.span<{ $filled: boolean }>`
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px solid
		${({ theme, $filled }) =>
			$filled ? theme.color.accent : theme.color.hair2};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: ${({ theme, $filled }) =>
		$filled ? theme.color.accent : theme.color.surface2};
	color: ${({ theme, $filled }) =>
		$filled ? theme.color.accentInk : theme.color.ink3};
	svg {
		width: 14px;
		height: 14px;
		stroke: currentColor;
		stroke-width: 2.2;
		fill: none;
	}
`;

interface Props {
	rule: StreakRule;
	/** Number of consecutive positive days ending today */
	currentStreak: number;
	locked: boolean;
}

// ── StreakBand — compact inline variant attached below a tracked rule card ────

const Band = styled.div`
	margin-top: -1px;
	border: 1px solid ${({ theme }) => theme.color.hair};
	border-top: 2px dashed ${({ theme }) => theme.color.hair2};
	border-radius: 0 0 ${({ theme }) => theme.radii.md}
		${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.color.surface};
	padding: 9px 14px 11px;
`;

const BandHead = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 7px;
`;

const BandLabel = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10px;
	color: ${({ theme }) => theme.color.ink2};
	text-transform: uppercase;
	letter-spacing: 0.07em;
`;

const BandStatus = styled.span<{ $earned: boolean }>`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10px;
	font-weight: ${({ $earned }) => ($earned ? 700 : 400)};
	color: ${({ theme, $earned }) =>
		$earned ? theme.color.good : theme.color.ink3};
`;

const SmallDots = styled.div`
	display: flex;
	gap: 5px;
	align-items: center;
	flex-wrap: wrap;
`;

const SmallDot = styled.span<{ $filled: boolean }>`
	width: 22px;
	height: 22px;
	border-radius: 50%;
	border: 1px solid
		${({ theme, $filled }) =>
			$filled ? theme.color.accent : theme.color.hair2};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: ${({ theme, $filled }) =>
		$filled ? theme.color.accent : theme.color.surface2};
	color: ${({ theme, $filled }) =>
		$filled ? theme.color.accentInk : theme.color.ink3};
	svg {
		width: 11px;
		height: 11px;
		stroke: currentColor;
		stroke-width: 2.4;
		fill: none;
	}
`;

interface BandProps {
	rule: StreakRule;
	currentStreak: number;
}

export function StreakBand({ rule, currentStreak }: BandProps) {
	const earned = currentStreak >= rule.daysRequired;
	const remaining = rule.daysRequired - currentStreak;
	return (
		<Band>
			<BandHead>
				<BandLabel>
					{rule.emoji ? `${rule.emoji} ` : "🔥"}
					{rule.name}
				</BandLabel>
				<BandStatus $earned={earned}>
					{earned
						? `✓ +${rule.bonusPoints} pts earned`
						: `${currentStreak}/${rule.daysRequired} · ${remaining} more for +${rule.bonusPoints}`}
				</BandStatus>
			</BandHead>
			<SmallDots>
				{Array.from({ length: rule.daysRequired }).map((_, i) => (
					<SmallDot
						key={i}
						$filled={i < currentStreak}
					>
						{i < currentStreak && <CheckIcon />}
					</SmallDot>
				))}
			</SmallDots>
		</Band>
	);
}

// ── StreakRuleCard — full standalone card (used for orphaned streaks) ──────────

export function StreakRuleCard({ rule, currentStreak, locked }: Props) {
	const earned = currentStreak >= rule.daysRequired;
	const points = earned ? rule.bonusPoints : 0;

	return (
		<RuleShell
			rule={rule}
			points={points}
			locked={locked}
			footer={
				<FootRow>
					<BodySm>
						{currentStreak}/{rule.daysRequired} days ·{" "}
						{earned
							? "✓ earned"
							: `${rule.daysRequired - currentStreak} more for +${rule.bonusPoints}`}
					</BodySm>
					<Pill $variant="outline">Derived</Pill>
				</FootRow>
			}
		>
			<Dots>
				{Array.from({ length: rule.daysRequired }).map((_, i) => (
					<Dot
						key={i}
						$filled={i < currentStreak}
					>
						{i < currentStreak && <CheckIcon />}
					</Dot>
				))}
			</Dots>
		</RuleShell>
	);
}
