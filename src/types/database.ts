/**
 * Hand-written types that mirror supabase/migrations/0001_schema.sql.
 *
 * Keep this file in sync with the SQL. If you change a migration, change
 * the matching type here — the compiler is the only thing standing between
 * a renamed column and a runtime surprise.
 *
 * (You can also regenerate this with the Supabase CLI:
 *    npx supabase gen types typescript --project-id <ref> > src/types/database.ts )
 */

export type UUID = string;
/** ISO-8601 UTC string, e.g. "2026-09-14T10:30:00.000Z" */
export type Timestamp = string;
/** ISO date string, e.g. "2026-09-14" */
export type DateString = string;

export type FitnessGoal =
  | 'build_muscle'
  | 'gain_strength'
  | 'lose_weight'
  | 'improve_fitness'
  | 'maintain_fitness'
  | 'general_wellness';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'cardio'
  | 'full_body';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'kettlebell'
  | 'resistance_band'
  | 'bodyweight'
  | 'other';

/** Drives which inputs the workout logger shows. */
export type ExerciseType = 'strength' | 'bodyweight' | 'cardio' | 'duration' | 'stretching';

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export type WorkoutStatus = 'active' | 'completed' | 'cancelled';

export type RecordType = 'heaviest_weight' | 'best_reps' | 'best_volume' | 'estimated_1rm';

export type UnitPreference = 'kg' | 'lb';

export type ThemePreference = 'system' | 'light' | 'dark';

