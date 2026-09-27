import { unwrap, unwrapMaybe } from '@/lib/db';
import { localDateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { NewRecordRow, UUID } from '@/types/database';
import type {
  ActiveWorkoutDraft,
  WorkoutSummary,
  WorkoutSummaryStats,
  WorkoutWithDetail,
} from '@/types/models';

/**
 * How a workout reaches the database
 * ----------------------------------
 * While training, the session lives only in local state (see
 * ActiveWorkoutProvider) so that logging a set never waits on the network.
 * When the user taps Finish we write the whole session in one go:
 *
 *   workouts  ->  workout_exercises  ->  workout_sets  ->  refresh_personal_records
 *
 * If any step fails the parent workout row is deleted, so a failed save
 * leaves no half-written session behind and the local draft is kept for a
 * retry. This is a simple save-and-retry model, not full offline sync.
 */

const WORKOUT_DETAIL_COLUMNS = `id,user_id,routine_id,name,status,started_at,completed_at,duration_seconds,notes,created_at,workout_exercises(id,workout_id,exercise_id,order_index,superset_group,notes,exercise:exercises(id,created_by,is_public,name,description,exercise_type,equipment,primary_muscle,secondary_muscles,difficulty,instructions,image_url,video_url,created_at),workout_sets(id,workout_exercise_id,set_number,set_type,weight,reps,duration_seconds,rpe,completed,created_at))`;

export interface SaveWorkoutResult {
  workoutId: UUID;
  stats: WorkoutSummaryStats;
}

export async function saveWorkout(
  userId: UUID,
  draft: ActiveWorkoutDraft,
  completedAt: number = Date.now(),
): Promise<SaveWorkoutResult> {
  // Only exercises with at least one completed set are worth saving.
  const exercises = draft.exercises
    .map((exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((set) => set.completed),
    }))
    .filter((exercise) => exercise.sets.length > 0);

  if (exercises.length === 0) {
    throw new Error('Log at least one set before finishing.');
  }

  const durationSeconds = Math.max(0, Math.round((completedAt - draft.startedAt) / 1000));

  const createdWorkout = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      routine_id: draft.routineId,
      name: draft.name.trim() || 'Workout',
      status: 'completed',
      started_at: new Date(draft.startedAt).toISOString(),
      completed_at: new Date(completedAt).toISOString(),
      duration_seconds: durationSeconds,
      notes: draft.notes?.trim() || null,
    })
    .select('id')
    .single();

  const workout = unwrap<{ id: UUID }>(createdWorkout);

  try {
    const insertedExercises = await supabase
      .from('workout_exercises')
      .insert(
        exercises.map((exercise, index) => ({
          workout_id: workout.id,
          exercise_id: exercise.exerciseId,
          order_index: index,
          superset_group: exercise.supersetGroup,
          notes: exercise.notes?.trim() || null,
        })),
      )
      .select('id,order_index');

    const exerciseRows = unwrap<{ id: UUID; order_index: number }[]>(insertedExercises);

    // Match on order_index rather than array position: PostgREST does not
    // promise that the returned rows come back in insert order.
    const idByOrder = new Map<number, UUID>();
    for (const row of exerciseRows) idByOrder.set(row.order_index, row.id);

    const setRows = exercises.flatMap((exercise, index) => {
      const workoutExerciseId = idByOrder.get(index);
      if (!workoutExerciseId) return [];
      return exercise.sets.map((set, setIndex) => ({
        workout_exercise_id: workoutExerciseId,
        set_number: setIndex + 1,
        set_type: set.setType,
        weight: set.weight,
        reps: set.reps,
        duration_seconds: set.durationSeconds,
        rpe: set.rpe,
        completed: true,
      }));
    });

    if (setRows.length > 0) {
      const { error } = await supabase.from('workout_sets').insert(setRows);
      if (error) throw error;
    }

    // Personal records are computed server-side so the rules live in one
    // place and cannot drift between clients.
    let newRecords: NewRecordRow[] = [];
    try {
      const prResult = await supabase.rpc('refresh_personal_records', {
        p_workout_id: workout.id,
      });
      newRecords = unwrap<NewRecordRow[]>(prResult) ?? [];
    } catch {
      // A PR-calculation hiccup must not fail an otherwise-saved workout.
      newRecords = [];
    }

    const totalVolume = exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets.reduce((setSum, set) => setSum + (set.weight ?? 0) * (set.reps ?? 0), 0),
      0,
    );

    return {
      workoutId: workout.id,
      stats: {
        durationSeconds,
        exerciseCount: exercises.length,
        setCount: setRows.length,
        totalVolume,
        newRecords: newRecords.map((record) => ({
          exerciseName: record.exercise_name,
          recordType: record.record_type,
          value: record.value,
          previousValue: record.previous_value,
        })),
      },
    };
  } catch (error) {
    // Roll back: child rows cascade with the parent.
    await supabase.from('workouts').delete().eq('id', workout.id);
    throw error;
  }
}

