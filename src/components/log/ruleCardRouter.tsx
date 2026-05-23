import type {
	Rule,
	Member,
	Entry,
	DateString,
} from "@/types";
import type { EvaluatedRule } from "@/types";
import type { WeeklySummary } from "@/types";
import type { RawEntryValue } from "@/types";
import type { BinaryEntryValue, PenaltyEntryValue } from "@/types";
import {
	isBinaryRule,
	isCounterRule,
	isRangeRule,
	isPenaltyRule,
	isStreakRule,
	isTrackerRule,
} from "@/types";
import { getWeekWindow } from "@/lib/dates";
import { BinaryRuleCard } from "./BinaryRuleCard";
import { CounterRuleCard } from "./CounterRuleCard";
import { RangeRuleCard } from "./RangeRuleCard";
import { PenaltyRuleCard } from "./PenaltyRuleCard";
import { StreakRuleCard } from "./StreakRuleCard";
import { TrackerRuleCard } from "./TrackerRuleCard";

import type { TrackerGoalInput } from "./TrackerRuleCard";

interface Props {
	rule: Rule;
	member: Member;
	memberEntries: Entry[];
	evaluated: EvaluatedRule | null;
	weeklySummary: WeeklySummary | null;
	locked: boolean;
	lockedAt?: string;
	/** weekAnchor from challenge.config.weekAnchor — drives penalty week window */
	weekAnchor?: DateString;
	onSave: (ruleId: string, value: RawEntryValue) => void;
	onSetTrackerGoal?: (config: TrackerGoalInput) => Promise<void>;
}

export function RuleCardRouter({
	rule,
	member,
	memberEntries,
	evaluated,
	weeklySummary,
	locked,
	lockedAt,
	weekAnchor,
	onSave,
	onSetTrackerGoal,
}: Props) {
	if (isBinaryRule(rule)) {
		const weekData = weeklySummary?.perRule[rule.id];
		const freeData = weeklySummary?.freePassUsage[rule.id];
		return (
			<BinaryRuleCard
				rule={rule}
				evaluated={evaluated}
				locked={locked}
				lockedAt={lockedAt}
				weekUsed={weekData?.used ?? 0}
				freeUsed={freeData?.used ?? 0}
				onChange={(v: BinaryEntryValue) => onSave(rule.id, v)}
			/>
		);
	}

	if (isCounterRule(rule)) {
		return (
			<CounterRuleCard
				rule={rule}
				evaluated={evaluated}
				locked={locked}
				lockedAt={lockedAt}
				onChange={(v: number) => onSave(rule.id, v)}
			/>
		);
	}

	if (isRangeRule(rule)) {
		return (
			<RangeRuleCard
				rule={rule}
				evaluated={evaluated}
				locked={locked}
				lockedAt={lockedAt}
				onChange={(v: number) => onSave(rule.id, v)}
			/>
		);
	}

	if (isPenaltyRule(rule)) {
		const freeData = weeklySummary?.freePassUsage[rule.id];
		// Count infraction entries in the current challenge week
		const weekEntries = memberEntries.filter((e) => {
			if (!weekAnchor) return false;
			const { start, end } = getWeekWindow(e.date, weekAnchor);
			return e.date >= start && e.date <= end;
		});
		const weekInfractions = weekEntries.filter(
			(e) => e.values[rule.id] === "infraction",
		).length;

		return (
			<PenaltyRuleCard
				rule={rule}
				evaluated={evaluated}
				locked={locked}
				lockedAt={lockedAt}
				freeUsed={freeData?.used ?? 0}
				weekInfractions={weekInfractions}
				onChange={(v: PenaltyEntryValue) => onSave(rule.id, v)}
			/>
		);
	}

	if (isStreakRule(rule)) {
		// Count consecutive positive days for the referenced rule ending at today
		// TODO(hook-extension): a getMemberStreak helper would be cleaner
		const positiveEntries = memberEntries
			.filter((e) => {
				const refVal = e.values[rule.ruleRef];
				return (
					refVal === "yes" ||
					refVal === "free" ||
					refVal === "clean" ||
					typeof refVal === "number"
				);
			})
			.sort((a, b) => a.date.localeCompare(b.date));

		let streak = 0;
		for (let i = positiveEntries.length - 1; i >= 0; i--) {
			const curr = positiveEntries[i];
			const prev = positiveEntries[i - 1];
			if (i === positiveEntries.length - 1) {
				streak = 1;
				continue;
			}
			if (!curr || !prev) break;
			const diffMs =
				new Date(curr.date + "T00:00:00Z").getTime() -
				new Date(prev.date + "T00:00:00Z").getTime();
			if (diffMs === 86400000) {
				streak++;
			} else {
				break;
			}
		}

		return (
			<StreakRuleCard
				rule={rule}
				currentStreak={Math.min(streak, rule.daysRequired)}
				locked={locked}
			/>
		);
	}

	if (isTrackerRule(rule)) {
		return (
			<TrackerRuleCard
				rule={rule}
				member={member}
				evaluated={evaluated}
				locked={locked}
				lockedAt={lockedAt}
				onChange={(v: number) => onSave(rule.id, v)}
				onSetGoal={onSetTrackerGoal}
			/>
		);
	}

	return null;
}
