export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
}

export type GymChoice = 'went' | 'skip' | 'free-gym' | '';
export type JunkChoice = 'clean' | 'ate' | 'free-junk' | '';
export type ProfileDirection = 'down' | 'up';

export interface WorkoutEntry {
  date: string;
  personId: string;
  time: string;
  gym: string;
  steps: number;
  junk: string;
  pts: number;
  lockedDay: boolean;
}

export interface GoalDayEntry {
  date: string;
  time: string;
  value: number;
  pts: number;
  lockedDay: boolean;
}

export interface ProfileData {
  goal: number | null;
  startVal: number | null;
  direction: string;
  lockedGoal: boolean;
  goalResets: number;
  entries: GoalDayEntry[];
}

export type ResetLogEntry =
  | {
      date: string;
      time: string;
      personId: string;
      type: 'goal_reset';
      previousGoal: unknown;
      previousStart: unknown;
      previousDirection: string;
      resetNumber: number;
      goal?: unknown;
      startVal?: unknown;
      direction?: unknown;
      setNumber?: number;
    }
  | {
      date: string;
      time: string;
      personId: string;
      type: 'goal_set';
      goal: number;
      startVal: number;
      direction: string;
      setNumber: number;
    };

export interface SheetsPayload {
  workout_log?: RawWorkoutRow[];
  profiles?: RawProfileRow[];
  goal_log?: RawGoalLogRow[];
  passwords?: RawPasswordRow[];
  reset_log?: RawResetLogRow[];
  error?: string;
}

export interface RawWorkoutRow {
  date?: string | number;
  personId?: string;
  time?: string;
  gym?: string;
  steps?: string | number;
  junk?: string;
  pts?: string | number;
  lockedDay?: boolean | string;
}

export interface RawProfileRow {
  personId?: string;
  goal?: string | number | null;
  startVal?: string | number | null;
  direction?: string;
  lockedGoal?: boolean | string;
  goalResets?: string | number;
}

export interface RawGoalLogRow {
  personId?: string;
  date?: string | number;
  time?: string;
  value?: string | number;
  pts?: string | number;
  lockedDay?: boolean | string;
}

export interface RawPasswordRow {
  key?: string;
  password?: string;
}

export interface RawResetLogRow {
  date?: string | number;
  time?: string;
  personId?: string;
  type?: string;
  previousGoal?: unknown;
  previousStart?: unknown;
  previousDirection?: string;
  resetNumber?: string | number;
  goal?: unknown;
  startVal?: unknown;
  direction?: string;
  setNumber?: string | number;
}

export interface RankedPlayer {
  personId: PersonId;
  name: string;
  pts: number;
  days: number;
  profilePts: number;
}

export interface HistoryRow {
  date: string;
  time: string;
  name: string;
  typeKey: 'workout' | 'goal' | 'goal_set' | 'goal_reset';
  details: string;
  pts: number | null;
  isGoal: boolean;
}
