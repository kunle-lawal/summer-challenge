import styled from "styled-components";
import type { ReactNode } from "react";
import type { Rule } from "@/types";
import type { RawEntryValue } from "@/types";
import { LockIcon } from "@/components/ui/Icons";
import { formatRuleFormula } from "@/lib/rules/ruleDocs";

// ── Shared shell ──────────────────────────────────────────────────────────────

export const CardWrap = styled.div<{ $locked: boolean }>`
	background: ${({ theme, $locked }) =>
		$locked ? theme.color.bg : theme.color.surface};
	border: 2px solid
		${({ theme, $locked }) => ($locked ? theme.color.hair2 : theme.color.ink4)};
	border-style: ${({ $locked }) => ($locked ? "dashed" : "solid")};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 14px;
	box-shadow: 0 1px 0 rgba(24, 23, 15, 0.04);
`;

export const CardTop = styled.div`
	display: flex;
	align-items: flex-start;
	gap: 12px;
`;

export const CardTitle = styled.h3`
	font-family: ${({ theme }) => theme.font.body};
	font-size: 15px;
	font-weight: 600;
	color: ${({ theme }) => theme.color.ink};
	margin: 0;
`;

export const RuleMeta = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	margin-top: 1px;
	flex-wrap: wrap;
`;

const KindLabel = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
`;

const DotSep = styled.span`
	width: 3px;
	height: 3px;
	border-radius: 50%;
	background: ${({ theme }) => theme.color.ink4};
	display: inline-block;
`;

export const Formula = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	color: ${({ theme }) => theme.color.ink3};
`;

export const PtsDisplay = styled.div`
	text-align: right;
	min-width: 56px;
	flex-shrink: 0;
	padding-top: 2px;
`;

export const PtsVal = styled.span<{ $sign: "pos" | "neg" | "zero" | "empty" }>`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 24px;
	font-variant-numeric: tabular-nums;
	line-height: 1;
	font-style: ${({ $sign }) =>
		$sign === "empty" || $sign === "zero" ? "normal" : "italic"};
	color: ${({ theme, $sign }) => {
		if ($sign === "pos") return theme.color.ink;
		if ($sign === "neg") return theme.color.bad;
		return theme.color.ink4;
	}};
`;

export const CardBody = styled.div`
	margin-top: 12px;
`;

export const CardFoot = styled.div`
	margin-top: 12px;
	padding-top: 10px;
	border-top: 1px solid ${({ theme }) => theme.color.hair};
`;

export const FootRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	flex-wrap: wrap;
`;

export const BodySm = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	color: ${({ theme }) => theme.color.ink3};
	letter-spacing: 0.04em;
`;

export const Pill = styled.span<{
	$variant?: "outline" | "good" | "bad" | "accent";
}>`
	display: inline-flex;
	align-items: center;
	padding: 3px 8px;
	border-radius: ${({ theme }) => theme.radii.pill};
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	font-weight: 500;
	white-space: nowrap;
	background: ${({ theme, $variant }) => {
		if ($variant === "good") return theme.color.goodTint;
		if ($variant === "bad") return theme.color.badTint;
		if ($variant === "accent") return theme.color.accentTint;
		return "transparent";
	}};
	color: ${({ theme, $variant }) => {
		if ($variant === "good") return theme.color.good;
		if ($variant === "bad") return theme.color.bad;
		if ($variant === "accent") return theme.color.accent;
		return theme.color.ink3;
	}};
	border: 1px solid
		${({ theme, $variant }) => {
			if ($variant === "good") return theme.color.good + "40";
			if ($variant === "bad") return theme.color.bad + "40";
			if ($variant === "accent") return theme.color.accent + "40";
			return theme.color.hair2;
		}};
`;

const LockWrap = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 4px;
	svg {
		width: 12px;
		height: 12px;
		stroke: ${({ theme }) => theme.color.ink3};
		stroke-width: 1.6;
		fill: none;
	}
`;

// ── RuleShell component ───────────────────────────────────────────────────────

function ruleFormula(rule: Rule): string {
	return formatRuleFormula(rule);
}

interface RuleShellProps {
	rule: Rule;
	points: number | null;
	locked: boolean;
	lockedAt?: string;
	children: ReactNode;
	footer?: ReactNode;
}

export function RuleShell({
	rule,
	points,
	locked,
	lockedAt,
	children,
	footer,
}: RuleShellProps) {
	const ptsSign: "pos" | "neg" | "zero" | "empty" =
		points === null
			? "empty"
			: points > 0
				? "pos"
				: points < 0
					? "neg"
					: "zero";

	return (
		<CardWrap $locked={locked}>
			<CardTop>
				<div style={{ flex: 1, minWidth: 0 }}>
					<CardTitle>
						{rule.emoji ? `${rule.emoji} ${rule.name}` : rule.name}
					</CardTitle>
					<RuleMeta>
						<KindLabel>{rule.kind}</KindLabel>
						<DotSep />
						<Formula>{ruleFormula(rule)}</Formula>
					</RuleMeta>
				</div>
				<PtsDisplay>
					<PtsVal $sign={ptsSign}>
						{points === null
							? "—"
							: `${points > 0 ? "+" : ""}${points.toFixed(1)}`}
					</PtsVal>
				</PtsDisplay>
			</CardTop>

			<CardBody>{children}</CardBody>

			{footer && (
				<CardFoot>
					<FootRow>
						{footer}
						{locked && lockedAt && (
							<LockWrap>
								<LockIcon />
								<BodySm>locked · logged {lockedAt}</BodySm>
							</LockWrap>
						)}
					</FootRow>
				</CardFoot>
			)}
		</CardWrap>
	);
}

