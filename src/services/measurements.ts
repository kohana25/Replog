import { unwrap } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { BodyMeasurementRow, DateString, UUID } from '@/types/database';

const COLUMNS =
  'id,user_id,measured_on,weight_kg,body_fat_percentage,chest_cm,waist_cm,arms_cm,thighs_cm,notes,created_at';

export async function listMeasurements(limit = 60): Promise<BodyMeasurementRow[]> {
  const result = await supabase
    .from('body_measurements')
    .select(COLUMNS)
    .order('measured_on', { ascending: false })
    .limit(limit);
  return unwrap<BodyMeasurementRow[]>(result);
}

export interface MeasurementInput {
  measuredOn: DateString;
  weightKg: number | null;
  bodyFatPercentage: number | null;
  chestCm: number | null;
  waistCm: number | null;
  armsCm: number | null;
  thighsCm: number | null;
  notes?: string | null;
}

/**
 * One entry per day: re-saving the same date updates it rather than
 * creating a duplicate (the table has a unique (user_id, measured_on)).
 */
export async function saveMeasurement(
  userId: UUID,
  input: MeasurementInput,
): Promise<BodyMeasurementRow> {
  const result = await supabase
    .from('body_measurements')
    .upsert(
      {
        user_id: userId,
        measured_on: input.measuredOn,
        weight_kg: input.weightKg,
        body_fat_percentage: input.bodyFatPercentage,
        chest_cm: input.chestCm,
        waist_cm: input.waistCm,
        arms_cm: input.armsCm,
        thighs_cm: input.thighsCm,
        notes: input.notes?.trim() || null,
      },
      { onConflict: 'user_id,measured_on' },
    )
    .select(COLUMNS)
    .single();

  return unwrap<BodyMeasurementRow>(result);
}

export async function deleteMeasurement(id: UUID): Promise<void> {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id);
  if (error) throw error;
}
