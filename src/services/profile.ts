import { supabase } from '@/lib/supabase';
import type { ProfileRow, UUID } from '@/types/database';

const PROFILE_COLUMNS =
  'id,user_id,full_name,username,avatar_url,fitness_goal,experience_level,height_cm,weight_kg,date_of_birth,training_days,unit_preference,theme_preference,default_rest_seconds,created_at,updated_at';

/**
 * Fetch the signed-in user's profile.
 *
 * The row is normally created by the `handle_new_user` trigger at sign-up.
 * If it is somehow missing (e.g. an account created before the trigger
 * existed) we create it here rather than leaving the app without a profile.
 */
export async function getProfile(userId: UUID): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as ProfileRow;

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: userId })
    .select(PROFILE_COLUMNS)
    .single();

  if (insertError) {
    // A concurrent insert (trigger + this call racing) is not a real failure.
    if (insertError.code === '23505') return getProfile(userId);
    throw insertError;
  }
  return created as ProfileRow;
}

export type ProfileUpdate = Partial<
  Pick<
    ProfileRow,
    | 'full_name'
    | 'username'
    | 'avatar_url'
    | 'fitness_goal'
    | 'experience_level'
    | 'height_cm'
    | 'weight_kg'
    | 'date_of_birth'
    | 'training_days'
    | 'unit_preference'
    | 'theme_preference'
    | 'default_rest_seconds'
  >
>;

/**
 * Update the profile. Note the filter is on user_id and RLS additionally
 * requires user_id = auth.uid(), so a client cannot patch anyone else's row
 * even if it sends a different id.
 */
export async function updateProfile(userId: UUID, patch: ProfileUpdate): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

/**
 * Write the sign-up details onto the profile row, right after registering.
 *
 * The `handle_new_user` trigger creates that row and — once
 * 0005_username_auth.sql has been applied — fills the username in from the
 * sign-up metadata. Doing it again from here costs one request and makes the
 * app correct on a database where that migration has *not* been run yet:
 * the username is stored either way. `getProfile` first, because it creates
 * the row if the trigger has not landed yet, which an update alone would
 * silently miss.
 *
 * Nothing here is worth failing a sign-up over, so the caller is handed a
 * profile or null rather than an error.
 */
export async function completeSignUpProfile(
  userId: UUID,
  patch: ProfileUpdate,
): Promise<ProfileRow | null> {
  try {
    await getProfile(userId);
    return await updateProfile(userId, patch);
  } catch {
    // A username collision here means another profile row already holds the
    // name. The account itself is fine — Supabase Auth guaranteed the login
    // name is unique — and the screens fall back to reading it from the
    // account, so this is not worth interrupting anyone for.
    return null;
  }
}
