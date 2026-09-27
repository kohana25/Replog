import { unwrap, unwrapMaybe } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { UUID, WorkoutRoutineRow } from '@/types/database';
import type { RoutineWithExercises } from '@/types/models';

const ROUTINE_COLUMNS =
  'id,user_id,name,description,folder,estimated_duration,created_at,updated_at';

const ROUTINE_WITH_EXERCISES = `${ROUTINE_COLUMNS},routine_exercises(id,routine_id,exercise_id,order_index,sets,target_reps,target_weight,target_duration,rest_seconds,superset_group,notes,exercise:exercises(id,created_by,is_public,name,description,exercise_type,equipment,primary_muscle,secondary_muscles,difficulty,instructions,image_url,video_url,created_at))`;

export interface RoutineListItem extends WorkoutRoutineRow {
  exercise_count: number;
}

/** Routine list for the Workout tab — one query, no per-row follow-ups. */
export async function listRoutines(): Promise<RoutineListItem[]> {
  const result = await supabase
    .from('workout_routines')
    .select(`${ROUTINE_COLUMNS},routine_exercises(count)`)
    .order('updated_at', { ascending: false });

  const rows = unwrap<(WorkoutRoutineRow & { routine_exercises: { count: number }[] })[]>(result);

  return rows.map((row) => ({
    ...row,
    exercise_count: row.routine_exercises?.[0]?.count ?? 0,
  }));
}

export async function getRoutine(id: UUID): Promise<RoutineWithExercises | null> {
  const result = await supabase
    .from('workout_routines')
    .select(ROUTINE_WITH_EXERCISES)
    .eq('id', id)
    .order('order_index', { referencedTable: 'routine_exercises', ascending: true })
    .maybeSingle();

  const routine = unwrapMaybe<RoutineWithExercises>(result);
  if (!routine) return null;

  // Defensive: never rely on the server ordering alone for something the UI
  // presents as a sequence.
  routine.routine_exercises = [...(routine.routine_exercises ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );
  return routine;
}

export interface RoutineExerciseInput {
  exerciseId: UUID;
  sets: number;
  targetReps: number | null;
  targetWeight: number | null;
  targetDuration: number | null;
  restSeconds: number;
  notes?: string | null;
}

export interface RoutineInput {
  name: string;
  description?: string | null;
  folder?: string | null;
  estimatedDuration?: number | null;
  exercises: RoutineExerciseInput[];
}

function toRoutineExerciseRows(routineId: UUID, exercises: RoutineExerciseInput[]) {
  return exercises.map((item, index) => ({
    routine_id: routineId,
    exercise_id: item.exerciseId,
    order_index: index,
    sets: item.sets,
    target_reps: item.targetReps,
    target_weight: item.targetWeight,
    target_duration: item.targetDuration,
    rest_seconds: item.restSeconds,
    notes: item.notes ?? null,
  }));
}

export async function createRoutine(userId: UUID, input: RoutineInput): Promise<UUID> {
  const created = await supabase
    .from('workout_routines')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      folder: input.folder?.trim() || null,
      estimated_duration: input.estimatedDuration ?? null,
    })
    .select('id')
    .single();

  const routine = unwrap<{ id: UUID }>(created);

  if (input.exercises.length > 0) {
    const { error } = await supabase
      .from('routine_exercises')
      .insert(toRoutineExerciseRows(routine.id, input.exercises));

    if (error) {
      // Don't leave a half-built routine behind.
      await supabase.from('workout_routines').delete().eq('id', routine.id);
      throw error;
    }
  }

  return routine.id;
}

/**
 * Update a routine and replace its exercise list.
 *
 * The exercise rows are deleted and re-inserted rather than diffed: the list
 * is short, the operation is inside one user action, and it keeps
 * `order_index` correct without a reordering dance.
 */
export async function updateRoutine(id: UUID, input: RoutineInput): Promise<void> {
  const { error: updateError } = await supabase
    .from('workout_routines')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      folder: input.folder?.trim() || null,
      estimated_duration: input.estimatedDuration ?? null,
    })
    .eq('id', id);
  if (updateError) throw updateError;

  const { error: deleteError } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', id);
  if (deleteError) throw deleteError;

  if (input.exercises.length > 0) {
    const { error: insertError } = await supabase
      .from('routine_exercises')
      .insert(toRoutineExerciseRows(id, input.exercises));
    if (insertError) throw insertError;
  }
}

export async function deleteRoutine(id: UUID): Promise<void> {
  // routine_exercises rows go with it via ON DELETE CASCADE.
  const { error } = await supabase.from('workout_routines').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateRoutine(userId: UUID, id: UUID): Promise<UUID> {
  const source = await getRoutine(id);
  if (!source) throw new Error('Routine not found');

  return createRoutine(userId, {
    name: `${source.name} (copy)`,
    description: source.description,
    folder: source.folder,
    estimatedDuration: source.estimated_duration,
    exercises: source.routine_exercises.map((item) => ({
      exerciseId: item.exercise_id,
      sets: item.sets,
      targetReps: item.target_reps,
      targetWeight: item.target_weight,
      targetDuration: item.target_duration,
      restSeconds: item.rest_seconds,
      notes: item.notes,
    })),
  });
}
