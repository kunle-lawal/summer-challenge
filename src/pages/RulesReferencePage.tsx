import { useParams } from "react-router-dom";
import styled from "styled-components";
import { useChallenge } from "@/context/ChallengeContext";
import { formatRuleFormula, resolveRangePoints } from "@/lib/rules/ruleDocs";
import type { Rule } from "@/types";

// ── Styled components ─────────────────────────────────────────────────────────

const SHeader = styled.header`
	padding: 14px 16px 12px;
	border-bottom: 1px solid ${({ theme }) => theme.color.hair};
`;

const Eyebrow = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
`;

const Title = styled.h1`
	font-family: ${({ theme }) => theme.font.display};
	font-size: 30px;
	line-height: 0.96;
	font-weight: 400;
	margin-top: 2px;
	em {
		font-style: italic;
	}
`;

const Sub = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	color: ${({ theme }) => theme.color.ink3};
	letter-spacing: 0.04em;
	margin-top: 2px;
`;

const Body = styled.div`
	padding: 0 16px 24px;
`;

const RuleCard = styled.div`
	background: ${({ theme }) => theme.color.surface};
	border: 1px solid ${({ theme }) => theme.color.hair};
	border-radius: ${({ theme }) => theme.radii.md};
	padding: 14px;
	margin-top: 10px;
`;

const RuleTop = styled.div`
	display: flex;
	align-items: flex-start;
	gap: 10px;
	justify-content: space-between;
`;

const RuleName = styled.h3`
	font-family: ${({ theme }) => theme.font.body};
	font-size: 15px;
	font-weight: 600;
	color: ${({ theme }) => theme.color.ink};
	margin: 0;
`;

const RuleKindPill = styled.span`
	display: inline-flex;
	align-items: center;
	padding: 3px 8px;
	border-radius: ${({ theme }) => theme.radii.pill};
	background: ${({ theme }) => theme.color.bg2};
	color: ${({ theme }) => theme.color.ink2};
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	white-space: nowrap;
	flex-shrink: 0;
`;

const Formula = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	color: ${({ theme }) => theme.color.ink3};
	margin-top: 4px;
`;

const Description = styled.p`
	font-size: 13.5px;
	color: ${({ theme }) => theme.color.ink2};
	line-height: 1.45;
	margin: 10px 0 0;
`;

const DetailGrid = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	margin-top: 10px;
	padding-top: 10px;
	border-top: 1px solid ${({ theme }) => theme.color.hair};
`;

const DetailItem = styled.div``;

const DetailLabel = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 9.5px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
`;

const DetailValue = styled.div`
	font-size: 13px;
	color: ${({ theme }) => theme.color.ink};
	margin-top: 2px;
	font-weight: 500;
`;

const SectionLbl = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: ${({ theme }) => theme.color.ink3};
	font-weight: 500;
	padding: 18px 0 4px;
`;

const FootNote = styled.div`
	font-family: ${({ theme }) => theme.font.mono};
	font-size: 10.5px;
	color: ${({ theme }) => theme.color.ink3};
	padding: 18px 4px 4px;
	line-height: 1.5;
	font-style: italic;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function ruleFormula(r: Rule): string {
	return formatRuleFormula(r);
}

function ruleDetails(r: Rule): Array<{ label: string; value: string }> {
	const d: Array<{ label: string; value: string }> = [];
	switch (r.kind) {
		case "binary":
			if (r.weeklyCap)
				d.push({
					label: "Weekly cap",
					value: `${r.weeklyCap.maxScoringDays} scoring days/wk`,
				});
			if (r.freePasses)
				d.push({
					label: "Free passes",
					value: `${r.freePasses.count} lifetime`,
				});
			break;
		case "counter":
			d.push({
				label: "Target",
				value: `${r.target.toLocaleString()} ${r.unit}`,
			});
			d.push({ label: "Max pts", value: `+${r.maxPoints}` });
			break;
		case "range": {
			const { atMin, atMax } = resolveRangePoints(r);
			d.push({ label: "Target band", value: `${r.min}–${r.max} ${r.unit}` });
			d.push({
				label: "In-band points",
				value:
					atMin === atMax
						? `+${atMin} pts`
						: `+${atMin} at min → +${atMax} at max`,
			});
			d.push({ label: "Outside band", value: `${r.pointsOutside >= 0 ? "+" : ""}${r.pointsOutside} pts` });
			break;
		}
		case "penalty":
			if (r.weeklyFirstWaived)
				d.push({ label: "First slip/wk", value: "Waived (0 pts)" });
			if (r.freePasses)
				d.push({
					label: "Free passes",
					value: `${r.freePasses.count} lifetime`,
				});
			break;
		case "streak":
			d.push({ label: "Required days", value: `${r.daysRequired}` });
			d.push({ label: "Tracks", value: r.ruleRef });
			break;
		case "tracker":
			d.push({ label: "Default unit", value: r.unit });
			d.push({ label: "Max pts", value: `+${r.maxPoints}` });
			d.push({ label: "Member sets", value: "Label, start, goal, direction" });
			break;
	}
	return d;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RulesReferencePage() {
	useParams<{ slug: string }>();
	const { challenge } = useChallenge();

	if (!challenge) return null;

	const rules = [...challenge.config.rules].sort((a, b) => a.order - b.order);

	return (
		<>
			<SHeader>
				<Eyebrow>{challenge.name}</Eyebrow>
				<Title>
					Rules <em>reference</em>
				</Title>
				<Sub>{rules.length} rules configured</Sub>
			</SHeader>

			<Body>
				<SectionLbl>How scoring works</SectionLbl>

				{rules.map((r) => {
					const details = ruleDetails(r);
					return (
						<RuleCard key={r.id}>
							<RuleTop>
								<div>
									<RuleName>
										{r.emoji ? `${r.emoji} ${r.name}` : r.name}
									</RuleName>
									<Formula>{ruleFormula(r)}</Formula>
								</div>
								<RuleKindPill>{r.kind}</RuleKindPill>
							</RuleTop>

							{r.description && <Description>{r.description}</Description>}

							{details.length > 0 && (
								<DetailGrid>
									{details.map((d) => (
										<DetailItem key={d.label}>
											<DetailLabel>{d.label}</DetailLabel>
											<DetailValue>{d.value}</DetailValue>
										</DetailItem>
									))}
								</DetailGrid>
							)}
						</RuleCard>
					);
				})}

				<FootNote>
					Rules are set by the owner. Contact them if something looks wrong.
				</FootNote>
			</Body>
		</>
	);
}
