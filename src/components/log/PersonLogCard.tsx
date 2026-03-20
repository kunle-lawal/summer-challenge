import { useMemo } from "react";
import styled from "styled-components";
import { FREE_LIMIT } from "../../lib/config";
import { today } from "../../lib/dates";
import {
	calcPersonalGoalPtsForDay,
	calcPts,
	fmtPts,
	getFreeCounts,
	getWindowLimits,
	ptsClass,
} from "../../lib/scoring";
import type { PtsTone } from "../../lib/scoring";
import type { Person, ProfileData, WorkoutEntry } from "../../types";

const Card = styled.div<{ $saved: boolean }>`
	background: ${({ theme }) => theme.color.surface};
	border: 1px solid
		${({ theme, $saved }) =>
			$saved ? "rgba(74,222,128,0.25)" : theme.color.border};
	border-radius: 14px;
	padding: 1.1rem 1.25rem;
	display: grid;
	grid-template-columns: 130px 1fr 130px 1fr 72px 120px;
	align-items: center;
	gap: 14px;
	transition: border-color 0.15s;

	&:hover {
		border-color: ${({ theme, $saved }) =>
			$saved ? "rgba(74,222,128,0.25)" : theme.color.border2};
	}

	${({ $saved }) =>
		$saved &&
		`
    background: rgba(74,222,128,0.03);
  `}

	@media (max-width: 740px) {
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
`;

const PersonName = styled.div`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	color: ${({ theme }) => theme.color.text};
`;

const PersonFree = styled.div`
	font-size: 0.6rem;
	color: ${({ theme }) => theme.color.muted};
	margin-top: 4px;
	line-height: 1.7;
`;

const FieldLabel = styled.div`
	font-size: 0.6rem;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	color: ${({ theme }) => theme.color.muted};
	margin-bottom: 5px;
	display: flex;
	gap: 4px;
`;

const selectArrow = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6560' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E`;

type SelectTone = "none" | "green" | "red";

const FieldSelect = styled.select<{ $tone: SelectTone }>`
	width: 100%;
	background: ${({ theme, $tone }) =>
		$tone === "green" ? theme.color.greenDim : theme.color.surface2};
	border: 1px solid
		${({ theme, $tone }) =>
			$tone === "green"
				? theme.color.green
				: $tone === "red"
					? theme.color.red
					: theme.color.border2};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 8px 28px 8px 10px;
	font-family: ${({ theme }) => theme.font.body};
	font-size: 0.8rem;
	color: ${({ theme, $tone }) =>
		$tone === "green"
			? theme.color.green
			: $tone === "red"
				? theme.color.red
				: theme.color.text};
	cursor: pointer;
	outline: none;
	appearance: none;
	background-image: url("data:image/svg+xml,${selectArrow}");
	background-repeat: no-repeat;
	background-position: right 10px center;
	transition: border-color 0.12s;

	&:focus {
		border-color: ${({ theme }) => theme.color.gold};
	}

	&:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
`;

const StepsWrap = styled.div`
	display: flex;
	flex-direction: column;
`;

const StepsHint = styled.div`
	font-size: 0.58rem;
	color: ${({ theme }) => theme.color.muted};
`;

const NumberInput = styled.input`
	background: ${({ theme }) => theme.color.surface2};
	border: 1px solid ${({ theme }) => theme.color.border2};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 8px 10px;
	font-family: ${({ theme }) => theme.font.body};
	font-size: 0.8rem;
	color: ${({ theme }) => theme.color.text};
	width: 100%;
	outline: none;
	transition: border-color 0.12s;

	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}

	&:focus {
		border-color: ${({ theme }) => theme.color.gold};
	}

	&:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
`;

const PtsCol = styled.div`
	text-align: right;

	@media (max-width: 740px) {
		grid-column: span 2;
	}
`;

const DailyPts = styled.div<{ $tone: PtsTone }>`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 1.1rem;
	font-weight: 700;
	line-height: 1;
	color: ${({ theme, $tone }) =>
		$tone === "pos"
			? theme.color.green
			: $tone === "neg"
				? theme.color.red
				: theme.color.muted2};
`;

const DailyPtsLabel = styled.div`
	font-size: 0.58rem;
	color: ${({ theme }) => theme.color.muted};
	margin-top: 3px;
`;

const SaveBtn = styled.button<{ $saved?: boolean }>`
	background: ${({ theme, $saved }) =>
		$saved ? theme.color.greenDim : theme.color.gold};
	color: ${({ theme, $saved }) =>
		$saved ? theme.color.green : theme.color.bg};
	border: ${({ $saved }) =>
		$saved ? "1px solid rgba(74,222,128,0.3)" : "none"};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 9px 0;
	width: 100%;
	font-family: ${({ theme }) => theme.font.display};
	font-size: 0.62rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	cursor: ${({ $saved }) => ($saved ? "default" : "pointer")};
	transition: opacity 0.15s;
	text-transform: uppercase;

	&:hover:not(:disabled) {
		opacity: 0.85;
	}

	&:disabled {
		opacity: 0.85;
	}
`;

