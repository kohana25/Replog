/**
 * All authentication goes through this module. Screens never call
 * supabase.auth directly — that keeps the session rules in one place.
 *
 * ACCOUNTS ARE IDENTIFIED BY A USERNAME
 * There is no email address, no confirmation step and no password reset: a
 * new account works the moment it is created, and a forgotten password means
 * a lost account. That is the deliberate trade made when email was removed.
 *
 * Supabase Auth has no username credential — it authenticates an email and a
 * password — so each account is registered under a synthetic address built
 * from the username. `.invalid` is reserved by RFC 2606 and can never be a
 * real domain, so these addresses cannot resolve and no mail can ever be
 * delivered to a stranger's inbox by mistake.
 *
 * Two useful properties fall out of this:
 *  - Usernames are unique for free. Supabase already requires the address to
 *    be unique, so a taken username fails the same way a taken address does.
 *  - Nothing else in the app has to know. Everything above this module works
 *    in usernames; the address never leaves this file.
 *
 * It does mean the Supabase project MUST have email confirmation switched off
 * (Authentication → Sign In / Providers → Confirm email). With it on, Supabase
 * withholds the session until an address that cannot receive mail is
 * confirmed, which no one can ever do.
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { normalizeUsername } from '@/lib/validation';

/**
 * The domain every account is registered under. Reserved by RFC 2606: it has
 * no DNS records and never will, so these addresses are unroutable by
 * construction rather than by convention.
 */
const AUTH_EMAIL_DOMAIN = 'replog.invalid';

/** The address a username's account lives under. Never shown to the user. */
function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export interface SignUpInput {
  username: string;
  password: string;
  fullName: string;
}

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  /**
   * True when the username is already taken. Supabase does not error in that
   * case — to avoid telling strangers which accounts exist it returns a user
   * with no identities — so the flag has to be derived rather than caught.
   */
  usernameTaken: boolean;
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

/**
 * Create an account and sign it in.
 *
 * With confirmation off, Supabase returns a session straight away, so there
 * is no screen between here and Home.
 */
export async function signUp({ username, password, fullName }: SignUpInput): Promise<SignUpResult> {
  const name = normalizeUsername(username);

  return dedupe(`signUp:${name}`, async () => {
    const { data, error } = await supabase.auth.signUp({
      email: usernameToAuthEmail(name),
      password,
      options: {
        // Read by the handle_new_user() trigger to seed the profile row.
        data: { username: name, full_name: fullName.trim() },
      },
    });

    if (error) throw error;

    const usernameTaken =
      Boolean(data.user) && !data.session && (data.user?.identities?.length ?? 1) === 0;

    return { user: data.user, session: data.session, usernameTaken };
  });
}

export async function signIn(username: string, password: string): Promise<Session> {
  const name = normalizeUsername(username);

  return dedupe(`signIn:${name}`, async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(name),
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

/**
 * Change the password of the signed-in user.
 *
 * This is the only way a password can change. Without an address to send a
 * reset link to, someone who has forgotten theirs cannot get back in.
 */
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
