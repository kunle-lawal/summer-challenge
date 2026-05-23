import { useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled, { css, keyframes } from "styled-components";
import { useChallenge } from "@/context/ChallengeContext";
import { useSelectedMember } from "@/context/SelectedMemberContext";
import { upsertEntry } from "@/lib/entries";
import { setTrackerConfig } from "@/lib/members";
import { evaluateEntry } from "@/lib/rules/evaluate";
import { buildWeeklySummary } from "@/lib/rules/aggregate";
import {
	todayInTz,
	yesterdayInTz,
	addDays,
	isWithinEditWindow,
	diffDays,
} from "@/lib/dates";
import { LockIcon } from "@/components/ui/Icons";
import { RuleCardRouter } from "@/components/log/ruleCardRouter";
import { CardWrap } from "@/components/log/RuleCard";
import { StreakBand } from "@/components/log/StreakRuleCard";
import type { Entry, DateString, RawEntryValue, StreakRule } from "@/types";
import type { TrackerGoalInput } from "@/components/log/TrackerRuleCard";
import { isStreakRule } from "@/types";

// ── Animations ────────────────────────────────────────────────────────────────

const tick = keyframes`
  0% { transform: translateY(4px); opacity: 0; }
  60% { transform: translateY(-2px); opacity: 1; }
  100% { transform: translateY(0); opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(4px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// ── Styled components ─────────────────────────────────────────────────────────

const LogHeader = styled.header`
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px 16px 14px;
	border-bottom: 1px solid ${({ theme }) => theme.color.hair};
	background: ${({ theme }) => theme.color.surface};
	position: sticky;
	top: 0;
	z-index: 10;
`;

const HeaderInfo = styled.div`
	flex: 1;
	min-width: 0;
`;

const Eyebrow = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
`;

const MemberRow = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	margin-top: 2px;
`;

const MemberName = styled.button`
	appearance: none;
	border: 0;
	background: none;
	padding: 0;
	font: inherit;
	cursor: pointer;
	font-weight: 600;
	font-size: 15px;
	color: ${({ theme }) => theme.color.ink};
	text-align: left;

	&:hover {
		text-decoration: underline;
	}
`;

const DotSep = styled.span`
	width: 3px;
	height: 3px;
	border-radius: 50%;
	background: ${({ theme }) => theme.color.ink4};
	display: inline-block;
`;

const DateLabel = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 11px;
	color: ${({ theme }) => theme.color.ink3};
	letter-spacing: 0.04em;
`;

const TotalPill = styled.div`
	background: ${({ theme }) => theme.color.ink};
	color: ${({ theme }) => theme.color.surface};
	padding: 8px 12px;
	border-radius: ${({ theme }) => theme.radii.pill};
	display: flex;
	align-items: baseline;
	gap: 4px;
	font-variant-numeric: tabular-nums;
	flex-shrink: 0;
`;

const TotalVal = styled.span`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 18px;
	line-height: 1;
	font-style: italic;
`;

const TotalLbl = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 9.5px;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	opacity: 0.7;
`;

const ScreenBody = styled.div`
	padding: 0 16px 80px;
	overflow-y: auto;
`;

const DateStrip = styled.div`
	display: flex;
	gap: 6px;
	overflow-x: auto;
	scrollbar-width: none;
	-webkit-overflow-scrolling: touch;
	margin: 0 -16px;
	padding: 4px 16px 8px;
	&::-webkit-scrollbar {
		display: none;
	}
`;

const DateChip = styled.button<{ $state: string; $selected: boolean }>`
	flex: 0 0 auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 8px 10px 10px;
	border-radius: ${({ theme }) => theme.radii.md};
	border: 1px solid
		${({ theme, $state, $selected }) =>
			$state === "today"
				? theme.color.ink
				: $selected
					? theme.color.ink
					: theme.color.hair};
	background: ${({ theme, $state }) =>
		$state === "today" ? theme.color.ink : theme.color.surface};
	min-width: 52px;
	cursor: ${({ $state }) => ($state === "future" ? "not-allowed" : "pointer")};
	opacity: ${({ $state }) =>
		$state === "future" ? 0.35 : $state === "locked" ? 0.55 : 1};
	position: relative;
`;

const ChipDay = styled.span<{ $today: boolean }>`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 9px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: ${({ theme, $today }) =>
		$today ? theme.color.surface : theme.color.ink3};
`;

const ChipNum = styled.span<{ $today: boolean }>`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 22px;
	line-height: 1.05;
	margin-top: 2px;
	color: ${({ theme, $today }) =>
		$today ? theme.color.surface : theme.color.ink};
`;

const ChipDot = styled.span`
	position: absolute;
	bottom: 4px;
	left: 50%;
	transform: translateX(-50%);
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background: ${({ theme }) => theme.color.accent};
`;

const Banner = styled.div<{ $variant?: "warn" | "locked" | "ended" | "pre" }>`
	padding: 14px 16px;
	border-radius: ${({ theme }) => theme.radii.md};
	border: 1px solid
		${({ theme, $variant }) =>
			$variant === "ended" || $variant === "pre"
				? theme.color.hair2
				: $variant === "warn"
					? theme.color.gold
					: $variant === "locked"
						? theme.color.ink3
						: theme.color.accent};
	background: ${({ theme, $variant }) =>
		$variant === "ended" || $variant === "pre"
			? theme.color.bg2
			: $variant === "warn"
				? "rgba(180,138,42,0.10)"
				: $variant === "locked"
					? theme.color.bg2
					: theme.color.accentTint};
	margin-bottom: 14px;
	display: flex;
	align-items: center;
	gap: 8px;
	border-left: 2px solid
		${({ theme, $variant }) =>
			$variant === "ended"
				? "transparent"
				: $variant === "pre"
					? "transparent"
					: $variant === "warn"
						? theme.color.gold
						: $variant === "locked"
							? theme.color.ink3
							: theme.color.accent};
	border-radius: ${({ $variant }) =>
		$variant === "ended" || $variant === "pre" ? "8px" : "0 8px 8px 0"};
	svg {
		width: 14px;
		height: 14px;
		stroke: ${({ theme }) => theme.color.ink3};
		stroke-width: 1.6;
		fill: none;
		flex-shrink: 0;
	}
`;

const BannerTitle = styled.strong`
	font-weight: 600;
	font-size: 14px;
	display: block;
	margin-bottom: 4px;
`;

const BannerBody = styled.div`
	font-size: 12.5px;
	color: ${({ theme }) => theme.color.ink3};
`;

const EditBannerKey = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink};
	font-weight: 500;
`;

const EditBannerText = styled.span`
	font-size: 12.5px;
	color: ${({ theme }) => theme.color.ink3};
`;

const WeekStrip = styled.div`
	background: ${({ theme }) => theme.color.surface2};
	border: 1px solid ${({ theme }) => theme.color.hair};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 12px 14px;
	margin-bottom: 14px;
`;

const WeekHead = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	margin-bottom: 10px;
`;

const WeekStats = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
`;

const WeekStat = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
`;

const WeekVal = styled.div`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 26px;
	line-height: 1;
	font-variant-numeric: tabular-nums;
	span.dim {
		font-size: 14px;
		color: ${({ theme }) => theme.color.ink3};
		font-style: italic;
	}
`;

const WeekLbl = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 9.5px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
`;

const RulesCol = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`;

/** Wraps a rule card + any streak bands. When $hasStreak, the card's bottom corners are squared. */
const RuleGroup = styled.div<{ $hasStreak?: boolean }>`
  display: flex;
  flex-direction: column;
  ${({ $hasStreak }) =>
    $hasStreak &&
    css`
      > ${CardWrap} {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }
    `}
`;

const ToastWrap = styled.div`
	position: fixed;
	left: 16px;
	right: 16px;
	bottom: 88px;
	z-index: 100;
	pointer-events: none;
	max-width: 448px;
	margin: 0 auto;
`;

const ToastEl = styled.div`
	background: ${({ theme }) => theme.color.ink};
	color: ${({ theme }) => theme.color.surface};
	padding: 10px 14px;
	border-radius: ${({ theme }) => theme.radii.pill};
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	box-shadow: 0 8px 20px -8px rgba(24, 23, 15, 0.4);
	animation: ${slideUp} 0.35s cubic-bezier(0.2, 0.7, 0.3, 1.2);
`;

const ToastDot = styled.span`
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: ${({ theme }) => theme.color.accent};
	flex-shrink: 0;
`;

const TotalAnim = styled.div`
	animation: ${tick} 0.35s cubic-bezier(0.2, 0.7, 0.3, 1.2);
`;

const BodySm = styled.span`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	color: ${({ theme }) => theme.color.ink3};
	letter-spacing: 0.04em;
`;

const FootNote = styled.p`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 11px;
	color: ${({ theme }) => theme.color.ink3};
	padding: 20px 4px 4px;
	line-height: 1.5;
`;

const EmptyState = styled.div`
	text-align: center;
	padding: 40px 24px;
	color: ${({ theme }) => theme.color.ink3};
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateLabel(date: DateString): string {
	const d = new Date(date + "T00:00:00Z");
	return d.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

function formatDayNum(date: DateString): string {
	return date.slice(8); // DD
}

function formatDayName(date: DateString, isToday: boolean): string {
	if (isToday) return "TODAY";
	const d = new Date(date + "T00:00:00Z");
	return d
		.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
		.toUpperCase();
}

interface DateChipData {
	date: DateString;
	state: "today" | "logged" | "locked" | "future";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LogDayPage() {
	const navigate = useNavigate();
	const { slug } = useParams<{ slug: string }>();
	const { challenge, entries, members, isEnded } = useChallenge();
	const { selectedMemberId } = useSelectedMember();

	const [selectedDate, setSelectedDate] = useState<DateString | null>(null);
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState<{ msg: string; sub: string } | null>(null);
	const [toastKey, setToastKey] = useState(0);

	if (!challenge || !selectedMemberId) return null;

	const tz = challenge.config.timezone;
	const today = todayInTz(tz);
	const yesterday = yesterdayInTz(tz);

	const activeDate = selectedDate ?? today;

	const member = members.find((m) => m.id === selectedMemberId);
	if (!member) return null;

	const memberEntries = useMemo(
		() => entries.filter((e) => e.memberId === selectedMemberId),
		[entries, selectedMemberId],
	);

	const loggedDates = useMemo(
		() => new Set(memberEntries.map((e) => e.date)),
		[memberEntries],
	);

	const currentEntry: Entry | undefined = memberEntries.find(
		(e) => e.date === activeDate,
	);

	// Build date strip: last 6 days + today + 2 future
	const dateChips = useMemo((): DateChipData[] => {
		const chips: DateChipData[] = [];
		for (let i = -5; i <= 2; i++) {
			const d = addDays(today, i);
			let state: DateChipData["state"];
			if (d === today) state = "today";
			else if (d > today) state = "future";
			else if (loggedDates.has(d)) state = "logged";
			else state = "locked";
			chips.push({ date: d, state });
		}
		return chips;
	}, [today, loggedDates]);

	const isLocked = !isWithinEditWindow(activeDate, tz) || isEnded;

	const isPreStart = today < challenge.config.startDate;

	const weeklySummary = useMemo(
		() => buildWeeklySummary(challenge, member, memberEntries, activeDate),
		[challenge, member, memberEntries, activeDate],
	);

	const evaluated = useMemo(() => {
		if (!currentEntry) return {};
		return currentEntry
			? Object.fromEntries(
					Object.entries(
						evaluateEntry(challenge, currentEntry, member, memberEntries)
							.perRule,
					),
				)
			: {};
	}, [challenge, currentEntry, member, memberEntries]);

	const totalPoints = useMemo(() => {
		return Object.values(evaluated).reduce((s, r) => s + r.points, 0);
	}, [evaluated]);

	const showToast = useCallback((msg: string, sub: string) => {
		setToast({ msg, sub });
		setToastKey((k) => k + 1);
		setTimeout(() => setToast(null), 2000);
	}, []);

	const handleSave = useCallback(
		async (ruleId: string, value: RawEntryValue) => {
			if (saving || isLocked || isEnded) return;
			setSaving(true);

			try {
				const newValues = { ...(currentEntry?.values ?? {}), [ruleId]: value };
				const result = await upsertEntry(
					challenge.id,
					selectedMemberId,
					activeDate,
					newValues,
					{ memberId: selectedMemberId, isOwner: false },
				);

				if (result.ok) {
					const rule = challenge.config.rules.find((r) => r.id === ruleId);
					showToast(
						rule?.name ?? "Logged",
						result.action === "created" ? "Entry saved" : "Updated",
					);
				} else {
					showToast("Could not save", result.reason.replace(/_/g, " "));
				}
			} catch {
				showToast("Error", "Please try again");
			} finally {
				setSaving(false);
			}
		},
		[
			saving,
			isLocked,
			isEnded,
			currentEntry,
			challenge,
			selectedMemberId,
			activeDate,
			showToast,
		],
	);

	const handleSetTrackerGoal = useCallback(
		async (cfg: TrackerGoalInput) => {
			await setTrackerConfig(challenge.id, selectedMemberId, cfg, {
				memberId: selectedMemberId,
				isOwner: false,
			});
		},
		[challenge.id, selectedMemberId],
	);

	const rules = [...challenge.config.rules].sort((a, b) => a.order - b.order);

	// Split streak rules out so they can be attached to the rule they track
	const streakRules = useMemo(
		() => rules.filter(isStreakRule) as StreakRule[],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[challenge.config.rules],
	);

	const streaksByTarget = useMemo(() => {
		const map = new Map<string, StreakRule[]>();
		for (const sr of streakRules) {
			const arr = map.get(sr.ruleRef) ?? [];
			arr.push(sr);
			map.set(sr.ruleRef, arr);
		}
		return map;
	}, [streakRules]);

	// Current streak count for each streak rule (same algorithm as ruleCardRouter)
	const streakCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const sr of streakRules) {
			const positive = memberEntries
				.filter((e) => {
					const v = e.values[sr.ruleRef];
					return (
						v === "yes" ||
						v === "free" ||
						v === "clean" ||
						typeof v === "number"
					);
				})
				.sort((a, b) => a.date.localeCompare(b.date));
			let streak = 0;
			for (let i = positive.length - 1; i >= 0; i--) {
				if (i === positive.length - 1) {
					streak = 1;
					continue;
				}
				const curr = positive[i];
				const prev = positive[i - 1];
				if (!curr || !prev) break;
				const diffMs =
					new Date(curr.date + "T00:00:00Z").getTime() -
					new Date(prev.date + "T00:00:00Z").getTime();
				if (diffMs === 86_400_000) {
					streak++;
				} else {
					break;
				}
			}
			counts[sr.id] = Math.min(streak, sr.daysRequired);
		}
		return counts;
	}, [streakRules, memberEntries]);

	// Streak rules whose tracked rule no longer exists → render standalone below the list
	const orphanedStreakRules = useMemo(
		() =>
			streakRules.filter(
				(sr) => !rules.find((r) => r.id === sr.ruleRef && !isStreakRule(r)),
			),
		[streakRules, rules],
	);

	// Hours remaining until the edit window for yesterday closes (midnight in tz)
	const editWindowHoursLeft = useMemo(() => {
		if (activeDate !== yesterday) return null;
		// Tomorrow midnight UTC = end of yesterday in tz (approximate — good enough for display)
		const nowMs = Date.now();
		const tzToday = todayInTz(tz);
		// End of today = start of tomorrow midnight UTC
		const endOfWindowMs =
			new Date(tzToday + "T00:00:00Z").getTime() + 86_400_000;
		const msLeft = endOfWindowMs - nowMs;
		if (msLeft <= 0) return 0;
		return Math.ceil(msLeft / 3_600_000);
	}, [activeDate, yesterday, tz]);

	// Compute human-readable "logged at" timestamp for locked cards
	const lockedAt = useMemo(() => {
		const ts = currentEntry?.updatedAt as unknown as
			| { seconds: number }
			| null
			| undefined;
		if (!ts?.seconds) return undefined;
		const d = new Date(ts.seconds * 1000);
		const h = d.getHours(),
			m = d.getMinutes().toString().padStart(2, "0");
		const ampm = h >= 12 ? "PM" : "AM";
		return `${h % 12 || 12}:${m} ${ampm}`;
	}, [currentEntry]);

	const weekNum = weeklySummary.weekNumber;
	const totalDays = challenge.config.endDate
		? diffDays(challenge.config.endDate, challenge.config.startDate) + 1
		: null;
	const totalWeeks = totalDays ? Math.ceil(totalDays / 7) : null;
	const daysLeft = challenge.config.endDate
		? Math.max(0, diffDays(challenge.config.endDate, today))
		: null;

	// Week summary display: cap/binary rules
	const weekStatRules = rules
		.filter((r) => r.kind === "binary" || r.kind === "penalty")
		.slice(0, 2);
	const freeStatRule = rules.find(
		(r) => r.kind === "binary" && "freePasses" in r && r.freePasses,
	);

	return (
		<>
			<LogHeader>
				<HeaderInfo>
					<Eyebrow>Log day</Eyebrow>
					<MemberRow>
						<MemberName
							type="button"
							onClick={() => navigate(`/c/${slug}/pick`)}
							title="Switch member"
						>
							{member.name}
						</MemberName>
						<DotSep />
						<DateLabel>{getDateLabel(activeDate)}</DateLabel>
					</MemberRow>
				</HeaderInfo>
				<TotalAnim key={toastKey}>
					<TotalPill>
						<TotalVal>+{totalPoints.toFixed(1)}</TotalVal>
						<TotalLbl>today</TotalLbl>
					</TotalPill>
				</TotalAnim>
			</LogHeader>

			<ScreenBody>
				{/* Date strip */}
				<DateStrip>
					{dateChips.map(({ date, state }) => {
						const isSelected = date === activeDate;
						const hasEntry = loggedDates.has(date);
						return (
							<DateChip
								key={date}
								$state={state}
								$selected={isSelected}
								onClick={() => state !== "future" && setSelectedDate(date)}
							>
								<ChipDay $today={state === "today"}>
									{formatDayName(date, state === "today")}
								</ChipDay>
								<ChipNum $today={state === "today"}>
									{formatDayNum(date)}
								</ChipNum>
								{hasEntry && state !== "today" && <ChipDot />}
							</DateChip>
						);
					})}
				</DateStrip>

				{/* State banners */}
				{isEnded && (
					<Banner $variant="ended">
						<div>
							<BannerTitle>This challenge has ended.</BannerTitle>
							<BannerBody>
								Logging is closed. Browse the leaderboard for final standings.
							</BannerBody>
						</div>
					</Banner>
				)}
				{isPreStart && (
					<Banner $variant="pre">
						<div>
							<BannerTitle>Starts {challenge.config.startDate}</BannerTitle>
							<BannerBody>Logging unlocks on start day.</BannerBody>
						</div>
					</Banner>
				)}
				{!isEnded && !isPreStart && activeDate === today && (
					<Banner>
						<EditBannerKey>Editable</EditBannerKey>
						<EditBannerText>
							until end of {yesterday} (yesterday cutoff).
						</EditBannerText>
					</Banner>
				)}
				{!isEnded && !isPreStart && activeDate === yesterday && (
					<Banner $variant="warn">
						<EditBannerKey>Closes soon</EditBannerKey>
						<EditBannerText>
							{editWindowHoursLeft !== null && editWindowHoursLeft > 0
								? `Editable for ${editWindowHoursLeft} more hour${editWindowHoursLeft !== 1 ? "s" : ""}. Locks at midnight.`
								: "Edit window for this day ends at midnight."}
						</EditBannerText>
					</Banner>
				)}
				{!isEnded &&
					!isPreStart &&
					isLocked &&
					activeDate !== today &&
					activeDate !== yesterday && (
						<Banner $variant="locked">
							<LockIcon />
							<EditBannerKey>Locked</EditBannerKey>
							<EditBannerText>
								Edit window closed for {activeDate}.
							</EditBannerText>
						</Banner>
					)}

				{/* Week summary */}
				<WeekStrip>
					<WeekHead>
						<BodySm
							style={{
								fontFamily: "inherit",
								fontSize: "inherit",
								letterSpacing: "inherit",
								textTransform: "inherit",
							}}
						>
							<span
								style={{
									fontFamily: "var(--font-mono, monospace)",
									fontSize: "10.5px",
									letterSpacing: "0.10em",
									textTransform: "uppercase",
									color: "inherit",
								}}
							>
								Week {weekNum}
								{totalWeeks ? ` of ${totalWeeks}` : ""}
							</span>
						</BodySm>
						<BodySm>{daysLeft !== null ? `${daysLeft} days left` : ""}</BodySm>
					</WeekHead>
					<WeekStats>
						{weekStatRules.map((r) => {
							const usage = weeklySummary.perRule[r.id];
							return (
								<WeekStat key={r.id}>
									<WeekVal>
										{usage?.used ?? 0}
										{usage?.cap !== null ? (
											<span className="dim">/{usage?.cap}</span>
										) : (
											""
										)}
									</WeekVal>
									<WeekLbl>{r.name}</WeekLbl>
								</WeekStat>
							);
						})}
						{freeStatRule &&
							(() => {
								const fp = weeklySummary.freePassUsage[freeStatRule.id];
								const freeTotal =
									("freePasses" in freeStatRule
										? freeStatRule.freePasses?.count
										: undefined) ?? 0;
								const freeLeft = freeTotal - (fp?.used ?? 0);
								return (
									<WeekStat key="free">
										<WeekVal>
											{freeLeft}
											<span className="dim">/{freeTotal}</span>
										</WeekVal>
										<WeekLbl>Free left</WeekLbl>
									</WeekStat>
								);
							})()}
					</WeekStats>
				</WeekStrip>

				{/* Rule cards */}
				{rules.length === 0 ? (
					<EmptyState>
						<p>No rules configured yet.</p>
						<p style={{ marginTop: 8, fontSize: 13 }}>
							Ask the owner to add rules via Admin.
						</p>
					</EmptyState>
				) : (
					<RulesCol>
						{rules.map((rule) => {
							// Streak rules are rendered as bands below the rule they track
							if (isStreakRule(rule)) return null;
              const attachedStreaks = streaksByTarget.get(rule.id) ?? [];
              return (
                <RuleGroup key={rule.id} $hasStreak={attachedStreaks.length > 0}>
									<RuleCardRouter
										rule={rule}
										member={member}
										memberEntries={memberEntries}
										evaluated={evaluated[rule.id] ?? null}
										weeklySummary={weeklySummary}
										locked={isLocked || isPreStart}
										lockedAt={lockedAt}
										weekAnchor={challenge.config.weekAnchor}
										onSave={handleSave}
										onSetTrackerGoal={handleSetTrackerGoal}
									/>
									{attachedStreaks.map((sr) => (
										<StreakBand
											key={sr.id}
											rule={sr}
											currentStreak={streakCounts[sr.id] ?? 0}
										/>
									))}
								</RuleGroup>
							);
						})}
						{/* Orphaned streaks: tracked rule was deleted — show standalone */}
						{orphanedStreakRules.map((rule) => (
							<RuleCardRouter
								key={rule.id}
								rule={rule}
								member={member}
								memberEntries={memberEntries}
								evaluated={null}
								weeklySummary={weeklySummary}
								locked={isLocked || isPreStart}
								lockedAt={lockedAt}
								weekAnchor={challenge.config.weekAnchor}
								onSave={handleSave}
								onSetTrackerGoal={handleSetTrackerGoal}
							/>
						))}
					</RulesCol>
				)}

				<FootNote>
					Tap a card to change. Edits appear on the leaderboard instantly.
				</FootNote>
			</ScreenBody>

			{toast && (
				<ToastWrap key={toastKey}>
					<ToastEl>
						<ToastDot />
						<span>
							<strong>{toast.msg}</strong>{" "}
							<span style={{ opacity: 0.7 }}>· {toast.sub}</span>
						</span>
					</ToastEl>
				</ToastWrap>
			)}
		</>
	);
}
