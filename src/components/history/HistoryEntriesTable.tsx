import { useMemo } from "react";
import styled from "styled-components";
import { latestGoalRowIndex, type HistoryDisplayRow } from "../../lib/history";
import { fmtPts, ptsClass } from "../../lib/scoring";

const HistoryWrap = styled.div`
	background: ${({ theme }) => theme.color.surface};
	border: 1px solid ${({ theme }) => theme.color.border};
	border-radius: 14px;
	overflow: hidden;
`;

const TableWrap = styled.div`
	overflow-x: auto;
`;

const Table = styled.table`
	width: 100%;
	border-collapse: collapse;
	font-size: 0.78rem;
`;

const Th = styled.th`
	text-align: left;
	font-size: 0.62rem;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	color: ${({ theme }) => theme.color.muted};
	padding: 9px 12px;
	background: ${({ theme }) => theme.color.surface2};
	border-bottom: 1px solid ${({ theme }) => theme.color.border};
	white-space: nowrap;
`;

const Td = styled.td`
	padding: 10px 12px;
	border-bottom: 1px solid ${({ theme }) => theme.color.border};
	color: ${({ theme }) => theme.color.muted2};
	white-space: nowrap;
`;

const Tr = styled.tr`
	&:last-child td {
		border-bottom: none;
	}
	&:hover td {
		background: ${({ theme }) => theme.color.surface2};
	}
`;

const TotalTr = styled.tr`
	td {
		border-top: 1px solid ${({ theme }) => theme.color.border};
		border-bottom: none;
		background: ${({ theme }) => theme.color.surface2};
		padding-top: 12px;
		padding-bottom: 12px;
	}
	&:hover td {
		background: ${({ theme }) => theme.color.surface2};
	}
`;

const EmptyMsg = styled.div`
	text-align: center;
	padding: 3rem 1rem;
	color: ${({ theme }) => theme.color.muted};
	font-size: 0.8rem;
`;

const Pill = styled.span<{
	$variant: "green" | "red" | "blue" | "gold" | "purple" | "muted";
}>`
	display: inline-block;
	padding: 2px 8px;
	border-radius: 20px;
	font-size: 0.65rem;
	font-weight: 500;
	background: ${({ theme, $variant }) =>
		$variant === "green"
			? theme.color.greenDim
			: $variant === "red"
				? theme.color.redDim
				: $variant === "blue"
					? theme.color.blueDim
					: $variant === "gold"
						? theme.color.goldDim
						: $variant === "purple"
							? theme.color.purpleDim
							: theme.color.surface2};
	color: ${({ theme, $variant }) =>
		$variant === "green"
			? theme.color.green
			: $variant === "red"
				? theme.color.red
				: $variant === "blue"
					? theme.color.blue
					: $variant === "gold"
						? theme.color.gold
						: $variant === "purple"
							? theme.color.purple
							: theme.color.muted};
`;

const PtsCell = styled.span<{ $tone: "pos" | "neg" | "zero" | "purple" }>`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 0.72rem;
	font-weight: 700;
	color: ${({ theme, $tone }) =>
		$tone === "purple"
			? theme.color.purple
			: $tone === "pos"
				? theme.color.green
				: $tone === "neg"
					? theme.color.red
					: theme.color.muted2};
`;

