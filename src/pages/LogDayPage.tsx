import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { HistoryEntriesTable } from "../components/history/HistoryEntriesTable";
import {
	PersonLogCard,
	type LogFormRow,
} from "../components/log/PersonLogCard";
import { PersonalGoalPanel } from "../components/profile/PersonalGoalPanel";
import { useChallenge } from "../context/ChallengeContext";
import { useSelectedPerson } from "../context/SelectedPersonContext";
import {
	clampWorkoutLogDate,
	formatDateDisplayYMD,
	today,
	workoutLogDateBounds,
} from "../lib/dates";
import { buildHistoryRows } from "../lib/history";
import { calcPersonalGoalPts, calcPts } from "../lib/scoring";
import type { WorkoutEntry } from "../types";

const SectionHeader = styled.div`
	margin-bottom: 1.75rem;
`;

const SectionTitle = styled.div`
	font-family: ${({ theme }) => theme.font.display};
	font-size: clamp(1.4rem, 4vw, 2rem);
	font-weight: 900;
	line-height: 1.1;
	letter-spacing: -0.02em;
	color: ${({ theme }) => theme.color.text};
`;

const SectionSub = styled.div`
	font-size: 0.8rem;
	color: ${({ theme }) => theme.color.muted2};
	margin-top: 0.4rem;
`;

const ScoringKey = styled.div`
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 1.75rem;
`;

const KeyItem = styled.div`
	background: ${({ theme }) => theme.color.surface};
	border: 1px solid ${({ theme }) => theme.color.border};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 7px 13px;
	font-size: 0.72rem;
	color: ${({ theme }) => theme.color.muted2};
	display: flex;
	align-items: center;
	gap: 6px;
`;

const KeyVal = styled.span<{
	$variant: "pos" | "neg" | "blue" | "purple" | "neutral";
}>`
	font-weight: 600;
	font-size: 0.78rem;
	color: ${({ theme, $variant }) =>
		$variant === "pos"
			? theme.color.green
			: $variant === "neg"
				? theme.color.red
				: $variant === "blue"
					? theme.color.blue
					: $variant === "purple"
						? theme.color.purple
						: theme.color.muted2};
`;

const PersonCards = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`;

const GoalBlock = styled.div`
	margin-top: 2.5rem;
	padding-top: 2rem;
	border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const HistoryBlock = styled.div`
	margin-top: 2.5rem;
	padding-top: 2rem;
	border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const LogDateRow = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
	margin-bottom: 1.25rem;
`;

const LogDateLabel = styled.label`
	font-size: 0.72rem;
	font-weight: 600;
	color: ${({ theme }) => theme.color.muted2};
	display: flex;
	align-items: center;
	gap: 8px;
`;

const LogDateInput = styled.input`
	background: ${({ theme }) => theme.color.surface2};
	border: 1px solid ${({ theme }) => theme.color.border2};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 8px 12px;
	font-family: ${({ theme }) => theme.font.body};
	font-size: 0.85rem;
	color: ${({ theme }) => theme.color.text};
	outline: none;

	&:focus {
		border-color: ${({ theme }) => theme.color.gold};
	}
`;

function emptyRow(): LogFormRow {
	return { gym: "", steps: "", junk: "" };
}

