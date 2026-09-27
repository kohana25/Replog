/**
 * All authentication goes through this module. Screens never call
 * supabase.auth directly — that keeps the session rules in one place.
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
}

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  /**
   * True when the project requires email confirmation: the account exists
   * but there is no session yet, so the user must click the link first.
   */
  needsEmailConfirmation: boolean;
}

export async function signUp({ email, password, fullName }: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      // Read by the handle_new_user() trigger to seed profiles.full_name.
      data: { full_name: fullName.trim() },
    },
  });

  if (error) throw error;

  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation: Boolean(data.user) && !data.session,
  };
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.session) throw new Error('No session returned');
  return data.session;
}

export async function signOut(): Promise<void> {
  // 'local' clears this device's stored session without touching sessions on
  // the user's other devices. Logging out never deletes any workout data.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

/**
 * Send a password-reset email. `redirectTo` should be a deep link back into
 * the app — see app/(auth)/forgot-password.tsx.
 */
export async function resetPassword(email: string, redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
}

/**
 * Exchange a recovery token (from the emailed link, or typed in by hand)
 * for a short-lived session that is allowed to set a new password.
 */
export async function verifyRecoveryToken(tokenHash: string, email?: string): Promise<Session> {
  const { data, error } = email
    ? await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: tokenHash.trim(),
        type: 'recovery',
      })
    : await supabase.auth.verifyOtp({ token_hash: tokenHash.trim(), type: 'recovery' });

  if (error) throw error;
  if (!data.session) throw new Error('Could not verify that reset code');
  return data.session;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Subscribe to sign-in / sign-out / token-refresh events. Returns the
 * subscription so callers can unsubscribe on unmount.
 */
export function listenToAuthChanges(
  callback: (session: Session | null, event: string) => void,
): Subscription {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event);
  });
  return data.subscription;
}