export interface WorkoutHistoryPage {
  items: WorkoutSummary[];
  hasMore: boolean;
}

interface HistoryRow {
  id: UUID;
  name: string;
  completed_at: string | null;
  duration_seconds: number | null;
  workout_exercises: {
    id: UUID;
    workout_sets: { weight: number | null; reps: number | null; completed: boolean }[];
  }[];
}

const PAGE_SIZE = 20;

export async function listWorkoutHistory(page = 0): Promise<WorkoutHistoryPage> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE; // fetch one extra to detect another page

  const result = await supabase
    .from('workouts')
    .select(
      'id,name,completed_at,duration_seconds,workout_exercises(id,workout_sets(weight,reps,completed))',
    )
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .range(from, to);

  const rows = unwrap<HistoryRow[]>(result);
  const hasMore = rows.length > PAGE_SIZE;
  const visible = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const items: WorkoutSummary[] = visible.map((row) => {
    let setCount = 0;
    let totalVolume = 0;
    for (const exercise of row.workout_exercises ?? []) {
      for (const set of exercise.workout_sets ?? []) {
        if (!set.completed) continue;
        setCount += 1;
        totalVolume += (set.weight ?? 0) * (set.reps ?? 0);
      }
    }
    return {
      id: row.id,
      name: row.name,
      completed_at: row.completed_at,
      duration_seconds: row.duration_seconds,
      exercise_count: row.workout_exercises?.length ?? 0,
      set_count: setCount,
      total_volume: totalVolume,
    };
  });

  return { items, hasMore };
}

/**
 * The local calendar days between `from` and `to` on which the user actually
 * completed a workout — what the Home calendar marks.
 *
 * Only `status = 'completed'` rows count, so a routine that was opened,
 * planned or abandoned mid-session never marks a day. The returned set is
 * keyed by the day *in the device's timezone*, which also collapses two
 * workouts on the same day into one entry.
 */
export async function getWorkoutDays(from: Date, to: Date): Promise<Set<string>> {
  const result = await supabase
    .from('workouts')
    .select('completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .gte('completed_at', from.toISOString())
    .lte('completed_at', to.toISOString());

  const rows = unwrap<{ completed_at: string | null }[]>(result) ?? [];

  const days = new Set<string>();
  for (const row of rows) {
    if (!row.completed_at) continue;
    const key = localDateKey(row.completed_at);
    if (key) days.add(key);
  }
  return days;
}

export async function getRecentWorkouts(limit = 3): Promise<WorkoutSummary[]> {
  const page = await listWorkoutHistory(0);
  return page.items.slice(0, limit);
}

export async function getWorkout(id: UUID): Promise<WorkoutWithDetail | null> {
  const result = await supabase
    .from('workouts')
    .select(WORKOUT_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  const workout = unwrapMaybe<WorkoutWithDetail>(result);
  if (!workout) return null;

  workout.workout_exercises = [...(workout.workout_exercises ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((exercise) => ({
      ...exercise,
      workout_sets: [...(exercise.workout_sets ?? [])].sort((a, b) => a.set_number - b.set_number),
    }));

  return workout;
}

export async function deleteWorkout(id: UUID): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
}

/** Volume of a saved workout, used on the detail screen. */
export function computeWorkoutVolume(workout: WorkoutWithDetail): number {
  return workout.workout_exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.workout_sets.reduce(
        (setSum, set) => setSum + (set.completed ? (set.weight ?? 0) * (set.reps ?? 0) : 0),
        0,
      ),
    0,
  );
}

export function countWorkoutSets(workout: WorkoutWithDetail): number {
  return workout.workout_exercises.reduce(
    (sum, exercise) => sum + exercise.workout_sets.filter((set) => set.completed).length,
    0,
  );
}