export type ProfileRow = {
  id: UUID;
  user_id: UUID;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  fitness_goal: FitnessGoal | null;
  experience_level: ExperienceLevel | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: DateString | null;
  training_days: string[];
  unit_preference: UnitPreference;
  theme_preference: ThemePreference;
  default_rest_seconds: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type ExerciseRow = {
  id: UUID;
  created_by: UUID | null;
  is_public: boolean;
  name: string;
  description: string | null;
  exercise_type: ExerciseType;
  equipment: Equipment;
  primary_muscle: MuscleGroup;
  secondary_muscles: string[];
  difficulty: ExperienceLevel | null;
  instructions: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: Timestamp;
}

export type WorkoutRoutineRow = {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  folder: string | null;
  estimated_duration: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type RoutineExerciseRow = {
  id: UUID;
  routine_id: UUID;
  exercise_id: UUID;
  order_index: number;
  sets: number;
  target_reps: number | null;
  target_weight: number | null;
  target_duration: number | null;
  rest_seconds: number;
  superset_group: string | null;
  notes: string | null;
}

/**
 * A routine from the Suggested Workouts catalogue (0006). Shared reference
 * data with no owner — read-only to every signed-in user — which is why it
 * is a separate table from the per-user `workout_routines`.
 */
export type SuggestedRoutineRow = {
  id: UUID;
  slug: string;
  fitness_goal: FitnessGoal;
  experience_level: ExperienceLevel;
  name: string;
  description: string | null;
  /** Minutes, like workout_routines.estimated_duration. */
  estimated_duration: number | null;
  days_per_week: number | null;
  /** Short attribution for the guidance the routine is built on. */
  source_reference: string | null;
  order_index: number;
  created_at: Timestamp;
}

/** Mirrors RoutineExerciseRow, minus the per-user target weight. */
export type SuggestedRoutineExerciseRow = {
  id: UUID;
  suggested_routine_id: UUID;
  exercise_id: UUID;
  order_index: number;
  sets: number;
  target_reps: number | null;
  target_duration: number | null;
  rest_seconds: number;
  notes: string | null;
}

export type WorkoutRow = {
  id: UUID;
  user_id: UUID;
  routine_id: UUID | null;
  name: string;
  status: WorkoutStatus;
  started_at: Timestamp;
  completed_at: Timestamp | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: Timestamp;
}

export type WorkoutExerciseRow = {
  id: UUID;
  workout_id: UUID;
  exercise_id: UUID;
  order_index: number;
  superset_group: string | null;
  notes: string | null;
}

export type WorkoutSetRow = {
  id: UUID;
  workout_exercise_id: UUID;
  set_number: number;
  set_type: SetType;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  completed: boolean;
  created_at: Timestamp;
}

export type PersonalRecordRow = {
  id: UUID;
  user_id: UUID;
  exercise_id: UUID;
  record_type: RecordType;
  value: number;
  weight: number | null;
  reps: number | null;
  workout_id: UUID | null;
  achieved_at: Timestamp;
}

export type BodyMeasurementRow = {
  id: UUID;
  user_id: UUID;
  measured_on: DateString;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  notes: string | null;
  created_at: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Return shapes of the SQL functions in 0003_functions.sql             */
/* ------------------------------------------------------------------ */

export type PreviousSetRow = {
  workout_id: UUID;
  performed_at: Timestamp;
  set_number: number;
  set_type: SetType;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
}

export type ExerciseHistoryRow = {
  workout_id: UUID;
  workout_name: string;
  performed_at: Timestamp;
  set_count: number;
  top_weight: number | null;
  top_reps: number | null;
  total_volume: number;
  best_estimated_1rm: number | null;
}

export type WorkoutOverviewRow = {
  total_workouts: number;
  total_sets: number;
  total_volume: number;
  total_duration_seconds: number;
  workouts_this_week: number;
  current_streak_days: number;
  last_workout_at: Timestamp | null;
}

export type WeeklyVolumeRow = {
  week_start: DateString;
  total_volume: number;
  workout_count: number;
  set_count: number;
}

export type MuscleDistributionRow = {
  primary_muscle: MuscleGroup;
  set_count: number;
  total_volume: number;
}

export type NewRecordRow = {
  exercise_id: UUID;
  exercise_name: string;
  record_type: RecordType;
  value: number;
  previous_value: number | null;
}

/* ------------------------------------------------------------------ */
/* Schema type consumed by createClient<Database>()                     */
/* ------------------------------------------------------------------ */

/**
 * Supabase's generic constraints require each Row/Insert/Update to satisfy
 * `Record<string, unknown>`. TypeScript only grants an implicit index
 * signature to plain object types — not to interfaces, and not to
 * intersections — so every type in this file is a `type` alias, and this
 * mapped wrapper flattens the intersection into a single object type.
 */
type Flatten<T> = { [K in keyof T]: T[K] };

type Insertable<T, Required extends keyof T> = Flatten<Partial<T> & Pick<T, Required>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<ProfileRow, 'user_id'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      exercises: {
        Row: ExerciseRow;
        Insert: Insertable<ExerciseRow, 'name' | 'primary_muscle'>;
        Update: Partial<ExerciseRow>;
        Relationships: [];
      };
      workout_routines: {
        Row: WorkoutRoutineRow;
        Insert: Insertable<WorkoutRoutineRow, 'user_id' | 'name'>;
        Update: Partial<WorkoutRoutineRow>;
        Relationships: [];
      };
      routine_exercises: {
        Row: RoutineExerciseRow;
        Insert: Insertable<RoutineExerciseRow, 'routine_id' | 'exercise_id'>;
        Update: Partial<RoutineExerciseRow>;
        Relationships: [];
      };
      // Catalogue tables: readable by any signed-in user, written only by
      // migration. `never` for Insert/Update so a stray write is a compile
      // error rather than a policy violation at runtime.
      suggested_routines: {
        Row: SuggestedRoutineRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      suggested_routine_exercises: {
        Row: SuggestedRoutineExerciseRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      workouts: {
        Row: WorkoutRow;
        Insert: Insertable<WorkoutRow, 'user_id'>;
        Update: Partial<WorkoutRow>;
        Relationships: [];
      };
      workout_exercises: {
        Row: WorkoutExerciseRow;
        Insert: Insertable<WorkoutExerciseRow, 'workout_id' | 'exercise_id'>;
        Update: Partial<WorkoutExerciseRow>;
        Relationships: [];
      };
      workout_sets: {
        Row: WorkoutSetRow;
        Insert: Insertable<WorkoutSetRow, 'workout_exercise_id' | 'set_number'>;
        Update: Partial<WorkoutSetRow>;
        Relationships: [];
      };
      personal_records: {
        Row: PersonalRecordRow;
        Insert: Insertable<PersonalRecordRow, 'user_id' | 'exercise_id' | 'record_type' | 'value'>;
        Update: Partial<PersonalRecordRow>;
        Relationships: [];
      };
      body_measurements: {
        Row: BodyMeasurementRow;
        Insert: Insertable<BodyMeasurementRow, 'user_id'>;
        Update: Partial<BodyMeasurementRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      get_previous_exercise_sets: {
        Args: { p_exercise_id: UUID };
        Returns: PreviousSetRow[];
      };
      get_exercise_history: {
        Args: { p_exercise_id: UUID; p_limit?: number };
        Returns: ExerciseHistoryRow[];
      };
      get_workout_overview: {
        Args: { p_timezone?: string };
        Returns: WorkoutOverviewRow[];
      };
      get_volume_by_week: {
        Args: { p_weeks?: number; p_timezone?: string };
        Returns: WeeklyVolumeRow[];
      };
      get_muscle_distribution: {
        Args: { p_days?: number };
        Returns: MuscleDistributionRow[];
      };
      refresh_personal_records: {
        Args: { p_workout_id: UUID };
        Returns: NewRecordRow[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
