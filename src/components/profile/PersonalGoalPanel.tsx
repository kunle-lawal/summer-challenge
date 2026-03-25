import { useCallback, useEffect, useState } from "react";
import { useChallenge } from "../../context/ChallengeContext";
import { PROFILE_MAX_PTS } from "../../lib/config";
import { today } from "../../lib/dates";
import { calcPersonalGoalPts, calcProfilePts, fmtPts } from "../../lib/scoring";
import type { Person, ProfileData, ResetLogEntry } from "../../types";
import type { ProfileInputs } from "../../pages/profilesStyles";
import * as S from "../../pages/profilesStyles";
import * as GH from "./personalGoalHorizontalStyles";

function nowTime(): string {
	return new Date().toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});
}

const emptyInputs: ProfileInputs = {
	goalInput: "",
	startInput: "",
	direction: "down",
	valueInput: "",
};

export function PersonalGoalPanel({
	person,
	logDate,
}: {
	person: Person;
	/** YYYY-MM-DD — same workout log day as `LogDayPage` (today or a recent past day). */
	logDate: string;
}) {
	const { profiles, updateCache, postToSheets, clearGeneration } =
		useChallenge();

	const [inputs, setInputs] = useState<ProfileInputs>(emptyInputs);
	const [confirmValue, setConfirmValue] = useState(false);
	const [valueErr, setValueErr] = useState("");

	const personId = person.id;

	useEffect(() => {
		if (clearGeneration === 0) return;
		setInputs(emptyInputs);
		setConfirmValue(false);
		setValueErr("");
	}, [clearGeneration]);

	useEffect(() => {
		setInputs(emptyInputs);
		setConfirmValue(false);
		setValueErr("");
	}, [personId]);

	useEffect(() => {
		setInputs((s) => ({ ...s, valueInput: "" }));
		setConfirmValue(false);
		setValueErr("");
	}, [logDate]);

	const pData = useCallback(
		(): ProfileData =>
			profiles[personId] ?? {
				goal: null,
				startVal: null,
				direction: "down",
				lockedGoal: false,
				goalResets: 0,
				entries: [],
			},
		[profiles, personId],
	);

	const setProfileDir = useCallback((dir: "down" | "up") => {
		setInputs((s) => ({ ...s, direction: dir }));
	}, []);

	const lockGoal = useCallback(() => {
		const goalVal = parseFloat(inputs.goalInput);
		const startVal = parseFloat(inputs.startInput);
		const direction = inputs.direction || "down";

		if (Number.isNaN(goalVal)) {
			window.alert("Please enter a valid goal value.");
			return;
		}
		if (Number.isNaN(startVal)) {
			window.alert("Please enter a valid starting value.");
			return;
		}

		const existing = profiles[personId] ?? { entries: [], goalResets: 0 };
		const resetCount = existing.goalResets || 0;
		const time = nowTime();
		const date = today();

		const nextProfile: ProfileData = {
			...existing,
			goal: goalVal,
			startVal,
			direction,
			lockedGoal: true,
			goalResets: resetCount,
			entries: existing.entries ?? [],
		};

		const resetEntry: ResetLogEntry = {
			date,
			time,
			personId,
			type: "goal_set",
			goal: goalVal,
			startVal,
			direction,
			setNumber: resetCount + 1,
		};

		updateCache((prev) => ({
			...prev,
			profiles: { ...prev.profiles, [personId]: nextProfile },
			resetLog: [...prev.resetLog, resetEntry],
		}));

		void postToSheets("saveProfile", {
			personId,
			goal: goalVal,
			startVal,
			direction,
			lockedGoal: true,
			goalResets: resetCount,
		});
		void postToSheets("appendResetLog", resetEntry);
	}, [inputs, personId, postToSheets, profiles, updateCache]);

	const askProfileConfirm = useCallback(() => {
		const val = inputs.valueInput;
		setValueErr("");
		if (!val || Number.isNaN(parseFloat(val))) {
			setValueErr("Please enter your current value first.");
			setConfirmValue(false);
			return;
		}
		setConfirmValue(true);
	}, [inputs.valueInput]);

	const saveProfileDay = useCallback(() => {
		const val = parseFloat(inputs.valueInput);
		if (Number.isNaN(val)) return;

		const pd = profiles[personId];
		if (!pd?.lockedGoal) return;

		const date = logDate.slice(0, 10);
		const time = nowTime();
		const list = pd.entries ?? [];
		const idx = list.findIndex((e) => e.date === date);
		const nextEntries =
			idx >= 0
				? list.map((e, i) =>
						i === idx ? { date, value: val, pts: 0, lockedDay: true, time } : e,
					)
				: [...list, { date, value: val, pts: 0, lockedDay: true, time }];

		const nextPd: ProfileData = { ...pd, entries: nextEntries };
		const pts = calcPersonalGoalPts(nextPd);
		const entry = { date, value: val, pts, lockedDay: true, time };
		const nextEntriesWithPts =
			idx >= 0
				? nextEntries.map((e, i) => (i === idx ? entry : e))
				: [...list, entry];

		updateCache((prev) => ({
			...prev,
			profiles: {
				...prev.profiles,
				[personId]: { ...pd, entries: nextEntriesWithPts },
			},
		}));

		void postToSheets("saveGoalDay", {
			date,
			personId,
			time,
			value: val,
			pts,
			lockedDay: true,
		});

		setInputs((s) => ({ ...s, valueInput: "" }));
		setConfirmValue(false);
	}, [
		inputs.valueInput,
		logDate,
		personId,
		postToSheets,
		profiles,
		updateCache,
	]);

	const data = pData();
	const inp = inputs;
	const goalLocked = data.lockedGoal;
	const goal = data.goal;
	const startVal = data.startVal;
	const direction = data.direction || "down";
	const dayStr = logDate.slice(0, 10);
	const isCalendarToday = dayStr === today();
	const entries = data.entries ?? [];
	const dayEntry = entries.find((e) => e.date === dayStr) ?? null;
	const prevEntry =
		entries
			.filter((e) => e.date < dayStr)
			.sort((a, b) => {
				const dc = b.date.localeCompare(a.date);
				if (dc !== 0) return dc;
				return String(b.time).localeCompare(String(a.time));
			})[0] ?? null;

	const lastInputedEntry = dayEntry ?? prevEntry;
	const lastInputedValue = lastInputedEntry?.value ?? startVal ?? null;

	let progressPct = 0;
	let currentPts: number | null = null;
	let rawProgressForComplete: number | null = null;
	if (goalLocked && goal != null && startVal != null) {
		currentPts = dayEntry
			? calcProfilePts(dayEntry.value, goal, startVal, direction)
			: calcPersonalGoalPts(data);
		progressPct = Math.min(
			100,
			Math.round((currentPts / PROFILE_MAX_PTS) * 100),
		);
		if (lastInputedValue != null) {
			rawProgressForComplete = calcProfilePts(
				lastInputedValue,
				goal,
				startVal,
				direction,
			);
		}
	}

	const isComplete =
		rawProgressForComplete != null && rawProgressForComplete >= PROFILE_MAX_PTS;
	const dirLabel = direction === "down" ? "Going down" : "Going up";

	return (
		<div>
			<S.SectionHeader>
				<S.SectionTitle>Personal goal</S.SectionTitle>
				<S.SectionSub>
					Set your goal once — log your current value each day to earn up to 30
					bonus pts
				</S.SectionSub>
			</S.SectionHeader>

			<GH.Card $todaySaved={goalLocked && !!dayEntry}>
				{goalLocked ? (
					<GH.FullSpan>
						<GH.ProgressTrack>
							<GH.ProgressFill
								$complete={isComplete}
								$widthPct={progressPct}
							/>
						</GH.ProgressTrack>
					</GH.FullSpan>
				) : null}

				<GH.PersonCol>
					<GH.PersonName>{person.name}</GH.PersonName>
					<GH.PersonMeta>
						{goalLocked ? (
							<>
								Goal: <GH.GoalPtsLine>{goal}</GH.GoalPtsLine> · Start:{" "}
								{startVal} · {dirLabel}
								<br />
								{progressPct}% of {PROFILE_MAX_PTS} pts
								{data.goalResets > 0 ? (
									<>
										<br />
										Goal reset {data.goalResets} time
										{data.goalResets !== 1 ? "s" : ""}
									</>
								) : null}
							</>
						) : (
							<>
								Choose start, goal, and direction.
								<br />
								Then <GH.GoalPtsLine>Set goal</GH.GoalPtsLine> locks it in.
							</>
						)}
					</GH.PersonMeta>
				</GH.PersonCol>

				<GH.FieldCol>
					<GH.FieldLabel>Starting value</GH.FieldLabel>
					<GH.NumInput
						type="number"
						step="any"
						placeholder="e.g. 192"
						value={
							goalLocked && startVal != null ? String(startVal) : inp.startInput
						}
						disabled={goalLocked}
						onChange={(e) =>
							setInputs((s) => ({ ...s, startInput: e.target.value }))
						}
					/>
				</GH.FieldCol>

				<GH.FieldCol>
					<GH.FieldLabel>Goal value</GH.FieldLabel>
					<GH.NumInput
						type="number"
						step="any"
						placeholder="e.g. 175"
						value={goalLocked && goal != null ? String(goal) : inp.goalInput}
						disabled={goalLocked}
						onChange={(e) =>
							setInputs((s) => ({ ...s, goalInput: e.target.value }))
						}
					/>
				</GH.FieldCol>

				<GH.FieldCol>
					{!goalLocked ? (
						<>
							<GH.FieldLabel>Direction</GH.FieldLabel>
							<GH.DirRow>
								<GH.DirBtn
									type="button"
									$active={inp.direction === "down"}
									onClick={() => setProfileDir("down")}
								>
									Down
								</GH.DirBtn>
								<GH.DirBtn
									type="button"
									$active={inp.direction === "up"}
									onClick={() => setProfileDir("up")}
								>
									Up
								</GH.DirBtn>
							</GH.DirRow>
						</>
					) : (
						<>
							<GH.FieldLabel>Previous day&apos;s value</GH.FieldLabel>
							{prevEntry ? (
								<>
									<GH.LoggedValue>{prevEntry.value}</GH.LoggedValue>
									<GH.LoggedLbl>Previous day · locked</GH.LoggedLbl>
								</>
							) : startVal != null ? (
								<>
									<GH.LoggedValue>{startVal}</GH.LoggedValue>
									<GH.LoggedLbl>Start value · baseline</GH.LoggedLbl>
								</>
							) : null}

							{dayEntry ? (
								<>
									<GH.FieldLabel>
										{isCalendarToday ? "Today's value" : "This day's value"}
									</GH.FieldLabel>
									<GH.LoggedValue>{dayEntry.value}</GH.LoggedValue>
									<GH.LoggedLbl>
										{isCalendarToday
											? "Logged today · locked"
											: "Logged this day · locked"}
									</GH.LoggedLbl>
								</>
							) : (
								<>
									<GH.FieldLabel>
										{isCalendarToday ? "Today's value" : "This day's value"}
									</GH.FieldLabel>
									<GH.NumInput
										type="number"
										step="any"
										placeholder="Current"
										value={inp.valueInput}
										onChange={(e) => {
											setInputs((s) => ({
												...s,
												valueInput: e.target.value,
											}));
											if (confirmValue) setConfirmValue(false);
											setValueErr("");
										}}
									/>
								</>
							)}
						</>
					)}
				</GH.FieldCol>

				<GH.PtsCol>
					{currentPts != null ? (
						<GH.GoalPts>{fmtPts(currentPts)}</GH.GoalPts>
					) : (
						<GH.GoalPtsMuted>—</GH.GoalPtsMuted>
					)}
					<GH.GoalPtsLabel>
						{dayEntry ? "pts earned" : goalLocked ? "goal pts" : "preview"}
					</GH.GoalPtsLabel>
				</GH.PtsCol>

				<GH.SaveCol>
					{!goalLocked ? (
						<GH.PrimaryBtn
							type="button"
							onClick={lockGoal}
						>
							Set goal
						</GH.PrimaryBtn>
					) : dayEntry ? (
						<GH.PrimaryBtn
							type="button"
							$saved
							disabled
						>
							Saved ✓
						</GH.PrimaryBtn>
					) : (
						<GH.PrimaryBtn
							type="button"
							onClick={askProfileConfirm}
						>
							Save value
						</GH.PrimaryBtn>
					)}
				</GH.SaveCol>

				{confirmValue ? (
					<GH.FullSpan>
						<S.ProfileConfirmBar>
							<span>
								Once saved you can&apos;t update this day&apos;s value. Lock it
								in?
							</span>
							<S.ConfirmBtns>
								<S.BtnGhost
									type="button"
									onClick={() => setConfirmValue(false)}
								>
									Cancel
								</S.BtnGhost>
								<S.BtnGold
									type="button"
									onClick={saveProfileDay}
								>
									Lock In
								</S.BtnGold>
							</S.ConfirmBtns>
						</S.ProfileConfirmBar>
					</GH.FullSpan>
				) : null}

				{valueErr ? (
					<GH.FullSpan>
						<GH.ValErr>{valueErr}</GH.ValErr>
					</GH.FullSpan>
				) : null}

				{!goalLocked ? (
					<GH.FullSpan>
						<GH.HintRow>One lock per goal — same rules as before.</GH.HintRow>
					</GH.FullSpan>
				) : !dayEntry ? (
					<GH.FullSpan>
						<GH.HintRow>
							{isCalendarToday
								? "Save value locks today — you won't be able to edit until tomorrow."
								: "Save value locks this day — pick another day in the log to edit a different day."}
						</GH.HintRow>
					</GH.FullSpan>
				) : null}
			</GH.Card>
		</div>
	);
}
