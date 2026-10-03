/**
 * All authentication goes through this module. Screens never call
 * supabase.auth directly — that keeps the session rules in one place.
 *
 * Users authenticate with a USERNAME and password. There is no email, no
 * Google sign-in, and no email verification or password-reset flow.
 *
 * Supabase Auth requires an email identifier, so each username is mapped 1:1
 * to a stable, internal synthetic address (`<username>@replog.internal`). This
 * address is never shown to the user and is never a real inbox — it exists only
 * so Supabase has an identifier to key the account on. For sign-up to return a
 * session immediately, the Supabase project must have "Confirm email" turned
 * OFF (there is no inbox to deliver a confirmation to).
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { normalizeUsername } from '@/lib/validation';

/** Internal, non-routable domain for the synthetic auth identifier. */
const USERNAME_AUTH_DOMAIN = 'replog.internal';

/** Map a username to the internal email Supabase Auth keys the account on. */
export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_AUTH_DOMAIN}`;
}

export interface SignUpInput {
  username: string;
  password: string;
}

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  /**
   * True when the username already belongs to an account. Supabase does not
   * error in that case — to avoid revealing which identifiers are registered it
   * returns a user with no identities and no session — so it has to be derived.
   */
  alreadyTaken: boolean;
}

/* --------------------- duplicate-request prevention -------------------- */

/**
 * One in-flight request per operation.
 *
 * A double tap, a re-render that fires an effect twice, or a hardware
 * keyboard's "go" landing on the same frame as a press used to send two
 * identical requests. Callers that arrive while a request is already running
 * now share its promise instead of starting a new one.
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

export async function signUp({ username, password }: SignUpInput): Promise<SignUpResult> {
  const handle = normalizeUsername(username);
  const email = usernameToAuthEmail(handle);

  return dedupe(`signUp:${handle}`, async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Read by the handle_new_user() trigger / set on the profile by the
        // sign-up screen so the username shows as @handle straight away.
        data: { username: handle },
      },
    });

    if (error) throw error;

    const alreadyTaken =
      Boolean(data.user) && !data.session && (data.user?.identities?.length ?? 1) === 0;

    return {
      user: data.user,
      session: data.session,
      alreadyTaken,
    };
  });
}

export async function signIn(username: string, password: string): Promise<Session> {
  const handle = normalizeUsername(username);
  const email = usernameToAuthEmail(handle);

  return dedupe(`signIn:${handle}`, async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
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