export function LogDayPage() {
	const { pathname } = useLocation();
	const { person } = useSelectedPerson();
	const { entries, profiles, updateCache, postToSheets, clearGeneration } =
		useChallenge();
	const [formRow, setFormRow] = useState<LogFormRow>(emptyRow);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [validation, setValidation] = useState<string | null>(null);
	const [logDate, setLogDate] = useState(today);

	const personId = person?.id ?? "";
	const { minDate, maxDate } = workoutLogDateBounds();

	const myHistoryRows = useMemo(
		() =>
			personId
				? buildHistoryRows(entries, profiles, [], { personId })
				: [],
		[entries, personId, profiles],
	);

	const profilePtsTotal = useMemo(
		() => calcPersonalGoalPts(personId ? profiles[personId] : undefined),
		[profiles, personId],
	);

	useEffect(() => {
		if (pathname !== "/log") return;
		setLogDate(today());
	}, [pathname]);

	useEffect(() => {
		if (clearGeneration === 0) return;
		setLogDate(today());
	}, [clearGeneration]);

	useEffect(() => {
		setLogDate(today());
	}, [personId]);

	useEffect(() => {
		if (!personId) return;
		const saved = entries.find(
			(e) => e.personId === personId && e.date === logDate,
		);
		if (saved) {
			setFormRow({
				gym: saved.gym,
				steps: saved.steps === 0 ? "" : String(saved.steps),
				junk: saved.junk,
			});
		} else {
			setFormRow(emptyRow());
		}
	}, [logDate, personId, entries, clearGeneration]);

	useEffect(() => {
		setConfirmOpen(false);
		setValidation(null);
	}, [logDate, personId, clearGeneration, pathname]);

	const setRow = useCallback((row: LogFormRow) => {
		setFormRow(row);
		setValidation(null);
		setConfirmOpen(false);
	}, []);

	const clickSave = useCallback(() => {
		setValidation(null);
		if (!formRow.gym || !formRow.junk) {
			const missing: string[] = [];
			if (!formRow.gym) missing.push("Gym");
			if (!formRow.junk) missing.push("Junk Food");
			setValidation(`Please select: ${missing.join(" and ")}`);
			setConfirmOpen(false);
			return;
		}
		setConfirmOpen(true);
	}, [formRow.gym, formRow.junk]);

	const cancelConfirm = useCallback(() => {
		setConfirmOpen(false);
	}, []);

	const confirmSave = useCallback(() => {
		if (!personId) return;
		const date = logDate;
		const time = new Date().toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
		const entry: WorkoutEntry = {
			date,
			personId,
			time,
			gym: formRow.gym,
			steps: parseFloat(formRow.steps) || 0,
			junk: formRow.junk,
			pts: calcPts(formRow.gym, formRow.steps, formRow.junk),
			lockedDay: true,
		};

		updateCache((prev) => {
			const idx = prev.entries.findIndex(
				(e) => e.date === date && e.personId === personId,
			);
			const nextEntries =
				idx >= 0
					? prev.entries.map((e, i) => (i === idx ? entry : e))
					: [...prev.entries, entry];
			return { ...prev, entries: nextEntries };
		});

		void postToSheets("saveWorkout", entry);
		setConfirmOpen(false);
	}, [formRow, logDate, personId, postToSheets, updateCache]);

	if (!person) return null;

	return (
		<div>
			<SectionHeader>
				<SectionTitle>Workout log</SectionTitle>
				<SectionSub style={{ fontSize: "1rem" }}>
					{person.name} · {formatDateDisplayYMD(logDate)}
				</SectionSub>
			</SectionHeader>

			<LogDateRow>
				<LogDateLabel htmlFor="log-workout-date">Day</LogDateLabel>
				<LogDateInput
					id="log-workout-date"
					type="date"
					min={minDate}
					max={maxDate}
					value={logDate}
					onChange={(e) => setLogDate(clampWorkoutLogDate(e.target.value))}
				/>
			</LogDateRow>

			<ScoringKey>
				<KeyItem>
					<KeyVal $variant="pos">+1</KeyVal> Went to gym
				</KeyItem>
				<KeyItem>
					<KeyVal $variant="neg">0</KeyVal> Skipped gym
				</KeyItem>
				<KeyItem>
					<KeyVal $variant="pos">+1</KeyVal> Ate clean
				</KeyItem>
				<KeyItem>
					<KeyVal $variant="neg">−1</KeyVal> Ate junk
				</KeyItem>
				<KeyItem>
					<KeyVal $variant="neutral">0–5</KeyVal> Steps (10k = 5pts)
				</KeyItem>
				<KeyItem>
					<KeyVal $variant="blue">★ Free</KeyVal> 5 uses max each
				</KeyItem>
				<KeyItem>
					<KeyVal $variant="purple">0–30</KeyVal> Personal goal
				</KeyItem>
			</ScoringKey>

			<PersonCards>
				<PersonLogCard
					person={person}
					logDate={logDate}
					formRow={formRow}
					entries={entries}
					profiles={profiles}
					validationError={validation}
					showConfirm={confirmOpen}
					onChange={setRow}
					onClickSave={clickSave}
					onConfirmSave={confirmSave}
					onCancelConfirm={cancelConfirm}
				/>
			</PersonCards>

			<GoalBlock>
				<PersonalGoalPanel person={person} logDate={logDate} />
			</GoalBlock>

			<HistoryBlock>
				<SectionHeader style={{ marginBottom: "1rem" }}>
					<div>
						<SectionTitle style={{ fontSize: "clamp(1.15rem, 3vw, 1.5rem)" }}>
							Your past logs
						</SectionTitle>
						<SectionSub>
							Workouts and personal goal entries (newest first).
						</SectionSub>
					</div>
				</SectionHeader>
				<HistoryEntriesTable
					rows={myHistoryRows}
					showPlayerColumn={false}
					emptyMessage="No past entries yet."
					footerProfilePts={profilePtsTotal}
					strikeNonLatestGoalPts
				/>
			</HistoryBlock>
		</div>
	);
}
