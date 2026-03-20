import { useState } from 'react';
import styled from 'styled-components';
import { useChallenge } from '../context/ChallengeContext';
import { buildHistoryRows, type HistoryDisplayRow } from '../lib/history';
import { fmtPts, ptsClass } from '../lib/scoring';

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

const EmptyMsg = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.muted};
  font-size: 0.8rem;
`;

const Pill = styled.span<{ $variant: 'green' | 'red' | 'blue' | 'gold' | 'purple' | 'muted' }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 500;
  background: ${({ theme, $variant }) =>
    $variant === 'green'
      ? theme.color.greenDim
      : $variant === 'red'
        ? theme.color.redDim
        : $variant === 'blue'
          ? theme.color.blueDim
          : $variant === 'gold'
            ? theme.color.goldDim
            : $variant === 'purple'
              ? theme.color.purpleDim
              : theme.color.surface2};
  color: ${({ theme, $variant }) =>
    $variant === 'green'
      ? theme.color.green
      : $variant === 'red'
        ? theme.color.red
        : $variant === 'blue'
          ? theme.color.blue
          : $variant === 'gold'
            ? theme.color.gold
            : $variant === 'purple'
              ? theme.color.purple
              : theme.color.muted};
`;

const PtsCell = styled.span<{ $tone: 'pos' | 'neg' | 'zero' | 'purple' }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ theme, $tone }) =>
    $tone === 'purple'
      ? theme.color.purple
      : $tone === 'pos'
        ? theme.color.green
        : $tone === 'neg'
          ? theme.color.red
          : theme.color.muted2};
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

function DetailsCell({ row }: { row: HistoryDisplayRow }) {
  if (row.kind === 'workout') {
    return (
      <span style={{ fontSize: '0.75rem' }}>
        {row.gym === 'went' ? (
          <Pill $variant="green">Went</Pill>
        ) : row.gym === 'skip' ? (
          <Pill $variant="red">Skipped</Pill>
        ) : row.gym === 'free-gym' ? (
          <Pill $variant="blue">★ Free</Pill>
        ) : (
          '—'
        )}{' '}
        &nbsp;·&nbsp; {row.steps.toLocaleString()} steps (+
        {row.stepPts}) &nbsp;·&nbsp;{' '}
        {row.junk === 'clean' ? (
          <Pill $variant="green">Clean</Pill>
        ) : row.junk === 'ate' ? (
          <Pill $variant="red">Ate Junk</Pill>
        ) : row.junk === 'free-junk' ? (
          <Pill $variant="blue">★ Free</Pill>
        ) : (
          '—'
        )}
      </span>
    );
  }
  if (row.kind === 'goal') {
    return (
      <span style={{ fontSize: '0.75rem' }}>
        Value: <strong style={{ fontWeight: 600 }}>{row.value}</strong> &nbsp;·&nbsp; Goal:{' '}
        {row.goal} ({row.dirLabel})
      </span>
    );
  }
  if (row.kind === 'goal_set') {
    return (
      <span style={{ fontSize: '0.75rem' }}>
        Goal: <strong style={{ fontWeight: 600 }}>{row.goal}</strong> · Start: {row.startVal}{' '}
        · {row.direction} (set #{row.setNumber})
      </span>
    );
  }
  return (
    <span style={{ fontSize: '0.75rem' }}>
      Prev goal: {String(row.previousGoal)} · Prev start: {String(row.previousStart)} ·{' '}
      {row.previousDirection} (reset #{row.resetNumber})
    </span>
  );
}

function TypeCell({ row }: { row: HistoryDisplayRow }) {
  if (row.kind === 'goal_set') {
    return (
      <Pill $variant="purple">Goal set</Pill>
    );
  }
  if (row.kind === 'goal_reset') {
    return (
      <Pill $variant="red">Goal reset</Pill>
    );
  }
  if (row.kind === 'goal') {
    return (
      <Pill $variant="purple">Goal</Pill>
    );
  }
  return (
    <Pill $variant="gold">Workout</Pill>
  );
}

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
  const [clearPw, setClearPw] = useState('');
  const [clearErr, setClearErr] = useState('');

  const rows = buildHistoryRows(entries, profiles, resetLog);

  const toggleClear = () => {
    if (showClear) {
      setShowClear(false);
      setClearPw('');
      setClearErr('');
      return;
    }
    setShowClear(true);
    setClearPw('');
    setClearErr('');
  };

  const confirmClear = () => {
    if (!checkPassword('__admin', clearPw)) {
      setClearErr('Incorrect password.');
      setClearPw('');
      return;
    }
    clearAllLocal();
    void postToSheets('clearAll', {});
    setShowClear(false);
    setClearPw('');
    setClearErr('');
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
              onKeyDown={(e) => e.key === 'Enter' && confirmClear()}
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

      {rows.length === 0 ? (
        <HistoryWrap>
          <EmptyMsg>No entries yet.</EmptyMsg>
        </HistoryWrap>
      ) : (
        <HistoryWrap>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Player</Th>
                  <Th>Type</Th>
                  <Th>Details</Th>
                  <Th style={{ textAlign: 'right' }}>Pts</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <Tr key={`${r.sortDate}-${r.sortTime}-${r.name}-${i}`}>
                    <Td>{r.dateDisplay}</Td>
                    <Td style={{ fontSize: '0.72rem', color: 'inherit' }}>{r.timeDisplay}</Td>
                    <Td style={{ color: 'inherit', fontWeight: 500 }}>{r.name}</Td>
                    <Td>
                      <TypeCell row={r} />
                    </Td>
                    <Td>
                      <DetailsCell row={r} />
                    </Td>
                    <Td style={{ textAlign: 'right' }}>
                      {r.kind === 'workout' && r.pts != null ? (
                        <PtsCell $tone={ptsClass(r.pts)}>{fmtPts(r.pts)}</PtsCell>
                      ) : r.kind === 'goal' ? (
                        <PtsCell $tone="purple">+{r.pts}</PtsCell>
                      ) : r.kind === 'goal_set' || r.kind === 'goal_reset' ? (
                        <span style={{ color: 'inherit', fontSize: '0.7rem' }}>—</span>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </HistoryWrap>
      )}
    </div>
  );
}