const SaveCol = styled.div`
	@media (max-width: 740px) {
		grid-column: span 2;
	}
`;

const WindowWarn = styled.div`
	font-size: 0.58rem;
	color: ${({ theme }) => theme.color.gold};
	margin-top: 3px;
	letter-spacing: 0.02em;
`;

const ValidationMsg = styled.div`
	grid-column: 1 / -1;
	font-size: 0.72rem;
	color: ${({ theme }) => theme.color.red};
	padding: 2px;
`;

const ConfirmBar = styled.div`
	grid-column: 1 / -1;
	background: rgba(232, 160, 32, 0.08);
	border: 1px solid rgba(232, 160, 32, 0.3);
	border-radius: 10px;
	padding: 10px 14px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 0.78rem;
	color: ${({ theme }) => theme.color.muted2};
`;

const ConfirmBtns = styled.div`
	display: flex;
	gap: 8px;
	flex-shrink: 0;
`;

const BtnGold = styled.button`
	background: ${({ theme }) => theme.color.gold};
	color: ${({ theme }) => theme.color.bg};
	border: none;
	border-radius: ${({ theme }) => theme.radii.sm};
	padding: 6px 16px;
	font-family: ${({ theme }) => theme.font.display};
	font-size: 0.6rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	cursor: pointer;
	text-transform: uppercase;
`;

const BtnGhost = styled.button`
	background: none;
	border: 1px solid ${({ theme }) => theme.color.border2};
	border-radius: ${({ theme }) => theme.radii.sm};
	padding: 6px 14px;
	font-family: ${({ theme }) => theme.font.body};
	font-size: 0.75rem;
	color: ${({ theme }) => theme.color.muted2};
	cursor: pointer;

	&:hover {
		background: ${({ theme }) => theme.color.surface2};
		color: ${({ theme }) => theme.color.text};
	}
`;

const GoalPtsLine = styled.span`
	color: ${({ theme }) => theme.color.purple};
`;

function selectTone(field: "gym" | "junk", val: string): SelectTone {
	if (!val) return "none";
	if (field === "gym") {
		if (val === "went" || val === "free-gym") return "green";
		if (val === "skip") return "red";
	}
	if (field === "junk") {
		if (val === "clean" || val === "free-junk") return "green";
		if (val === "ate") return "red";
	}
	return "none";
}

export interface LogFormRow {
	gym: string;
	steps: string;
	junk: string;
}

