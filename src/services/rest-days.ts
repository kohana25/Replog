/**
 * Rest days — the user recording that a day was recovery.
 *
 * A rest day is deliberately NOT a workout. It lives in its own table, and
 * none of the statistics functions read it, so marking a day as rest can
 * never change a workout count, a volume total, a streak or a personal
 * record. That separation is the whole point: recovery is part of training,
 * but it is not a session, and it must never read as a failed one.
 *
 * Dates are the user's own local calendar days (`localDateKey`), not UTC
 * instants — "which day did I rest" is a calendar question, and someone
 * resting on Tuesday evening in Manila should not have it land on Wednesday.
 */

import { unwrap, unwrapMaybe } from '@/lib/db';
import { localDateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { DateString, RestDayRow, UUID } from '@/types/database';

const REST_COLUMNS = 'id,user_id,rest_on,note,created_at';

/** Rest days between two dates, as local date keys — mirrors getWorkoutDays. */
export async function getRestDays(from: Date, to: Date): Promise<Set<string>> {
  const result = await supabase
    .from('rest_days')
    .select('rest_on')
    .gte('rest_on', localDateKey(from))
    .lte('rest_on', localDateKey(to));

  const rows = unwrap<{ rest_on: DateString }[]>(result) ?? [];
  return new Set(rows.map((row) => row.rest_on));
}

/** The rest day for one date, or null. */
export async function getRestDay(date: Date = new Date()): Promise<RestDayRow | null> {
  const result = await supabase
    .from('rest_days')
    .select(REST_COLUMNS)
    .eq('rest_on', localDateKey(date))
    .maybeSingle();

  return unwrapMaybe<RestDayRow>(result);
}

/**
 * Mark a day as rest.
 *
 * Marking a day that is already rest is the same fact stated twice, so the
 * unique constraint's rejection is treated as success rather than an error
 * the user has to think about.
 */
export async function markRestDay(
  userId: UUID,
  date: Date = new Date(),
  note?: string | null,
): Promise<RestDayRow | null> {
  const { data, error } = await supabase
    .from('rest_days')
    .insert({ user_id: userId, rest_on: localDateKey(date), note: note?.trim() || null })
    .select(REST_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') return getRestDay(date);
    throw error;
  }
  return data as RestDayRow;
}

/** Undo a rest day. Nothing else is affected — there is nothing else to undo. */
export async function clearRestDay(date: Date = new Date()): Promise<void> {
  const { error } = await supabase.from('rest_days').delete().eq('rest_on', localDateKey(date));
  if (error) throw error;
}

/** Recent rest days, newest first — for history and progress. */
export async function listRecentRestDays(limit = 30): Promise<RestDayRow[]> {
  const result = await supabase
    .from('rest_days')
    .select(REST_COLUMNS)
    .order('rest_on', { ascending: false })
    .limit(limit);

  return unwrap<RestDayRow[]>(result) ?? [];
}
