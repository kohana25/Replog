/**
 * All authentication goes through this module. Screens never call
 * supabase.auth directly — that keeps the session rules in one place.
 *
 * Accounts live in this project's own Supabase Auth/Postgres instance and are
 * identified by a **username**. Supabase still does the security work —
 * passwords are bcrypt-hashed by it and never stored by the app, sessions and
 * refresh tokens are its own, and every Row Level Security policy keeps
 * comparing against auth.uid() — but the identifier the user types is a
 * username, mapped to a non-deliverable address by lib/username.ts.
 *
 * There is no email anywhere in this flow: no Google sign-in, no verification
 * message, and no email-based password recovery.
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { normalizeUsername, usernameToAccountEmail } from '@/lib/username';

export interface SignUpInput {
  username: string;
  password: string;
  fullName: string;
}

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  /**
   * True when the username is already registered. Supabase does not error in
   * that case — to avoid telling strangers which accounts exist it returns a
   * user with no identities — so the flag has to be derived rather than
   * caught.
   */
  usernameTaken: boolean;
}

/**
 * Thrown when sign-up succeeds but no session comes back, which for username
 * accounts means the project is still waiting for an email confirmation that
 * can never arrive. Surfaced as a setup problem rather than a mystery.
 */
class EmailConfirmationStillOnError extends Error {
  constructor() {
    super('Email not confirmed: Supabase is still set to confirm new accounts.');
    this.name = 'EmailConfirmationStillOnError';
  }
}

/* --------------------- duplicate-request prevention -------------------- */

/**
 * One in-flight request per operation.
 *
 * A double tap, a re-render that fires an effect twice, or a hardware
 * keyboard's "go" landing on the same frame as a press used to send two
 * identical requests. The second one is what Supabase counts as another
 * attempt, and enough of them is what produced spurious rate-limit errors.
 * Callers that arrive while a request is already running now share its
 * promise instead of starting a new one.
 */
const inFlight = new Map<string, Promise<unknown>>();

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const promise = run().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/* ------------------------------- actions ------------------------------ */

export async function signUp({ username, password, fullName }: SignUpInput): Promise<SignUpResult> {
  const name = normalizeUsername(username);

  return dedupe(`signUp:${name}`, async () => {
    const { data, error } = await supabase.auth.signUp({
      email: usernameToAccountEmail(name),
      password,
      options: {
        // Read by the handle_new_user() trigger to seed the profile row.
        data: { username: name, full_name: fullName.trim() },
      },
    });

    if (error) throw error;

    const usernameTaken =
      Boolean(data.user) && !data.session && (data.user?.identities?.length ?? 1) === 0;

    // No session and the username is free: the account was created but is
    // waiting on a confirmation email that cannot be delivered. Say so rather
    // than dropping the user on a screen with nothing to do.
    if (!data.session && !usernameTaken) throw new EmailConfirmationStillOnError();

    return { user: data.user, session: data.session, usernameTaken };
  });
}

export async function signIn(username: string, password: string): Promise<Session> {
  const name = normalizeUsername(username);

  return dedupe(`signIn:${name}`, async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToAccountEmail(name),
      password,
    });
    if (error) throw error;
    if (!data.session) throw new Error('No session returned');
    return data.session;
  });
}

export async function signOut(): Promise<void> {
  // 'local' clears this device's stored session without touching sessions on
  // the user's other devices. Logging out never deletes any workout data.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
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
