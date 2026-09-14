import type { StreakRule } from "@/types";
import styled from "styled-components";
import { CheckIcon } from "@/components/ui/Icons";
import { RuleShell, BodySm, Pill, FootRow } from "./RuleCard";
import {
	formatStreakDayLabel,
	getStreakSlots,
	type StreakRunState,
} from "@/lib/rules/streakRun";

const RunHint = styled.p`
	margin: 0 0 8px;
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10px;
	color: ${({ theme }) => theme.color.ink3};
	line-height: 1.4;
`;

const BrokenHint = styled(RunHint)`
	color: ${({ theme }) => theme.color.bad};
`;

const SlotGrid = styled.div`
	display: flex;
	gap: 6px;
	align-items: flex-start;
	flex-wrap: wrap;
`;

const SlotCol = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	min-width: 36px;
`;

const Dot = styled.span<{ $filled: boolean; $projected: boolean }>`
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px dashed
		${({ theme, $filled, $projected }) =>
			$filled
				? theme.color.accent
				: $projected
					? theme.color.hair2
					: theme.color.hair2};
	border-style: ${({ $filled, $projected }) =>
		$filled ? "solid" : $projected ? "dashed" : "solid"};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: ${({ theme, $filled, $projected }) =>
		$filled
			? theme.color.accent
			: $projected
				? theme.color.surface
				: theme.color.surface2};
	color: ${({ theme, $filled, $projected }) =>
		$filled
			? theme.color.accentInk
			: $projected
				? theme.color.ink3
				: theme.color.ink3};
	opacity: ${({ $projected }) => ($projected ? 0.75 : 1)};
	svg {
		width: 14px;
		height: 14px;
		stroke: currentColor;
		stroke-width: 2.2;
		fill: none;
	}
`;

const SlotLabel = styled.span<{ $filled: boolean; $projected: boolean }>`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 9px;
	color: ${({ theme, $filled, $projected }) =>
		$filled
			? theme.color.ink2
			: $projected
				? theme.color.ink3
				: theme.color.ink3};
	text-align: center;
	white-space: nowrap;
`;

interface StreakDotsProps {
	rule: StreakRule;
	run: StreakRunState;
	size?: "sm" | "md";
}

function StreakDots({ rule, run, size = "md" }: StreakDotsProps) {
	const slots = getStreakSlots(run, rule.daysRequired);
	const Label = size === "sm" ? SmallSlotLabel : SlotLabel;
	const DotCmp = size === "sm" ? SmallDot : Dot;

	return (
		<SlotGrid>
			{slots.map((slot, i) => (
				<SlotCol key={i}>
					<DotCmp $filled={slot.filled} $projected={slot.projected}>
						{slot.filled && <CheckIcon />}
					</DotCmp>
					<Label $filled={slot.filled} $projected={slot.projected}>
						{slot.date ? formatStreakDayLabel(slot.date) : "—"}
					</Label>
				</SlotCol>
			))}
		</SlotGrid>
	);
}

// Small variants for StreakBand
const SmallDot = styled(Dot)`
	width: 22px;
	height: 22px;
	svg {
		width: 11px;
		height: 11px;
		stroke-width: 2.4;
	}
`;

const SmallSlotLabel = styled(SlotLabel)`
	font-size: 8px;
`;

interface SharedProps {
	rule: StreakRule;
	run: StreakRunState;
}

function streakStatusText(rule: StreakRule, run: StreakRunState): string {
	if (run.brokenOnDate) {
		return "Broken today — start a new run";
	}
	if (run.complete) {
		return `✓ +${rule.bonusPoints} pts earned this run`;
	}
	const remaining = rule.daysRequired - run.count;
	return `${run.count}/${rule.daysRequired} · ${remaining} more for +${rule.bonusPoints}`;
}

function runHintText(run: StreakRunState): string {
	if (run.brokenOnDate) {
		return "Today did not count toward the streak.";
	}
	if (run.count === 0) {
		return "This run only — consecutive scoring days toward the bonus.";
	}
	const first = run.runDates[0];
	const last = run.runDates[run.runDates.length - 1];
	if (!first || !last) {
		return "This run only — consecutive scoring days toward the bonus.";
	}
	if (first === last) {
		return `This run: ${formatStreakDayLabel(first)}`;
	}
	return `This run: ${formatStreakDayLabel(first)} → ${formatStreakDayLabel(last)}`;
}

// ── StreakBand — compact inline variant attached below a tracked rule card ────

const Band = styled.div`
	margin-top: -2px;
	border: 2px solid ${({ theme }) => theme.color.ink4};
	border-top: 2px dashed ${({ theme }) => theme.color.hair2};
	border-radius: 0 0 ${({ theme }) => theme.radii.md}
		${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.color.surface};
	padding: 9px 14px 11px;
	box-shadow: 0 1px 0 rgba(24, 23, 15, 0.04);
`;

const BandHead = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 4px;
`;

const BandLabel = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10px;
	color: ${({ theme }) => theme.color.ink2};
	text-transform: uppercase;
	letter-spacing: 0.07em;
`;

const BandStatus = styled.span<{ $earned: boolean; $broken?: boolean }>`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10px;
	font-weight: ${({ $earned }) => ($earned ? 700 : 400)};
	color: ${({ theme, $earned, $broken }) =>
		$broken ? theme.color.bad : $earned ? theme.color.good : theme.color.ink3};
`;

export function StreakBand({ rule, run }: SharedProps) {
	return (
		<Band>
			<BandHead>
				<BandLabel>
					{rule.emoji ? `${rule.emoji} ` : "🔥"}
					{rule.name}
				</BandLabel>
				<BandStatus $earned={run.complete} $broken={run.brokenOnDate}>
					{streakStatusText(rule, run)}
				</BandStatus>
			</BandHead>
			{run.brokenOnDate ? (
				<BrokenHint>{runHintText(run)}</BrokenHint>
			) : (
				<RunHint>{runHintText(run)}</RunHint>
			)}
			<StreakDots rule={rule} run={run} size="sm" />
		</Band>
	);
}

// ── StreakRuleCard — full standalone card (used for orphaned streaks) ──────────

interface CardProps extends SharedProps {
	locked: boolean;
}

export function StreakRuleCard({ rule, run, locked }: CardProps) {
	const points = run.complete ? rule.bonusPoints : 0;

	return (
		<RuleShell
			rule={rule}
			points={points}
			locked={locked}
			footer={
				<FootRow>
					<BodySm>{streakStatusText(rule, run)}</BodySm>
					<Pill $variant="outline">Derived</Pill>
				</FootRow>
			}
		>
			{run.brokenOnDate ? (
				<BrokenHint>{runHintText(run)}</BrokenHint>
			) : (
				<RunHint>{runHintText(run)}</RunHint>
			)}
			<StreakDots rule={rule} run={run} size="md" />
		</RuleShell>
	);
}
