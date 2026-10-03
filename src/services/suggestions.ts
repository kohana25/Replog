/**
 * Suggested Workouts — routines matched to the profile the user already
 * filled in.
 *
 * WHAT DECIDES A SUGGESTION
 * `profiles.fitness_goal` and `profiles.experience_level`, and nothing else.
 * Those are the two values onboarding already collects, and the catalogue
 * holds two routines for each of the 18 combinations they can form.
 *
 * Height and weight are deliberately NOT inputs here. They belong to body
 * metrics and progress tracking; body size on its own does not say which
 * routine suits somebody, and prescribing training from it would be wrong.
 *
 * The catalogue itself (suggested_routines, suggested_routine_exercises) is
 * read-only through the API: it has a SELECT policy and no write policies at
 * all, so everything in this module is a query.
 */

import { unwrap, unwrapMaybe } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { ExperienceLevel, FitnessGoal, MuscleGroup, UUID } from '@/types/database';
import type { SuggestedRoutineListItem, SuggestedRoutineWithExercises } from '@/types/models';
import { createRoutine } from './routines';

const SUGGESTED_COLUMNS =
  'id,slug,fitness_goal,experience_level,name,description,estimated_duration,days_per_week,source_reference,order_index,created_at';

const SUGGESTED_WITH_EXERCISES = `${SUGGESTED_COLUMNS},suggested_routine_exercises(id,suggested_routine_id,exercise_id,order_index,sets,target_reps,target_duration,rest_seconds,notes,exercise:exercises(id,created_by,is_public,name,description,exercise_type,equipment,primary_muscle,secondary_muscles,difficulty,instructions,image_url,video_url,created_at))`;

/**
 * The routines for one goal + experience pair.
 *
 * Returns an empty list when either value is missing rather than falling back
 * to a generic set: a suggestion nobody's profile asked for is just noise, and
 * the Workout tab prompts the user to finish their profile instead.
 */
export async function listSuggestedRoutines(
  goal: FitnessGoal | null,
  level: ExperienceLevel | null,
): Promise<SuggestedRoutineListItem[]> {
  if (!goal || !level) return [];

  const result = await supabase
    .from('suggested_routines')
    .select(
      `${SUGGESTED_COLUMNS},suggested_routine_exercises(order_index,exercise:exercises(name,primary_muscle))`,
    )
    .eq('fitness_goal', goal)
    .eq('experience_level', level)
    .order('order_index', { ascending: true });

  type Cover = { order_index: number; exercise: { name: string; primary_muscle: MuscleGroup } | null };
  const rows = unwrap<(SuggestedRoutineListItem & { suggested_routine_exercises: Cover[] })[]>(
    result,
  );

  return rows.map((row) => {
    const items = row.suggested_routine_exercises ?? [];
    // Same idea as a saved routine: the card shows the first movement.
    const first = [...items].sort((a, b) => a.order_index - b.order_index)[0];
    return {
      ...row,
      exercise_count: items.length,
      cover_exercise: first?.exercise ?? null,
    };
  });
}

export async function getSuggestedRoutine(
  id: UUID,
): Promise<SuggestedRoutineWithExercises | null> {
  const result = await supabase
    .from('suggested_routines')
    .select(SUGGESTED_WITH_EXERCISES)
    .eq('id', id)
    .order('order_index', { referencedTable: 'suggested_routine_exercises', ascending: true })
    .maybeSingle();

  const routine = unwrapMaybe<SuggestedRoutineWithExercises>(result);
  if (!routine) return null;

  // Defensive: never rely on the server ordering alone for something the UI
  // presents as a sequence.
  routine.suggested_routine_exercises = [...(routine.suggested_routine_exercises ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );
  return routine;
}

/**
 * Copy a suggestion into the user's own routines.
 *
 * This goes through the existing createRoutine() unchanged, so the result is
 * an ordinary routine: it appears under Routines, can be edited, and links to
 * the workouts started from it like any other.
 */
export async function saveSuggestedRoutine(
  userId: UUID,
  routine: SuggestedRoutineWithExercises,
): Promise<UUID> {
  return createRoutine(userId, {
    name: routine.name,
    description: routine.description,
    estimatedDuration: routine.estimated_duration,
    exercises: routine.suggested_routine_exercises.map((item) => ({
      exerciseId: item.exercise_id,
      sets: item.sets,
      targetReps: item.target_reps,
      // The catalogue never prescribes a load: what to lift depends on the
      // person, so the workout screen starts it empty.
      targetWeight: null,
      targetDuration: item.target_duration,
      restSeconds: item.rest_seconds,
      notes: item.notes,
    })),
  });
}
