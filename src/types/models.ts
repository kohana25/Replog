/**
 * Types that describe app-level shapes rather than raw table rows:
 * joined query results, and the local draft of an in-progress workout.
 */

import type {
  ExerciseRow,
  MuscleGroup,
  ExerciseType,
  PersonalRecordRow,
  RoutineExerciseRow,
  SetType,
  SuggestedRoutineExerciseRow,
  SuggestedRoutineRow,
  Timestamp,
  UUID,
  WorkoutExerciseRow,
  WorkoutRoutineRow,
  WorkoutRow,
  WorkoutSetRow,
} from './database';

/** A routine plus its ordered exercises, each with the exercise joined in. */
export interface RoutineWithExercises extends WorkoutRoutineRow {
  routine_exercises: (RoutineExerciseRow & { exercise: ExerciseRow })[];
}

/** A suggested routine plus its ordered exercises. */
export interface SuggestedRoutineWithExercises extends SuggestedRoutineRow {
  suggested_routine_exercises: (SuggestedRoutineExerciseRow & { exercise: ExerciseRow })[];
}

/** Card-sized row for the Workout tab — the count, not the exercises. */
export interface SuggestedRoutineListItem extends SuggestedRoutineRow {
  exercise_count: number;
  /** First exercise of the routine — the card borrows its picture. */
  cover_exercise: { name: string; primary_muscle: MuscleGroup } | null;
}

/**
 * The part of a planned exercise the workout draft actually needs, common to
 * a saved routine and a suggested one. `superset_group` is optional because
 * only saved routines carry it.
 */
export interface PlannedExercise {
  exercise_id: UUID;
  exercise: Pick<ExerciseRow, 'name' | 'exercise_type'>;
  sets: number;
  rest_seconds: number;
  notes: string | null;
  superset_group?: string | null;
}

/** A saved workout with everything needed to render the detail screen. */
export interface WorkoutWithDetail extends WorkoutRow {
  workout_exercises: (WorkoutExerciseRow & {
    exercise: ExerciseRow;
    workout_sets: WorkoutSetRow[];
  })[];
}

/** Lightweight row for the history list — deliberately does not fetch sets. */
export interface WorkoutSummary {
  id: UUID;
  name: string;
  completed_at: Timestamp | null;
  duration_seconds: number | null;
  exercise_count: number;
  set_count: number;
  total_volume: number;
}

export interface PersonalRecordWithExercise extends PersonalRecordRow {
  exercise: Pick<ExerciseRow, 'id' | 'name' | 'primary_muscle'>;
}

/* ------------------------------------------------------------------ */
/* Active workout draft                                                */
/*                                                                     */
/* While a workout is in progress it lives in local state (and is      */
/* mirrored to AsyncStorage) so that typing a set never waits on the   */
/* network. It is written to Supabase once, when the user finishes.    */
/* ------------------------------------------------------------------ */

export interface DraftSet {
  /** Local id — the database id does not exist until the workout is saved. */
  localId: string;
  setNumber: number;
  setType: SetType;
  /** Always kilograms, regardless of the user's display preference. */
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface DraftExercise {
  localId: string;
  exerciseId: UUID;
  name: string;
  exerciseType: ExerciseType;
  restSeconds: number;
  notes: string | null;
  supersetGroup: string | null;
  sets: DraftSet[];
}

export interface ActiveWorkoutDraft {
  localId: string;
  routineId: UUID | null;
  name: string;
  /** Epoch milliseconds. Elapsed time is always derived from this. */
  startedAt: number;
  exercises: DraftExercise[];
  notes: string | null;
}

export interface RestTimerState {
  /** Epoch ms at which the rest period ends. Null when no timer is running. */
  endsAt: number | null;
  /** Total length of the current rest period, for the progress bar. */
  totalSeconds: number;
  /** Remaining seconds captured at the moment the user paused. */
  pausedRemaining: number | null;
  label: string | null;
}

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'failed';

/** What the completion screen shows after a workout is saved. */
export interface WorkoutSummaryStats {
  durationSeconds: number;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  newRecords: { exerciseName: string; recordType: string; value: number; previousValue: number | null }[];
}
