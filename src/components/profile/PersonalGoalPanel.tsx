import { useCallback, useEffect, useState } from 'react';
import { useChallenge } from '../../context/ChallengeContext';
import {
  GOAL_RESET_CLOSE,
  GOAL_RESET_OPEN,
  PROFILE_MAX_PTS,
} from '../../lib/config';
import { today } from '../../lib/dates';
import { calcProfilePts, fmtPts } from '../../lib/scoring';
import type { Person, ProfileData, ResetLogEntry } from '../../types';
import type { ProfileInputs } from '../../pages/profilesStyles';
import * as S from '../../pages/profilesStyles';
import * as GH from './personalGoalHorizontalStyles';

function nowTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

const emptyInputs: ProfileInputs = {
  goalInput: '',
  startInput: '',
  direction: 'down',
  valueInput: '',
};

export function PersonalGoalPanel({ person }: { person: Person }) {
  const { profiles, updateCache, postToSheets, checkPassword, clearGeneration } =
    useChallenge();

  const [inputs, setInputs] = useState<ProfileInputs>(emptyInputs);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPw, setUnlockPw] = useState('');
  const [unlockErr, setUnlockErr] = useState('');
  const [confirmValue, setConfirmValue] = useState(false);
  const [valueErr, setValueErr] = useState('');

  const personId = person.id;

  useEffect(() => {
    if (clearGeneration === 0) return;
    setInputs(emptyInputs);
    setUnlockOpen(false);
    setUnlockPw('');
    setUnlockErr('');
    setConfirmValue(false);
    setValueErr('');
  }, [clearGeneration]);

  useEffect(() => {
    setInputs(emptyInputs);
    setUnlockOpen(false);
    setUnlockPw('');
    setUnlockErr('');
    setConfirmValue(false);
    setValueErr('');
  }, [personId]);

  const pData = useCallback(
    (): ProfileData =>
      profiles[personId] ?? {
        goal: null,
        startVal: null,
        direction: 'down',
        lockedGoal: false,
        goalResets: 0,
        entries: [],
      },
    [profiles, personId],
  );

  const setProfileDir = useCallback((dir: 'down' | 'up') => {
    setInputs((s) => ({ ...s, direction: dir }));
  }, []);

  const lockGoal = useCallback(() => {
    const goalVal = parseFloat(inputs.goalInput);
    const startVal = parseFloat(inputs.startInput);
    const direction = inputs.direction || 'down';

    if (Number.isNaN(goalVal)) {
      window.alert('Please enter a valid goal value.');
      return;
    }
    if (Number.isNaN(startVal)) {
      window.alert('Please enter a valid starting value.');
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
      type: 'goal_set',
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

    void postToSheets('saveProfile', {
      personId,
      goal: goalVal,
      startVal,
      direction,
      lockedGoal: true,
      goalResets: resetCount,
    });
    void postToSheets('appendResetLog', resetEntry);
  }, [inputs, personId, postToSheets, profiles, updateCache]);

  const toggleUnlock = useCallback(() => {
    if (unlockOpen) {
      setUnlockOpen(false);
      setUnlockPw('');
      setUnlockErr('');
      return;
    }
    setUnlockOpen(true);
    setUnlockPw('');
    setUnlockErr('');
  }, [unlockOpen]);

  const confirmUnlock = useCallback(() => {
    const now = new Date();
    if (now < GOAL_RESET_OPEN || now > GOAL_RESET_CLOSE) {
      setUnlockErr('Goal resets are only allowed March 16–20, 2026.');
      return;
    }

    if (!checkPassword(personId, unlockPw)) {
      setUnlockErr('Incorrect password. Try again.');
      setUnlockPw('');
      return;
    }

    const pd = profiles[personId];
    if (!pd) return;

    const resetCount = (pd.goalResets || 0) + 1;
    const time = nowTime();
    const resetEntry: ResetLogEntry = {
      date: today(),
      time,
      personId,
      type: 'goal_reset',
      previousGoal: pd.goal,
      previousStart: pd.startVal,
      previousDirection: pd.direction,
      resetNumber: resetCount,
    };

    updateCache((prev) => ({
      ...prev,
      resetLog: [...prev.resetLog, resetEntry],
      profiles: {
        ...prev.profiles,
        [personId]: {
          goal: null,
          startVal: null,
          direction: 'down',
          lockedGoal: false,
          goalResets: resetCount,
          entries: pd.entries ?? [],
        },
      },
    }));

    void postToSheets('appendResetLog', resetEntry);
    void postToSheets('saveProfile', {
      personId,
      goal: '',
      startVal: '',
      direction: 'down',
      lockedGoal: false,
      goalResets: resetCount,
    });

    setInputs(emptyInputs);
    setUnlockOpen(false);
    setUnlockPw('');
    setUnlockErr('');
  }, [checkPassword, personId, postToSheets, profiles, unlockPw, updateCache]);

  const askProfileConfirm = useCallback(() => {
    const val = inputs.valueInput;
    setValueErr('');
    if (!val || Number.isNaN(parseFloat(val))) {
      setValueErr('Please enter your current value first.');
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

    const pts = calcProfilePts(val, pd.goal, pd.startVal, pd.direction || 'down');
    const date = today();
    const time = nowTime();
    const entry = { date, value: val, pts, lockedDay: true, time };

    const list = pd.entries ?? [];
    const idx = list.findIndex((e) => e.date === date);
    const nextEntries =
      idx >= 0 ? list.map((e, i) => (i === idx ? entry : e)) : [...list, entry];

    updateCache((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [personId]: { ...pd, entries: nextEntries },
      },
    }));

    void postToSheets('saveGoalDay', {
      date,
      personId,
      time,
      value: val,
      pts,
      lockedDay: true,
    });

    setInputs((s) => ({ ...s, valueInput: '' }));
    setConfirmValue(false);
  }, [inputs.valueInput, personId, postToSheets, profiles, updateCache]);

  const data = pData();
  const inp = inputs;
  const goalLocked = data.lockedGoal;
  const goal = data.goal;
  const startVal = data.startVal;
  const direction = data.direction || 'down';
  const todayEntry =
    (data.entries ?? []).find((e) => e.date === today()) ?? null;

  let progressPct = 0;
  let previewPts: number | null = null;
  if (goalLocked && startVal != null) {
    if (todayEntry) {
      previewPts = todayEntry.pts;
      progressPct = Math.min(
        100,
        Math.round((previewPts / PROFILE_MAX_PTS) * 100),
      );
    } else if (inp.valueInput) {
      previewPts = calcProfilePts(inp.valueInput, goal, startVal, direction);
      progressPct = Math.min(
        100,
        Math.round((previewPts / PROFILE_MAX_PTS) * 100),
      );
    }
  }

  const isComplete = previewPts != null && previewPts >= PROFILE_MAX_PTS;
  const dirLabel = direction === 'down' ? 'Going down' : 'Going up';

  const lockIcon = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="3"
        y="7"
        width="10"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5 7V5a3 3 0 0 1 6 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div>
      <S.SectionHeader>
        <S.SectionTitle>Personal goal</S.SectionTitle>
        <S.SectionSub>
          Set your goal once — log your current value each day to earn up to 30 bonus pts
        </S.SectionSub>
      </S.SectionHeader>

      <GH.Card $todaySaved={goalLocked && !!todayEntry}>
        {unlockOpen ? (
          <GH.FullSpan>
            <S.PwBar>
              <S.PwLabel>Enter {person.name}&apos;s password to reset goal:</S.PwLabel>
              <S.PwInput
                type="password"
                placeholder="Password"
                value={unlockPw}
                onChange={(e) => setUnlockPw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmUnlock();
                }}
                autoFocus
              />
              <S.PwBarBtns>
                <S.BtnGhost type="button" onClick={toggleUnlock}>
                  Cancel
                </S.BtnGhost>
                <S.BtnGold type="button" onClick={confirmUnlock}>
                  Unlock
                </S.BtnGold>
              </S.PwBarBtns>
              {unlockErr ? <S.PwError>{unlockErr}</S.PwError> : null}
            </S.PwBar>
          </GH.FullSpan>
        ) : null}

        <GH.PersonCol>
          <GH.PersonName>{person.name}</GH.PersonName>
          <GH.PersonMeta>
            {goalLocked ? (
              <>
                Goal: <GH.GoalPtsLine>{goal}</GH.GoalPtsLine> · Start: {startVal} ·{' '}
                {dirLabel}
                <br />
                {progressPct}% of {PROFILE_MAX_PTS} pts
                {data.goalResets > 0 ? (
                  <>
                    <br />
                    Goal reset {data.goalResets} time{data.goalResets !== 1 ? 's' : ''}
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
          {goalLocked ? (
            <GH.UnlockRow>
              <GH.UnlockBtn type="button" onClick={toggleUnlock} title="Reset goal">
                {lockIcon}
                Reset
              </GH.UnlockBtn>
            </GH.UnlockRow>
          ) : null}
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
                  $active={inp.direction === 'down'}
                  onClick={() => setProfileDir('down')}
                >
                  Down
                </GH.DirBtn>
                <GH.DirBtn
                  type="button"
                  $active={inp.direction === 'up'}
                  onClick={() => setProfileDir('up')}
                >
                  Up
                </GH.DirBtn>
              </GH.DirRow>
            </>
          ) : todayEntry ? (
            <>
              <GH.FieldLabel>Today&apos;s value</GH.FieldLabel>
              <GH.LoggedValue>{todayEntry.value}</GH.LoggedValue>
              <GH.LoggedLbl>Logged today · locked</GH.LoggedLbl>
            </>
          ) : (
            <>
              <GH.FieldLabel>Today&apos;s value</GH.FieldLabel>
              <GH.NumInput
                type="number"
                step="any"
                placeholder="Current"
                value={inp.valueInput}
                onChange={(e) => {
                  setInputs((s) => ({ ...s, valueInput: e.target.value }));
                  if (confirmValue) setConfirmValue(false);
                  setValueErr('');
                }}
              />
            </>
          )}
        </GH.FieldCol>

        <GH.PtsCol>
          {previewPts != null ? (
            <GH.GoalPts>{fmtPts(previewPts)}</GH.GoalPts>
          ) : (
            <GH.GoalPtsMuted>—</GH.GoalPtsMuted>
          )}
          <GH.GoalPtsLabel>
            {todayEntry ? 'pts earned' : goalLocked ? 'goal pts' : 'preview'}
          </GH.GoalPtsLabel>
        </GH.PtsCol>

        <GH.SaveCol>
          {!goalLocked ? (
            <GH.PrimaryBtn type="button" onClick={lockGoal}>
              Set goal
            </GH.PrimaryBtn>
          ) : todayEntry ? (
            <GH.PrimaryBtn type="button" $saved disabled>
              Saved ✓
            </GH.PrimaryBtn>
          ) : (
            <GH.PrimaryBtn type="button" onClick={askProfileConfirm}>
              Save value
            </GH.PrimaryBtn>
          )}
        </GH.SaveCol>

        {goalLocked ? (
          <GH.FullSpan>
            <GH.ProgressTrack>
              <GH.ProgressFill $complete={isComplete} $widthPct={progressPct} />
            </GH.ProgressTrack>
          </GH.FullSpan>
        ) : null}

        {confirmValue ? (
          <GH.FullSpan>
            <S.ProfileConfirmBar>
              <span>Once saved you can&apos;t update today&apos;s value. Lock it in?</span>
              <S.ConfirmBtns>
                <S.BtnGhost type="button" onClick={() => setConfirmValue(false)}>
                  Cancel
                </S.BtnGhost>
                <S.BtnGold type="button" onClick={saveProfileDay}>
                  Lock In
                </S.BtnGold>
              </S.ConfirmBtns>
            </S.ProfileConfirmBar>
          </GH.FullSpan>
        ) : null}

        {valueErr && !unlockOpen ? (
          <GH.FullSpan>
            <GH.ValErr>{valueErr}</GH.ValErr>
          </GH.FullSpan>
        ) : null}

        {!goalLocked ? (
          <GH.FullSpan>
            <GH.HintRow>
              One lock per goal — same rules as before (password reset only in the allowed
              window).
            </GH.HintRow>
          </GH.FullSpan>
        ) : !todayEntry ? (
          <GH.FullSpan>
            <GH.HintRow>
              Save value locks today — you won&apos;t be able to edit until tomorrow.
            </GH.HintRow>
          </GH.FullSpan>
        ) : null}
      </GH.Card>
    </div>
  );
}