// ── Choice button group (shared by Binary + Penalty) ─────────────────────────

export const Choices = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 6px;
`;

export const Choice = styled.button<{
	$variant?: "bad" | "free";
	$pressed: boolean;
	$disabled: boolean;
}>`
	appearance: none;
	border: 1px solid
		${({ theme, $pressed, $variant }) => {
			if ($pressed && $variant === "bad") return theme.color.bad;
			if ($pressed && $variant === "free") return theme.color.accent;
			if ($pressed) return theme.color.ink;
			return theme.color.hair;
		}};
	background: ${({ theme, $pressed, $variant }) => {
		if ($pressed && $variant === "bad") return theme.color.bad;
		if ($pressed && $variant === "free") return theme.color.accent;
		if ($pressed) return theme.color.ink;
		return theme.color.surface2;
	}};
	color: ${({ theme, $pressed }) =>
		$pressed ? theme.color.surface : theme.color.ink2};
	font: 500 13.5px/1 ${({ theme }) => theme.font.body};
	padding: 12px 10px;
	border-radius: ${({ theme }) => theme.radii.md};
	cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	transition: all 0.12s;
	opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
	svg {
		width: 14px;
		height: 14px;
		stroke: currentColor;
		stroke-width: 1.8;
		fill: none;
	}
`;

// ── Counter / stepper (shared by Range + Tracker) ────────────────────────────

export const Stepper = styled.div`
	display: flex;
	align-items: stretch;
	border: 1px solid ${({ theme }) => theme.color.hair2};
	border-radius: ${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.color.surface};
	overflow: hidden;
	font-family: ${({ theme }) => theme.font.mono};
	width: 156px;
	flex-shrink: 0;
`;

export const StepBtn = styled.button`
	width: 38px;
	border: 0;
	background: transparent;
	color: ${({ theme }) => theme.color.ink2};
	font: 500 16px/1 ${({ theme }) => theme.font.mono};
	cursor: pointer;
	&:hover {
		background: ${({ theme }) => theme.color.surface2};
		color: ${({ theme }) => theme.color.ink};
	}
	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
`;

export const StepVal = styled.div`
	flex: 1;
	padding: 10px 6px;
	text-align: center;
	font-family: ${({ theme }) => theme.font.display};
	font-size: 22px;
	line-height: 1;
	color: ${({ theme }) => theme.color.ink};
	font-variant-numeric: tabular-nums;
	border-left: 1px solid ${({ theme }) => theme.color.hair};
	border-right: 1px solid ${({ theme }) => theme.color.hair};
	background: ${({ theme }) => theme.color.surface};
`;

export const StepValField = styled.input`
	flex: 1;
	min-width: 0;
	width: 100%;
	padding: 10px 4px;
	text-align: center;
	border: 0;
	background: transparent;
	font-family: ${({ theme }) => theme.font.display};
	font-size: 22px;
	line-height: 1;
	color: ${({ theme }) => theme.color.ink};
	font-variant-numeric: tabular-nums;
	outline: none;
	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	&::placeholder {
		color: ${({ theme }) => theme.color.ink4};
	}
`;

export const StepUnit = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 11px;
	color: ${({ theme }) => theme.color.ink3};
	letter-spacing: 0.04em;
	text-transform: uppercase;
	margin-left: 4px;
`;

// ── Counter input (for counter rule) ─────────────────────────────────────────

export const CounterInput = styled.div`
	display: flex;
	align-items: baseline;
	border: 1px solid ${({ theme }) => theme.color.hair2};
	border-radius: ${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.color.surface};
	padding: 10px 12px;
	width: 156px;
	flex-shrink: 0;
`;

export const CounterInputField = styled.input`
	flex: 1;
	border: 0;
	background: transparent;
	outline: none;
	font-family: ${({ theme }) => theme.font.display};
	font-size: 22px;
	line-height: 1;
	color: ${({ theme }) => theme.color.ink};
	font-variant-numeric: tabular-nums;
	width: 100%;
	&::placeholder {
		color: ${({ theme }) => theme.color.ink4};
	}
	&:disabled {
		opacity: 0.5;
	}
`;

// ── Progress bar ──────────────────────────────────────────────────────────────

export const Bar = styled.div<{ $variant?: "accent" | "good" }>`
	height: 4px;
	background: ${({ theme }) => theme.color.bg2};
	border-radius: ${({ theme }) => theme.radii.pill};
	overflow: hidden;
	flex: 1;
`;

export const BarFill = styled.div<{
	$width: number;
	$variant?: "accent" | "good";
}>`
	height: 100%;
	width: ${({ $width }) => Math.min(100, $width)}%;
	background: ${({ theme, $variant }) =>
		$variant === "accent"
			? theme.color.accent
			: $variant === "good"
				? theme.color.good
				: theme.color.ink};
	border-radius: ${({ theme }) => theme.radii.pill};
	transition: width 0.3s ease;
`;

// ── Row helpers ───────────────────────────────────────────────────────────────

export const InputRow = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
`;

export const InputSide = styled.div`
	flex: 1;
	display: flex;
	align-items: center;
	gap: 10px;
`;

// Re-export value type for use in card components
export type { RawEntryValue };
