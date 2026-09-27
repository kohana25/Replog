import { unwrap } from '@/lib/db';
import { deviceTimezone } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type {
  MuscleDistributionRow,
  WeeklyVolumeRow,
  WorkoutOverviewRow,
} from '@/types/database';

const EMPTY_OVERVIEW: WorkoutOverviewRow = {
  total_workouts: 0,
  total_sets: 0,
  total_volume: 0,
  total_duration_seconds: 0,
  workouts_this_week: 0,
  current_streak_days: 0,
  last_workout_at: null,
};

/**
 * Headline stats. Computed in Postgres rather than by downloading every set
 * the user has ever logged.
 *
 * The device timezone is passed in so "this week" and the streak match what
 * the user sees on their calendar, not UTC.
 */
export async function getOverview(): Promise<WorkoutOverviewRow> {
  const result = await supabase.rpc('get_workout_overview', {
    p_timezone: deviceTimezone(),
  });
  const rows = unwrap<WorkoutOverviewRow[]>(result);
  return rows?.[0] ?? EMPTY_OVERVIEW;
}

export async function getWeeklyVolume(weeks = 8): Promise<WeeklyVolumeRow[]> {
  const result = await supabase.rpc('get_volume_by_week', {
    p_weeks: weeks,
    p_timezone: deviceTimezone(),
  });
  return unwrap<WeeklyVolumeRow[]>(result) ?? [];
}

export async function getMuscleDistribution(days = 30): Promise<MuscleDistributionRow[]> {
  const result = await supabase.rpc('get_muscle_distribution', { p_days: days });
  return unwrap<MuscleDistributionRow[]>(result) ?? [];
}
