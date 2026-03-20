import styled from 'styled-components';

export interface ProfileInputs {
  goalInput: string;
  startInput: string;
  direction: 'down' | 'up';
  valueInput: string;
}

export const SectionHeader = styled.div`
  margin-bottom: 1.75rem;
`;

export const SectionTitle = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.text};
`;

export const SectionSub = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.muted2};
  margin-top: 0.4rem;
`;

export const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
  }
`;

export const ProfileCard = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.color.border2};
  }
`;

export const ProfileHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

export const ProfileAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.purpleDim};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.65rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.purple};
  flex-shrink: 0;
`;

export const ProfileName = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

export const ProfileGoalLabel = styled.div`
  font-size: 0.62rem;
  color: ${({ theme }) => theme.color.muted};
  margin-top: 2px;
`;

export const ResetCount = styled.div`
  font-size: 0.58rem;
  color: ${({ theme }) => theme.color.muted};
  margin-top: 2px;
`;

export const UnlockBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.color.border2};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 4px 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.color.muted2};
  font-size: 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s;
  margin-left: auto;
  flex-shrink: 0;

  &:hover {
    border-color: ${({ theme }) => theme.color.gold};
    color: ${({ theme }) => theme.color.gold};
  }
`;

export const PwBar = styled.div`
  background: ${({ theme }) => theme.color.surface2};
  border: 1px solid ${({ theme }) => theme.color.border2};
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PwLabel = styled.label`
  font-size: 0.68rem;
  color: ${({ theme }) => theme.color.muted2};
  white-space: nowrap;
`;

export const PwInput = styled.input`
  flex: 1;
  min-width: 80px;
  max-width: 120px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border2};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 6px 10px;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.color.gold};
  }
`;

export const PwBarBtns = styled.div`
  display: flex;
  gap: 6px;
`;

export const PwError = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.color.red};
  width: 100%;
  margin-top: 2px;
`;

export const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const ProgressRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`;

export const ProgressLabel = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.color.muted2};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const ProgressVal = styled.span`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.purple};
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

export const GoalInputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  & > label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${({ theme }) => theme.color.muted};
  }
`;

export const GoalInputInner = styled.div<{ $mb?: boolean }>`
  display: flex;
  gap: 8px;
  margin-bottom: ${({ $mb }) => ($mb ? '6px' : '0')};
`;

export const FieldLabel = styled.div`
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.muted};
  margin-bottom: 4px;
`;

export const NumInput = styled.input`
  flex: 1;
  background: ${({ theme }) => theme.color.surface2};
  border: 1px solid ${({ theme }) => theme.color.border2};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 8px 10px;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.text};
  outline: none;
  width: 100%;

  &:focus {
    border-color: ${({ theme }) => theme.color.gold};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const LockBtn = styled.button<{ $locked?: boolean }>`
  background: ${({ theme, $locked }) =>
    $locked ? theme.color.greenDim : theme.color.purpleDim};
  color: ${({ theme, $locked }) =>
    $locked ? theme.color.green : theme.color.purple};
  border: 1px solid
    ${({ $locked }) =>
      $locked ? 'rgba(74,222,128,0.3)' : 'rgba(192,132,252,0.3)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 8px 14px;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: ${({ $locked }) => ($locked ? 'default' : 'pointer')};
  white-space: nowrap;
  text-transform: uppercase;
  transition: opacity 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: ${({ $locked }) => ($locked ? 1 : 0.35)};
    cursor: ${({ $locked }) => ($locked ? 'default' : 'not-allowed')};
  }
`;

export const GoalHint = styled.div<{ $mt?: boolean }>`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.color.muted};
  margin-top: ${({ $mt }) => ($mt ? '6px' : '0')};
`;

export const DirRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
`;

export const DirBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.color.purple : theme.color.border2)};
  background: ${({ theme, $active }) =>
    $active ? theme.color.purpleDim : theme.color.surface2};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 0.75rem;
  color: ${({ theme, $active }) =>
    $active ? theme.color.purple : theme.color.muted2};
  cursor: pointer;
  transition: all 0.12s;
  text-align: center;
  font-weight: ${({ $active }) => ($active ? 500 : 400)};

  &:hover {
    border-color: ${({ theme }) => theme.color.purple};
    color: ${({ theme }) => theme.color.purple};
  }
`;

export const DailyValueSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const SavedDayDisplay = styled.div`
  background: ${({ theme }) => theme.color.greenDim};
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SavedDayVal = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.green};
`;

export const SavedDayLabel = styled.div`
  font-size: 0.62rem;
  color: ${({ theme }) => theme.color.muted2};
`;

export const PtsBadge = styled.div<{ $atGoal: boolean }>`
  background: ${({ theme }) => theme.color.purpleDim};
  border: 1px solid rgba(192, 132, 252, 0.2);
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 6px 10px;
  text-align: center;
  flex-shrink: 0;
  min-width: 64px;
`;

export const PtsBadgeVal = styled.div<{ $atGoal: boolean }>`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme, $atGoal }) =>
    $atGoal ? theme.color.green : theme.color.purple};
`;

export const PtsBadgeLabel = styled.div`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.color.muted};
  margin-top: 1px;
`;

export const SavePersonBtn = styled.button`
  background: ${({ theme }) => theme.color.gold};
  color: ${({ theme }) => theme.color.bg};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 9px 0;
  width: 100%;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  text-transform: uppercase;
  margin-top: 4px;

  &:hover {
    opacity: 0.85;
  }
`;

export const ProfileConfirmBar = styled.div`
  background: rgba(232, 160, 32, 0.08);
  border: 1px solid rgba(232, 160, 32, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.muted2};
  margin-top: 8px;
`;

export const ConfirmBtns = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

export const BtnGold = styled.button`
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

export const BtnGhost = styled.button`
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

export const ValErr = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.color.red};
  margin-top: 4px;
`;
