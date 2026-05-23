/**
 * RuleEditor — inline sheet for creating or editing any of the 6 rule kinds.
 *
 * Usage:
 *   <RuleEditor
 *     rule={editingRule}          // null = creating new
 *     allRules={challenge.config.rules}  // needed for streak ruleRef selector
 *     onSave={handleSave}
 *     onDelete={handleDelete}     // omit to hide delete button
 *     onClose={closeEditor}
 *   />
 */
import { useState } from "react";
import { nanoid } from "nanoid";
import styled from "styled-components";
import type { Rule, RuleKind } from "@/types";
import { ArrowIcon, XIcon } from "@/components/ui/Icons";
import {
	RULE_KIND_INFO,
	exampleRuleForKind,
	normalizeRuleForEdit,
} from "@/lib/rules/ruleDocs";

// ── Styled primitives ──────────────────────────────────────────────────────────

const Overlay = styled.div`
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.25);
	z-index: 200;
	display: flex;
	align-items: flex-end;

	@media (min-width: 768px) {
		align-items: center;
		justify-content: center;
	}
`;

const Sheet = styled.div`
	background: ${({ theme }) => theme.color.bg};
	border-radius: 16px 16px 0 0;
	width: 100%;
	max-width: 480px;
	max-height: 92dvh;
	overflow-y: auto;
	display: flex;
	flex-direction: column;

	@media (min-width: 768px) {
		border-radius: 16px;
		max-width: 520px;
		max-height: 88dvh;
	}
`;

const Hd = styled.header`
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 16px;
	border-bottom: 1px solid ${({ theme }) => theme.color.hair};
	background: ${({ theme }) => theme.color.bg};
	position: sticky;
	top: 0;
	z-index: 10;
`;

const Eyebrow = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
`;

const H2 = styled.h2`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 20px;
	font-weight: 400;
	color: ${({ theme }) => theme.color.ink};
`;

const Body = styled.div`
	padding: 16px 16px 32px;
	display: flex;
	flex-direction: column;
	gap: 14px;
`;

const IconBtn = styled.button`
	width: 36px;
	height: 36px;
	border-radius: ${({ theme }) => theme.radii.md};
	background: ${({ theme }) => theme.color.surface};
	border: 1px solid ${({ theme }) => theme.color.hair};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: ${({ theme }) => theme.color.ink};
	svg {
		width: 18px;
		height: 18px;
		stroke: currentColor;
		stroke-width: 1.6;
		fill: none;
	}
	flex-shrink: 0;
`;

const SectionLbl = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
	padding: 6px 0 2px;
	border-top: 1px solid ${({ theme }) => theme.color.hair};
	margin-top: 4px;
`;

const Field = styled.div`
	display: flex;
	flex-direction: column;
	gap: 5px;
`;

const Label = styled.label`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
`;

const Input = styled.input`
	border: 1px solid ${({ theme }) => theme.color.hair2};
	background: ${({ theme }) => theme.color.surface};
	font: 400 15px/1.3 ${({ theme }) => theme.font.body};
	color: ${({ theme }) => theme.color.ink};
	padding: 10px 12px;
	border-radius: ${({ theme }) => theme.radii.md};
	outline: none;
	width: 100%;
	&:focus {
		border-color: ${({ theme }) => theme.color.ink};
	}
`;

const NumInput = styled(Input).attrs({ type: "number" })``;

const Select = styled.select`
	border: 1px solid ${({ theme }) => theme.color.hair2};
	background: ${({ theme }) => theme.color.surface};
	font: 400 15px/1.3 ${({ theme }) => theme.font.body};
	color: ${({ theme }) => theme.color.ink};
	padding: 10px 12px;
	border-radius: ${({ theme }) => theme.radii.md};
	outline: none;
	width: 100%;
	&:focus {
		border-color: ${({ theme }) => theme.color.ink};
	}
`;

const Row = styled.div`
	display: flex;
	gap: 10px;
	& > * {
		flex: 1;
	}
`;

const ToggleRow = styled.label`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 12px;
	background: ${({ theme }) => theme.color.surface};
	border: 1px solid ${({ theme }) => theme.color.hair};
	border-radius: ${({ theme }) => theme.radii.md};
	cursor: pointer;
	font-size: 14px;
	color: ${({ theme }) => theme.color.ink};
	user-select: none;
`;

const Toggle = styled.input.attrs({ type: "checkbox" })`
	width: 36px;
	height: 20px;
	appearance: none;
	border-radius: 10px;
	background: ${({ theme }) => theme.color.hair2};
	cursor: pointer;
	position: relative;
	transition: background 0.15s;
	&:checked {
		background: ${({ theme }) => theme.color.ink};
	}
	&::after {
		content: "";
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #fff;
		top: 3px;
		left: 3px;
		transition: left 0.15s;
	}
	&:checked::after {
		left: 19px;
	}
`;

const KindGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 6px;
`;

const KindBtn = styled.button<{ $active: boolean }>`
	appearance: none;
	padding: 10px 8px;
	border-radius: ${({ theme }) => theme.radii.md};
	border: 1px solid
		${({ $active, theme }) => ($active ? theme.color.ink : theme.color.hair2)};
	background: ${({ $active, theme }) =>
		$active ? theme.color.ink : theme.color.surface};
	color: ${({ $active, theme }) =>
		$active ? theme.color.surface : theme.color.ink};
	font: 500 12.5px/1.3 ${({ theme }) => theme.font.body};
	cursor: pointer;
	text-align: center;
	transition: all 0.1s;
`;

const BtnRow = styled.div`
	display: flex;
	gap: 8px;
	margin-top: 8px;
`;

const Btn = styled.button<{ $variant?: "k" | "ghost" | "danger" }>`
	appearance: none;
	flex: 1;
	padding: 14px;
	border-radius: ${({ theme }) => theme.radii.md};
	border: 1px solid
		${({ $variant, theme }) =>
			$variant === "danger"
				? theme.color.bad
				: $variant === "k"
					? theme.color.ink
					: theme.color.hair2};
	background: ${({ $variant, theme }) =>
		$variant === "k"
			? theme.color.ink
			: $variant === "danger"
				? `${theme.color.bad}15`
				: "transparent"};
	color: ${({ $variant, theme }) =>
		$variant === "k"
			? theme.color.surface
			: $variant === "danger"
				? theme.color.bad
				: theme.color.ink};
	font: 500 14px/1 ${({ theme }) => theme.font.body};
	cursor: pointer;
	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
`;

const Hint = styled.p`
	font-size: 12px;
	color: ${({ theme }) => theme.color.ink3};
	line-height: 1.5;
	margin-top: -6px;
`;

const KindDesc = styled(Hint)`
	margin-top: 0;
	padding: 10px 12px;
	background: ${({ theme }) => theme.color.surface2};
	border-radius: ${({ theme }) => theme.radii.md};
	border: 1px solid ${({ theme }) => theme.color.hair};
`;

const ExampleBtn = styled.button`
	appearance: none;
	align-self: flex-start;
	padding: 6px 10px;
	border-radius: ${({ theme }) => theme.radii.md};
	border: 1px dashed ${({ theme }) => theme.color.hair2};
	background: transparent;
	font: 500 12px/1 ${({ theme }) => theme.font.body};
	color: ${({ theme }) => theme.color.ink2};
	cursor: pointer;
	&:hover {
		border-color: ${({ theme }) => theme.color.ink3};
		color: ${({ theme }) => theme.color.ink};
	}
`;

const ErrMsg = styled.p`
	font-size: 13px;
	color: ${({ theme }) => theme.color.bad};