function DetailsCell({ row }: { row: HistoryDisplayRow }) {
	if (row.kind === "workout") {
		return (
			<span style={{ fontSize: "0.75rem" }}>
				{row.gym === "went" ? (
					<Pill $variant="green">Went</Pill>
				) : row.gym === "skip" ? (
					<Pill $variant="red">Skipped</Pill>
				) : row.gym === "free-gym" ? (
					<Pill $variant="blue">★ Free</Pill>
				) : (
					"—"
				)}{" "}
				&nbsp;·&nbsp; {row.steps.toLocaleString()} steps (+{row.stepPts}) &nbsp;·&nbsp;{" "}
				{row.junk === "clean" ? (
					<Pill $variant="green">Clean</Pill>
				) : row.junk === "ate" ? (
					<Pill $variant="red">Ate Junk</Pill>
				) : row.junk === "free-junk" ? (
					<Pill $variant="blue">★ Free</Pill>
				) : (
					"—"
				)}
			</span>
		);
	}
	if (row.kind === "goal") {
		return (
			<span style={{ fontSize: "0.75rem" }}>
				Value: <strong style={{ fontWeight: 600 }}>{row.value}</strong> &nbsp;·&nbsp; Goal:{" "}
				{row.goal} ({row.dirLabel})
			</span>
		);
	}
	if (row.kind === "goal_set") {
		return (
			<span style={{ fontSize: "0.75rem" }}>
				Goal: <strong style={{ fontWeight: 600 }}>{row.goal}</strong> · Start: {row.startVal}{" "}
				· {row.direction} (set #{row.setNumber})
			</span>
		);
	}
	return (
		<span style={{ fontSize: "0.75rem" }}>
			Prev goal: {String(row.previousGoal)} · Prev start: {String(row.previousStart)} ·{" "}
			{row.previousDirection} (reset #{row.resetNumber})
		</span>
	);
}

function TypeCell({ row }: { row: HistoryDisplayRow }) {
	if (row.kind === "goal_set") {
		return <Pill $variant="purple">Goal set</Pill>;
	}
	if (row.kind === "goal_reset") {
		return <Pill $variant="red">Goal reset</Pill>;
	}
	if (row.kind === "goal") {
		return <Pill $variant="purple">Goal</Pill>;
	}
	return <Pill $variant="gold">Workout</Pill>;
}

export type HistoryEntriesTableProps = {
	rows: HistoryDisplayRow[];
	/** When false, omits the player column (e.g. single-user log page). */
	showPlayerColumn?: boolean;
	emptyMessage?: string;
	/** When set, shows a footer: sum(workout pts) + this value (current personal-goal total). */
	footerProfilePts?: number;
	/** Strike through goal pts except the chronologically latest goal row. */
	strikeNonLatestGoalPts?: boolean;
};

export function HistoryEntriesTable({
	rows,
	showPlayerColumn = true,
	emptyMessage = "No entries yet.",
	footerProfilePts,
	strikeNonLatestGoalPts = false,
}: HistoryEntriesTableProps) {
	const workoutPtsSum = useMemo(
		() => rows.reduce((s, r) => (r.kind === "workout" ? s + r.pts : s), 0),
		[rows],
	);

	const latestGoalIdx = useMemo(
		() => (strikeNonLatestGoalPts ? latestGoalRowIndex(rows) : null),
		[rows, strikeNonLatestGoalPts],
	);

	const showFooter = footerProfilePts !== undefined;
	const grandTotal = showFooter
		? Math.round((workoutPtsSum + footerProfilePts) * 10) / 10
		: null;

	const labelColSpan = showPlayerColumn ? 5 : 4;

	if (rows.length === 0) {
		return (
			<HistoryWrap>
				<EmptyMsg>{emptyMessage}</EmptyMsg>
			</HistoryWrap>
		);
	}

	return (
		<HistoryWrap>
			<TableWrap>
				<Table>
					<thead>
						<tr>
							<Th>Date</Th>
							<Th>Time</Th>
							{showPlayerColumn ? <Th>Player</Th> : null}
							<Th>Type</Th>
							<Th>Details</Th>
							<Th style={{ textAlign: "right" }}>Pts</Th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r, i) => (
							<Tr key={`${r.sortDate}-${r.sortTime}-${r.name}-${i}`}>
								<Td>{r.dateDisplay}</Td>
								<Td style={{ fontSize: "0.72rem", color: "inherit" }}>
									{r.timeDisplay}
								</Td>
								{showPlayerColumn ? (
									<Td style={{ color: "inherit", fontWeight: 500 }}>{r.name}</Td>
								) : null}
								<Td>
									<TypeCell row={r} />
								</Td>
								<Td>
									<DetailsCell row={r} />
								</Td>
								<Td style={{ textAlign: "right" }}>
									{r.kind === "workout" && r.pts != null ? (
										<PtsCell $tone={ptsClass(r.pts)}>{fmtPts(r.pts)}</PtsCell>
									) : r.kind === "goal" ? (
										<span
											style={
												strikeNonLatestGoalPts &&
												latestGoalIdx !== null &&
												i !== latestGoalIdx
													? {
															textDecoration: "line-through",
															opacity: 0.5,
														}
													: undefined
											}
										>
											<PtsCell $tone="purple">+{r.pts}</PtsCell>
										</span>
									) : r.kind === "goal_set" || r.kind === "goal_reset" ? (
										<span style={{ color: "inherit", fontSize: "0.7rem" }}>—</span>
									) : null}
								</Td>
							</Tr>
						))}
					</tbody>
					{showFooter && grandTotal != null ? (
						<tfoot>
							<TotalTr>
								<Td
									colSpan={labelColSpan}
									style={{
										textAlign: "right",
										color: "inherit",
										fontWeight: 700,
										fontSize: "0.72rem",
									}}
								>
									Total (workouts + current goal)
								</Td>
								<Td style={{ textAlign: "right" }}>
									<PtsCell $tone={ptsClass(grandTotal)}>{fmtPts(grandTotal)}</PtsCell>
								</Td>
							</TotalTr>
						</tfoot>
					) : null}
				</Table>
			</TableWrap>
		</HistoryWrap>
	);
}
