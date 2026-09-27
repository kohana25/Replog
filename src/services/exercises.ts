import { unwrap, unwrapMaybe } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type {
  Equipment,
  ExerciseHistoryRow,
  ExerciseRow,
  ExerciseType,
  ExperienceLevel,
  MuscleGroup,
  PersonalRecordRow,
  PreviousSetRow,
  UUID,
} from '@/types/database';
import type { PersonalRecordWithExercise } from '@/types/models';

const EXERCISE_COLUMNS =
  'id,created_by,is_public,name,description,exercise_type,equipment,primary_muscle,secondary_muscles,difficulty,instructions,image_url,video_url,created_at';

export interface ExerciseFilters {
  search?: string;
  muscle?: MuscleGroup | null;
  equipment?: Equipment | null;
  exerciseType?: ExerciseType | null;
  difficulty?: ExperienceLevel | null;
  /** 'all' = library + the user's own, 'custom' = only the user's own. */
  scope?: 'all' | 'custom';
}

/**
 * List exercises. RLS already restricts this to public rows plus the
 * caller's own custom exercises, so there is no user filter here except
 * the optional "only mine" scope.
 */
export async function listExercises(filters: ExerciseFilters = {}): Promise<ExerciseRow[]> {
  let query = supabase.from('exercises').select(EXERCISE_COLUMNS);

  if (filters.scope === 'custom') {
    query = query.eq('is_public', false);
  }
  if (filters.muscle) query = query.eq('primary_muscle', filters.muscle);
  if (filters.equipment) query = query.eq('equipment', filters.equipment);
  if (filters.exerciseType) query = query.eq('exercise_type', filters.exerciseType);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

  const search = filters.search?.trim();
  if (search) {
    // escape PostgREST pattern characters so a stray % does not match everything
    const safe = search.replace(/[%_,]/g, ' ');
    query = query.ilike('name', `%${safe}%`);
  }

  const result = await query.order('name', { ascending: true }).limit(300);
  return unwrap<ExerciseRow[]>(result);
}

export async function getExercise(id: UUID): Promise<ExerciseRow | null> {
  const result = await supabase
    .from('exercises')
    .select(EXERCISE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  return unwrapMaybe<ExerciseRow>(result);
}

export async function getExercisesByIds(ids: UUID[]): Promise<ExerciseRow[]> {
  if (ids.length === 0) return [];
  const result = await supabase.from('exercises').select(EXERCISE_COLUMNS).in('id', ids);
  return unwrap<ExerciseRow[]>(result);
}

export interface CustomExerciseInput {
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment;
  exerciseType: ExerciseType;
  secondaryMuscles?: string[];
  notes?: string | null;
}

/**
 * Create a private exercise owned by the signed-in user. `is_public` is
 * forced to false and `created_by` to the caller — the RLS policy rejects
 * anything else, so the client cannot inject rows into the shared library.
 */
export async function createCustomExercise(
  userId: UUID,
  input: CustomExerciseInput,
): Promise<ExerciseRow> {
  const result = await supabase
    .from('exercises')
    .insert({
      created_by: userId,
      is_public: false,
      name: input.name.trim(),
      primary_muscle: input.primaryMuscle,
      equipment: input.equipment,
      exercise_type: input.exerciseType,
      secondary_muscles: input.secondaryMuscles ?? [],
      description: input.notes?.trim() || null,
    })
    .select(EXERCISE_COLUMNS)
    .single();

  return unwrap<ExerciseRow>(result);
}

export async function updateCustomExercise(
  id: UUID,
  input: Partial<CustomExerciseInput>,
): Promise<ExerciseRow> {
  const result = await supabase
    .from('exercises')
    .update({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.primaryMuscle !== undefined ? { primary_muscle: input.primaryMuscle } : {}),
      ...(input.equipment !== undefined ? { equipment: input.equipment } : {}),
      ...(input.exerciseType !== undefined ? { exercise_type: input.exerciseType } : {}),
      ...(input.secondaryMuscles !== undefined
        ? { secondary_muscles: input.secondaryMuscles }
        : {}),
      ...(input.notes !== undefined ? { description: input.notes?.trim() || null } : {}),
    })
    .eq('id', id)
    .select(EXERCISE_COLUMNS)
    .single();

  return unwrap<ExerciseRow>(result);
}

export async function deleteCustomExercise(id: UUID): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

/**
 * The sets logged the last time this exercise was trained — shown as
 * "Previous: 60 × 10" while logging.
 */
export async function getPreviousSets(exerciseId: UUID): Promise<PreviousSetRow[]> {
  const result = await supabase.rpc('get_previous_exercise_sets', {
    p_exercise_id: exerciseId,
  });
  return unwrap<PreviousSetRow[]>(result) ?? [];
}

/** Batch version used when an active workout starts, to avoid N round trips. */
export async function getPreviousSetsForMany(
  exerciseIds: UUID[],
): Promise<Record<UUID, PreviousSetRow[]>> {
  const results = await Promise.all(
    exerciseIds.map(async (id) => {
      try {
        return [id, await getPreviousSets(id)] as const;
      } catch {
        return [id, [] as PreviousSetRow[]] as const;
      }
    }),
  );

  const map: Record<UUID, PreviousSetRow[]> = {};
  for (const [id, sets] of results) map[id] = sets;
  return map;
}

export async function getExerciseHistory(
  exerciseId: UUID,
  limit = 12,
): Promise<ExerciseHistoryRow[]> {
  const result = await supabase.rpc('get_exercise_history', {
    p_exercise_id: exerciseId,
    p_limit: limit,
  });
  return unwrap<ExerciseHistoryRow[]>(result) ?? [];
}

export async function getRecordsForExercise(exerciseId: UUID): Promise<PersonalRecordRow[]> {
  const result = await supabase
    .from('personal_records')
    .select('id,user_id,exercise_id,record_type,value,weight,reps,workout_id,achieved_at')
    .eq('exercise_id', exerciseId);
  return unwrap<PersonalRecordRow[]>(result);
}

export async function getRecentRecords(limit = 8): Promise<PersonalRecordWithExercise[]> {
  const result = await supabase
    .from('personal_records')
    .select(
      'id,user_id,exercise_id,record_type,value,weight,reps,workout_id,achieved_at,exercise:exercises(id,name,primary_muscle)',
    )
    .order('achieved_at', { ascending: false })
    .limit(limit);
  return unwrap<PersonalRecordWithExercise[]>(result);
}