export function PersonLogCard({
	person,
	formRow,
	entries,
	profiles,
	validationError,
	showConfirm,
	onChange,
	onClickSave,
	onConfirmSave,
	onCancelConfirm,
}: {
	person: Person;
	formRow: LogFormRow;
	entries: WorkoutEntry[];
	profiles: Record<string, ProfileData | undefined>;
	validationError: string | null;
	showConfirm: boolean;
	onChange: (row: LogFormRow) => void;
	onClickSave: () => void;
	onConfirmSave: () => void;
	onCancelConfirm: () => void;
}) {
	const date = today();

	const freeCounts = useMemo(() => getFreeCounts(entries), [entries]);
	const fc = freeCounts[person.id] ?? { gym: 0, junk: 0 };
	const gymFreeLeft = FREE_LIMIT - fc.gym;
	const junkFreeLeft = FREE_LIMIT - fc.junk;

	const alreadySaved = entries.some(
		(e) => e.date === date && e.personId === person.id,
	);
	const savedEntry =
		entries.find((e) => e.date === date && e.personId === person.id) ?? null;

	const hasValues = Boolean(formRow.gym && formRow.junk);
	const livePts = hasValues
		? calcPts(formRow.gym, formRow.steps, formRow.junk)
		: null;
	const dayWorkoutPts = alreadySaved && savedEntry ? savedEntry.pts : livePts;

	const profileData = profiles[person.id];
	const profileToday = profileData?.entries?.find((e) => e.date === date);
	const profilePts =
		profileToday && profileData
			? calcPersonalGoalPtsForDay(profileData, profileToday.value, date)
			: null;

	const wl = getWindowLimits(entries, person.id);
	const gymWentDisabled = wl.gymMaxed;
	const gymFreeDisabled = wl.gymMaxed || gymFreeLeft <= 0;
	const junkCleanDisabled = wl.cleanMaxed;
	const junkFreeDisabled = wl.cleanMaxed || junkFreeLeft <= 0;

	const gymSelectDisabled = alreadySaved;
	const junkSelectDisabled = alreadySaved;

	const gymWentLabel = gymWentDisabled
		? "✓ Went (week limit reached)"
		: "✓ Went (+1)";
	const gymFreeLabel = gymFreeDisabled
		? `★ Free (${wl.gymMaxed ? "week limit" : "none left"})`
		: "★ Free (+1)";
	const junkCleanLabel = junkCleanDisabled
		? "✓ Ate Clean (week limit reached)"
		: "✓ Ate Clean (+1)";
	const junkFreeLabel = junkFreeDisabled
		? `★ Free (${wl.cleanMaxed ? "week limit" : "none left"})`
		: "★ Free (+1)";

	const ptsDisplayTone: PtsTone =
		dayWorkoutPts != null ? ptsClass(dayWorkoutPts) : "zero";

	return (
		<Card $saved={alreadySaved}>
			<div>
				<PersonName>{person.name}</PersonName>
				<PersonFree>
					Week {wl.windowNum} · Gym: {wl.gymDays}/4
					<br />
					Gym: {wl.gymDays}/4 · Clean: {wl.cleanDays}/6
					<br />
					Free: Gym {gymFreeLeft}/5 · Junk {junkFreeLeft}/5
					{profilePts != null && (
						<>
							<br />
							<GoalPtsLine>Goal: {fmtPts(profilePts)} pts</GoalPtsLine>
						</>
					)}
				</PersonFree>
			</div>

			<div>
				<FieldLabel>Gym</FieldLabel>
				<FieldSelect
					$tone={selectTone("gym", formRow.gym)}
					value={formRow.gym}
					disabled={gymSelectDisabled}
					onChange={(e) => onChange({ ...formRow, gym: e.target.value })}
				>
					<option value="">— select —</option>
					<option
						value="went"
						disabled={gymWentDisabled}
					>
						{gymWentLabel}
					</option>
					<option value="skip">✗ Skipped (0)</option>
					<option
						value="free-gym"
						disabled={gymFreeDisabled}
					>
						{gymFreeLabel}
					</option>
				</FieldSelect>
				{wl.gymMaxed ? (
					<WindowWarn>4/4 gym days used this week</WindowWarn>
				) : null}
			</div>

			<StepsWrap>
				<FieldLabel>
					Steps <StepsHint>10k = 5pts</StepsHint>
				</FieldLabel>
				<NumberInput
					type="number"
					min={0}
					max={99999}
					placeholder="0"
					value={formRow.steps}
					disabled={alreadySaved}
					onChange={(e) => onChange({ ...formRow, steps: e.target.value })}
				/>
			</StepsWrap>

			<div>
				<FieldLabel>Junk Food</FieldLabel>
				<FieldSelect
					$tone={selectTone("junk", formRow.junk)}
					value={formRow.junk}
					disabled={junkSelectDisabled}
					onChange={(e) => onChange({ ...formRow, junk: e.target.value })}
				>
					<option value="">— select —</option>
					<option
						value="clean"
						disabled={junkCleanDisabled}
					>
						{junkCleanLabel}
					</option>
					<option value="ate">✗ Ate Junk (−1)</option>
					<option
						value="free-junk"
						disabled={junkFreeDisabled}
					>
						{junkFreeLabel}
					</option>
				</FieldSelect>
				{wl.cleanMaxed ? (
					<WindowWarn>6/6 clean days used this week</WindowWarn>
				) : null}
			</div>

			<PtsCol>
				<DailyPts $tone={ptsDisplayTone}>
					{dayWorkoutPts != null ? fmtPts(dayWorkoutPts) : "—"}
				</DailyPts>
				<DailyPtsLabel>
					{alreadySaved ? "saved workout pts" : "pts today"}
				</DailyPtsLabel>
			</PtsCol>

			<SaveCol>
				{alreadySaved ? (
					<SaveBtn
						$saved
						disabled
					>
						Saved ✓
					</SaveBtn>
				) : (
					<SaveBtn
						type="button"
						onClick={onClickSave}
					>
						Save Day
					</SaveBtn>
				)}
			</SaveCol>

			{validationError ? (
				<ValidationMsg>{validationError}</ValidationMsg>
			) : null}
			{showConfirm ? (
				<ConfirmBar>
					<span>
						Once saved you can&apos;t update today&apos;s entry. Lock it in?
					</span>
					<ConfirmBtns>
						<BtnGhost
							type="button"
							onClick={onCancelConfirm}
						>
							Cancel
						</BtnGhost>
						<BtnGold
							type="button"
							onClick={onConfirmSave}
						>
							Lock In
						</BtnGold>
					</ConfirmBtns>
				</ConfirmBar>
			) : null}
		</Card>
	);
}
