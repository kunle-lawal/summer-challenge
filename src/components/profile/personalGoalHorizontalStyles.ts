import styled from 'styled-components';

/** Horizontal personal-goal card — grid mirrors `PersonLogCard`. */
export const Card = styled.div<{ $todaySaved?: boolean }>`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid
    ${({ theme, $todaySaved }) =>
      $todaySaved ? 'rgba(74,222,128,0.25)' : theme.color.border};
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  display: grid;
  grid-template-columns: 130px 1fr 1fr 1fr 72px 120px;
  align-items: center;
  gap: 14px;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${({ theme, $todaySaved }) =>
      $todaySaved ? 'rgba(74,222,128,0.25)' : theme.color.border2};
  }

  ${({ $todaySaved }) =>
    $todaySaved &&
    `
    background: rgba(74,222,128,0.03);
  `}

  @media (max-width: 740px) {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
`;

export const FullSpan = styled.div`
  grid-column: 1 / -1;
`;

export const PersonCol = styled.div`
  min-width: 0;

  @media (max-width: 740px) {
    grid-column: span 2;
  }
`;

export const PersonName = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.text};
`;

export const PersonMeta = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.color.muted};
  margin-top: 4px;
  line-height: 1.65;
`;

export const GoalPtsLine = styled.span`
  color: ${({ theme }) => theme.color.purple};
`;

export const UnlockRow = styled.div`
  margin-top: 8px;
`;

export const FieldCol = styled.div`
  min-width: 0;

  @media (max-width: 740px) {
    min-width: 0;
  }
`;

export const FieldLabel = styled.div`
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.muted};
  margin-bottom: 5px;
`;

export const NumInput = styled.input`
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
  box-sizing: border-box;

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

export const DirRow = styled.div`
  display: flex;
  gap: 6px;
`;

export const DirBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 6px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.color.purple : theme.color.border2)};
  background: ${({ theme, $active }) =>
    $active ? theme.color.purpleDim : theme.color.surface2};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 0.68rem;
  color: ${({ theme, $active }) =>
    $active ? theme.color.purple : theme.color.muted2};
  cursor: pointer;
  transition: all 0.12s;
  text-align: center;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};

  &:hover {
    border-color: ${({ theme }) => theme.color.purple};
    color: ${({ theme }) => theme.color.purple};
  }
`;

export const PtsCol = styled.div`
  text-align: right;

  @media (max-width: 740px) {
    grid-column: span 2;
  }
`;

export const GoalPts = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  color: ${({ theme }) => theme.color.purple};
`;

export const GoalPtsMuted = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  color: ${({ theme }) => theme.color.muted2};
`;

export const GoalPtsLabel = styled.div`
  font-size: 0.58rem;
  color: ${({ theme }) => theme.color.muted};
  margin-top: 3px;
`;

export const SaveCol = styled.div`
  @media (max-width: 740px) {
    grid-column: span 2;
  }
`;

export const PrimaryBtn = styled.button<{ $saved?: boolean }>`
  background: ${({ theme, $saved }) =>
    $saved ? theme.color.greenDim : theme.color.gold};
  color: ${({ theme, $saved }) =>
    $saved ? theme.color.green : theme.color.bg};
  border: ${({ $saved }) =>
    $saved ? '1px solid rgba(74,222,128,0.3)' : 'none'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 9px 0;
  width: 100%;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: ${({ $saved }) => ($saved ? 'default' : 'pointer')};
  transition: opacity 0.15s;
  text-transform: uppercase;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.85;
  }
`;

export const ProgressTrack = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.color.surface2};
  border-radius: 3px;
  overflow: hidden;
`;

export const ProgressFill = styled.div<{ $complete: boolean; $widthPct: number }>`
  height: 6px;
  width: ${({ $widthPct }) => $widthPct}%;
  background: ${({ theme, $complete }) =>
    $complete ? theme.color.green : theme.color.purple};
  border-radius: 3px;
  transition: width 0.4s ease;
`;

export const LoggedValue = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.green};
  line-height: 1.1;
`;

export const LoggedLbl = styled.div`
  font-size: 0.58rem;
  color: ${({ theme }) => theme.color.muted2};
  margin-top: 4px;
`;

export const UnlockBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.color.border2};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 4px 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.color.muted2};
  font-size: 0.62rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s;
  font-family: ${({ theme }) => theme.font.body};

  &:hover {
    border-color: ${({ theme }) => theme.color.gold};
    color: ${({ theme }) => theme.color.gold};
  }
`;

export const HintRow = styled.div`
  font-size: 0.58rem;
  color: ${({ theme }) => theme.color.muted};
  line-height: 1.4;
`;

export const ValErr = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.color.red};
`;