`;

// ── Helpers ────────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<RuleKind, string> = {
	binary: "Binary\n(yes/no)",
	counter: "Counter\n(number)",
	range: "Range\n(band)",
	penalty: "Penalty\n(bad thing)",
	streak: "Streak\n(bonus)",
	tracker: "Tracker\n(goal)",
};

function defaultForKind(kind: RuleKind, id: string, order: number): Rule {
	switch (kind) {
		case "binary":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				pointsYes: 1,
				pointsNo: 0,
				pointsFree: 1,
				freePasses: null,
				weeklyCap: null,
			};
		case "counter":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				target: 10000,
				maxPoints: 5,
				unit: "units",
				decimals: 0,
			};
		case "range":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				min: 5,
				max: 8,
				pointsAtMin: 1,
				pointsAtMax: 4,
				pointsOutside: 0,
				unit: "units",
				decimals: 1,
			};
		case "penalty":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				pointsClean: 1,
				pointsPerInfraction: -1,
				pointsFree: 1,
				weeklyFirstWaived: true,
				freePasses: null,
			};
		case "streak":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				ruleRef: "",
				daysRequired: 7,
				bonusPoints: 5,
				repeatable: true,
			};
		case "tracker":
			return {
				id,
				kind,
				name: "",
				emoji: "",
				order,
				maxPoints: 30,
				unit: "units",
				decimals: 1,
			};
	}
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
	/** The rule to edit, or null to create a new one. */
	rule: Rule | null;
	/** All rules in the challenge — for the streak ruleRef selector. */
	allRules: Rule[];
	/** Called with the final rule object. */
	onSave: (rule: Rule) => void;
	/** Called when user taps Delete. Omit to hide the button. */
	onDelete?: () => void;
	onClose: () => void;
}

export function RuleEditor({
	rule,
	allRules,
	onSave,
	onDelete,
	onClose,
}: Props) {
	const isNew = rule === null;
	const nextOrder = allRules.length;

	const [kind, setKind] = useState<RuleKind>(rule?.kind ?? "binary");
	const [draft, setDraft] = useState<Rule>(() =>
		normalizeRuleForEdit(
			rule ?? defaultForKind("binary", nanoid(), nextOrder),
		),
	);
	const [error, setError] = useState<string | null>(null);

	// When kind changes (only for new rules), reset draft to defaults
	function handleKindChange(k: RuleKind) {
		setKind(k);
		setDraft(defaultForKind(k, draft.id, draft.order));
		setError(null);
	}

	function handleLoadExample() {
		const streakRef =
			allRules.find((r) => r.kind === "binary" && r.id !== draft.id)?.id ??
			allRules.find((r) => r.id !== draft.id && r.kind !== "streak")?.id ??
			"";
		setDraft(
			exampleRuleForKind(draft.kind, draft.id, draft.order, streakRef),
		);
		setError(null);
	}

	// Generic field updater — uses unknown to handle discriminated union fields
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function set(field: string, value: any) {
		setDraft((d) => ({ ...d, [field]: value }) as Rule);
	}

	function setNum(field: string, raw: string) {
		const n = parseFloat(raw);
		setDraft((d) => ({ ...d, [field]: isNaN(n) ? 0 : n }) as Rule);
	}

	function handleSave() {
		if (!draft.name.trim()) {
			setError("Rule name is required.");
			return;
		}
		if (draft.kind === "streak" && !draft.ruleRef) {
			setError("Select a rule to track.");
			return;
		}
		if (draft.kind === "range" && draft.min >= draft.max) {
			setError("Band max must be greater than band min.");
			return;
		}
		onSave({ ...draft, name: draft.name.trim() });
	}

	return (
		<Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
			<Sheet>
				<Hd>
					<IconBtn
						onClick={onClose}
						aria-label="Close"
					>
						<ArrowIcon />
					</IconBtn>
					<div style={{ flex: 1, minWidth: 0 }}>
						<Eyebrow>{isNew ? "Add rule" : "Edit rule"}</Eyebrow>
						<H2>{draft.name || (isNew ? "New rule" : "Edit")}</H2>
					</div>
					{!isNew && onDelete && (
						<IconBtn
							onClick={onClose}
							aria-label="Delete rule"
							style={{ color: "var(--bad)", borderColor: "var(--bad-tint)" }}
						>
							<XIcon />
						</IconBtn>
					)}
				</Hd>

				<Body>
					{/* Kind selector — only when creating */}
					{isNew && (
						<>
							<SectionLbl>Rule type</SectionLbl>
							<KindGrid>
								{(Object.keys(KIND_LABELS) as RuleKind[]).map((k) => (
									<KindBtn
										key={k}
										$active={kind === k}
										onClick={() => handleKindChange(k)}
									>
										{KIND_LABELS[k].split("\n").map((line, i) => (
											<span
												key={i}
												style={{
													display: "block",
													fontSize: i === 0 ? "12.5px" : "11px",
													opacity: i === 0 ? 1 : 0.6,
												}}
											>
												{line}
											</span>
										))}
									</KindBtn>
								))}
							</KindGrid>
							<KindDesc>{RULE_KIND_INFO[kind].description}</KindDesc>
							<ExampleBtn type="button" onClick={handleLoadExample}>
								Load example: {exampleRuleForKind(kind, "x", 0).name}
							</ExampleBtn>
						</>
					)}

					{!isNew && (
						<KindDesc>{RULE_KIND_INFO[draft.kind].description}</KindDesc>
					)}

					{/* Common fields */}
					<SectionLbl>Basic</SectionLbl>
					<Row>
						<Field style={{ flex: 3 }}>
							<Label>Name</Label>
							<Input
								value={draft.name}
								onChange={(e) => set("name", e.target.value)}
								placeholder="e.g. Gym, Steps, Sleep"
								autoFocus={isNew}
							/>
						</Field>
						<Field style={{ flex: 1 }}>
							<Label>Emoji</Label>
							<Input
								value={draft.emoji ?? ""}
								onChange={(e) => set("emoji", e.target.value)}
								placeholder="🏋️"
								maxLength={4}
							/>
						</Field>
					</Row>

					{/* Kind-specific fields */}
					{draft.kind === "binary" && (
						<>
							<SectionLbl>Scoring</SectionLbl>
							<Hint>
								Yes earns points; No typically earns zero. Free passes score
								like Yes but use a limited lifetime quota.
							</Hint>
							<Row>
								<Field>
									<Label>Points (yes)</Label>
									<NumInput
										value={draft.pointsYes}
										onChange={(e) => setNum("pointsYes", e.target.value)}
										min={-99}
										max={99}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Points (no)</Label>
									<NumInput
										value={draft.pointsNo}
										onChange={(e) => setNum("pointsNo", e.target.value)}
										min={-99}
										max={99}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Points (free)</Label>
									<NumInput
										value={draft.pointsFree}
										onChange={(e) => setNum("pointsFree", e.target.value)}
										min={-99}
										max={99}
										step={0.5}
									/>
								</Field>
							</Row>

							<SectionLbl>Limits</SectionLbl>
							<Field>
								<Label>Weekly cap (scoring days, 0 = off)</Label>
								<NumInput
									value={draft.weeklyCap?.maxScoringDays ?? 0}
									onChange={(e) => {
										const n = parseInt(e.target.value);
										set("weeklyCap", n > 0 ? { maxScoringDays: n } : null);
									}}
									min={0}
									max={7}
									step={1}
								/>
							</Field>
							<Field>
								<Label>Lifetime free passes (0 = off)</Label>
								<NumInput
									value={draft.freePasses?.count ?? 0}
									onChange={(e) => {
										const n = parseInt(e.target.value);
										set(
											"freePasses",
											n > 0 ? { count: n, lifetime: true } : null,
										);
									}}
									min={0}
									max={99}
									step={1}
								/>
							</Field>
						</>
					)}

					{draft.kind === "counter" && (
						<>
							<SectionLbl>Metric</SectionLbl>
							<Hint>
								Points scale linearly from 0 at zero up to max points when the
								target is reached. Example: 10,000 steps = 5 pts.
							</Hint>
							<Row>
								<Field>
									<Label>Target</Label>
									<NumInput
										value={draft.target}
										onChange={(e) => setNum("target", e.target.value)}
										min={1}
									/>
								</Field>
								<Field>
									<Label>Unit</Label>
									<Input
										value={draft.unit}
										onChange={(e) => set("unit", e.target.value)}
										placeholder="steps"
									/>
								</Field>
							</Row>
							<Row>
								<Field>
									<Label>Max points</Label>
									<NumInput
										value={draft.maxPoints}
										onChange={(e) => setNum("maxPoints", e.target.value)}
										min={0}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Decimals</Label>
									<NumInput
										value={draft.decimals}
										onChange={(e) => setNum("decimals", e.target.value)}
										min={0}
										max={3}
										step={1}
									/>
								</Field>
							</Row>
						</>
					)}

					{draft.kind === "range" && (
						<>
							<SectionLbl>Target band</SectionLbl>
							<Hint>
								Values inside the band earn points on a sliding scale — minimum
								points at the low end, maximum at the high end (e.g. 5–8 hrs →
								1–4 pts). Outside the band uses the outside score.
							</Hint>
							<Row>
								<Field>
									<Label>Band min</Label>
									<NumInput
										value={draft.min}
										onChange={(e) => setNum("min", e.target.value)}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Band max</Label>
									<NumInput
										value={draft.max}
										onChange={(e) => setNum("max", e.target.value)}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Unit</Label>
									<Input
										value={draft.unit}
										onChange={(e) => set("unit", e.target.value)}
										placeholder="hours"
									/>
								</Field>
							</Row>
							<SectionLbl>Scoring</SectionLbl>
							<Row>
								<Field>
									<Label>Points at band min</Label>
									<NumInput
										value={draft.pointsAtMin}
										onChange={(e) => setNum("pointsAtMin", e.target.value)}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Points at band max</Label>
									<NumInput
										value={draft.pointsAtMax}
										onChange={(e) => setNum("pointsAtMax", e.target.value)}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Points outside band</Label>
									<NumInput
										value={draft.pointsOutside}
										onChange={(e) => setNum("pointsOutside", e.target.value)}
										step={0.5}
									/>
								</Field>
							</Row>
							<Row>
								<Field>
									<Label>Decimals</Label>
									<NumInput
										value={draft.decimals}
										onChange={(e) => setNum("decimals", e.target.value)}
										min={0}
										max={3}
										step={1}
									/>
								</Field>
							</Row>
						</>
					)}

					{draft.kind === "penalty" && (
						<>
							<SectionLbl>Scoring</SectionLbl>
							<Hint>
								Clean days earn positive points; each slip costs points. The
								first slip each week can be waived to zero.
							</Hint>
							<Row>
								<Field>
									<Label>Points (clean)</Label>
									<NumInput
										value={draft.pointsClean}
										onChange={(e) => setNum("pointsClean", e.target.value)}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Per infraction</Label>
									<NumInput
										value={draft.pointsPerInfraction}
										onChange={(e) =>
											setNum("pointsPerInfraction", e.target.value)
										}
										step={0.5}
									/>
								</Field>
								<Field>
									<Label>Points (free)</Label>
									<NumInput
										value={draft.pointsFree}
										onChange={(e) => setNum("pointsFree", e.target.value)}
										step={0.5}
									/>
								</Field>
							</Row>

							<SectionLbl>Limits</SectionLbl>
							<ToggleRow>
								Waive first infraction each week
								<Toggle
									checked={draft.weeklyFirstWaived}
									onChange={(e) => set("weeklyFirstWaived", e.target.checked)}
								/>
							</ToggleRow>
							<Field>
								<Label>Lifetime free passes (0 = off)</Label>
								<NumInput
									value={draft.freePasses?.count ?? 0}
									onChange={(e) => {
										const n = parseInt(e.target.value);
										set(
											"freePasses",
											n > 0 ? { count: n, lifetime: true } : null,
										);
									}}
									min={0}
									max={99}
									step={1}
								/>
							</Field>
						</>
					)}

					{draft.kind === "streak" && (
						<>
							<SectionLbl>Streak target</SectionLbl>
							<Hint>
								Pick a rule to watch (e.g. Gym). When a member hits it N days
								in a row, they earn a one-time bonus for that streak.
							</Hint>
							<Field>
								<Label>Track rule</Label>
								{allRules.filter(
									(r) => r.id !== draft.id && r.kind !== "streak",
								).length === 0 ? (
									<Hint>
										Add other rules first — streak rules reference them.
									</Hint>
								) : (
									<Select
										value={draft.ruleRef}
										onChange={(e) => set("ruleRef", e.target.value)}
									>
										<option value="">— pick a rule —</option>
										{allRules
											.filter((r) => r.id !== draft.id && r.kind !== "streak")
											.map((r) => (
												<option
													key={r.id}
													value={r.id}
												>
													{r.emoji ? `${r.emoji} ` : ""}
													{r.name}
												</option>
											))}
									</Select>
								)}
							</Field>
							<Row>
								<Field>
									<Label>Days required</Label>
									<NumInput
										value={draft.daysRequired}
										onChange={(e) => setNum("daysRequired", e.target.value)}
										min={2}
										max={365}
										step={1}
									/>
								</Field>
								<Field>
									<Label>Bonus points</Label>
									<NumInput
										value={draft.bonusPoints}
										onChange={(e) => setNum("bonusPoints", e.target.value)}
										min={0}
										step={0.5}
									/>
								</Field>
							</Row>
							<ToggleRow>
								Repeatable (re-triggers every {draft.daysRequired} days)
								<Toggle
									checked={draft.repeatable}
									onChange={(e) => set("repeatable", e.target.checked)}
								/>
							</ToggleRow>
						</>
					)}

					{draft.kind === "tracker" && (
						<>
							<SectionLbl>Scoring</SectionLbl>
							<Hint>
								Members pick their own goal the first time they log — weight
								loss, strength PR, body measurements, etc. You define how many
								points reaching that goal is worth.
							</Hint>
							<Row>
								<Field>
									<Label>Default unit</Label>
									<Input
										value={draft.unit}
										onChange={(e) => set("unit", e.target.value)}
										placeholder="lb"
									/>
								</Field>
								<Field>
									<Label>Max points</Label>
									<NumInput
										value={draft.maxPoints}
										onChange={(e) => setNum("maxPoints", e.target.value)}
										min={0}
										step={1}
									/>
								</Field>
								<Field>
									<Label>Decimals</Label>
									<NumInput
										value={draft.decimals}
										onChange={(e) => setNum("decimals", e.target.value)}
										min={0}
										max={3}
										step={1}
									/>
								</Field>
							</Row>
						</>
					)}

					{error && <ErrMsg>{error}</ErrMsg>}

					<BtnRow>
						{onDelete && (
							<Btn
								$variant="danger"
								onClick={onDelete}
							>
								Delete
							</Btn>
						)}
						<Btn
							$variant="k"
							onClick={handleSave}
						>
							{isNew ? "Add rule" : "Save changes"}
						</Btn>
					</BtnRow>
				</Body>
			</Sheet>
		</Overlay>
	);
}
