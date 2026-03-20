import { useState } from "react";
import styled from "styled-components";
import { HistoryEntriesTable } from "../components/history/HistoryEntriesTable";
import { useChallenge } from "../context/ChallengeContext";
import { buildHistoryRows } from "../lib/history";

const SectionHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 8px;
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

const ClearBtn = styled.button`
	background: none;
	border: 1px solid rgba(248, 113, 113, 0.3);
	color: ${({ theme }) => theme.color.red};
	border-radius: ${({ theme }) => theme.radii.sm};
	padding: 6px 14px;
	font-family: ${({ theme }) => theme.font.body};
	font-size: 0.72rem;
	cursor: pointer;
	transition: all 0.15s;

	&:hover {
		background: ${({ theme }) => theme.color.redDim};
	}
`;

const ClearPanel = styled.div`
	margin-top: 1rem;
	background: rgba(248, 113, 113, 0.08);
	border: 1px solid rgba(248, 113, 113, 0.3);
	border-radius: 10px;
	padding: 12px 14px;
	font-size: 0.78rem;
	color: ${({ theme }) => theme.color.muted2};
`;

const ClearRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin-top: 10px;
`;

const PwInput = styled.input`
	flex: 1;
	min-width: 120px;
	max-width: 160px;
	background: ${({ theme }) => theme.color.surface};
	border: 1px solid ${({ theme }) => theme.color.border2};
	border-radius: ${({ theme }) => theme.radii.sm};
	padding: 7px 10px;
	font-family: ${({ theme }) => theme.font.body};
	font-size: 0.8rem;
	color: ${({ theme }) => theme.color.text};
	outline: none;

	&:focus {
		border-color: ${({ theme }) => theme.color.gold};
	}
`;

const BtnDanger = styled.button`
	background: ${({ theme }) => theme.color.red};
	color: #fff;
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
`;

const PwErr = styled.div`
	font-size: 0.65rem;
	color: ${({ theme }) => theme.color.red};
	margin-top: 6px;
`;

export function HistoryPage() {
	const {
		entries,
		profiles,
		resetLog,
		checkPassword,
		postToSheets,
		clearAllLocal,
	} = useChallenge();
	const [showClear, setShowClear] = useState(false);
	const [clearPw, setClearPw] = useState("");
	const [clearErr, setClearErr] = useState("");

	const rows = buildHistoryRows(entries, profiles, resetLog);

	const toggleClear = () => {
		if (showClear) {
			setShowClear(false);
			setClearPw("");
			setClearErr("");
			return;
		}
		setShowClear(true);
		setClearPw("");
		setClearErr("");
	};

	const confirmClear = () => {
		if (!checkPassword("__admin", clearPw)) {
			setClearErr("Incorrect password.");
			setClearPw("");
			return;
		}
		clearAllLocal();
		void postToSheets("clearAll", {});
		setShowClear(false);
		setClearPw("");
		setClearErr("");
	};

	return (
		<div>
			<SectionHeader>
				<div>
					<SectionTitle>History</SectionTitle>
					<SectionSub>All logged entries</SectionSub>
				</div>
				<ClearBtn type="button" onClick={toggleClear}>
					Clear all data
				</ClearBtn>
			</SectionHeader>

			{showClear ? (
				<ClearPanel>
					<div>
						This will permanently delete <strong>all</strong> logged data and profile
						goals. Enter the admin password to continue.
					</div>
					<ClearRow>
						<PwInput
							type="password"
							placeholder="Admin password"
							value={clearPw}
							onChange={(e) => setClearPw(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && confirmClear()}
							autoFocus
						/>
						<BtnGhost type="button" onClick={toggleClear}>
							Cancel
						</BtnGhost>
						<BtnDanger type="button" onClick={confirmClear}>
							Delete All
						</BtnDanger>
					</ClearRow>
					{clearErr ? <PwErr>{clearErr}</PwErr> : null}
				</ClearPanel>
			) : null}

			<HistoryEntriesTable rows={rows} showPlayerColumn />
		</div>
	);
}
