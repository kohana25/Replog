/**
 * All authentication goes through this module. Screens never call
 * supabase.auth directly — that keeps the session rules in one place.
 *
 * Accounts live in this project's own Supabase Auth/Postgres instance and are
 * authenticated with an email and password. Sign-up emails Supabase's standard
 * confirmation link ({{ .ConfirmationURL }}) to the user's Gmail address; the
 * address is only where that link is delivered. There is no Google sign-in and
 * Google never controls the app's session.
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/** How long the user must wait between requests for another confirmation email. */
export const RESEND_COOLDOWN_SECONDS = 30;

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
}

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  /**
   * True when the project requires email confirmation: the account row exists
   * and the confirmation link has been emailed, but there is no session until
   * the user opens that link.
   */
  needsEmailConfirmation: boolean;
  /**
   * True when the address already belongs to a confirmed account. Supabase
   * does not error in that case — to avoid telling strangers which addresses
   * are registered it returns a user with no identities and sends no email —
   * so the flag has to be derived rather than caught.
   */
  alreadyRegistered: boolean;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

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

/* ------------------------- resend code cooldown ------------------------ */

/**
 * When a confirmation email was last sent to each address. Kept in the module
 * rather than in screen state so leaving the screen and coming back does not
 * hand out a fresh allowance of emails.
 */
const lastEmailSentAt = new Map<string, number>();

function markEmailSent(email: string): void {
  lastEmailSentAt.set(normaliseEmail(email), Date.now());
}

/**
 * Thrown when another email is requested during the cooldown. It carries its
 * own user-ready message so the screen does not report it as a server failure.
 */
export class ResendCooldownError extends Error {
  readonly secondsRemaining: number;

  constructor(secondsRemaining: number) {
    super(`Please wait ${secondsRemaining}s before asking for another email.`);
    this.name = 'ResendCooldownError';
    this.secondsRemaining = secondsRemaining;
  }
}

/** Seconds left before another email may be requested; 0 when it is allowed. */
export function secondsUntilResendAllowed(email: string): number {
  const sentAt = lastEmailSentAt.get(normaliseEmail(email));
  if (!sentAt) return 0;

  const elapsed = (Date.now() - sentAt) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
}

/* ------------------------------- actions ------------------------------ */

export async function signUp({ email, password, fullName }: SignUpInput): Promise<SignUpResult> {
  const address = normaliseEmail(email);

  return dedupe(`signUp:${address}`, async () => {
    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
      options: {
        // Read by the handle_new_user() trigger to seed profiles.full_name.
        data: { full_name: fullName.trim() },
      },
    });

    if (error) throw error;

    const alreadyRegistered =
      Boolean(data.user) && !data.session && (data.user?.identities?.length ?? 1) === 0;
    const needsEmailConfirmation = Boolean(data.user) && !data.session && !alreadyRegistered;

    // Sign-up itself sends the first confirmation email, so the cooldown
    // starts here rather than on the first resend.
    if (needsEmailConfirmation) markEmailSent(address);

    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation,
      alreadyRegistered,
    };
  });
}

export async function signIn(email: string, password: string): Promise<Session> {
  const address = normaliseEmail(email);

  return dedupe(`signIn:${address}`, async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });
    if (error) throw error;
    if (!data.session) throw new Error('No session returned');
    return data.session;
  });
}

/**
 * Email the confirmation link again.
 *
 * `auth.resend` re-sends it for the existing unconfirmed user — calling
 * signUp() again would be the wrong tool: it counts as a second registration
 * attempt and burns the email-send allowance.
 */
export async function resendConfirmationEmail(email: string): Promise<void> {
  const address = normaliseEmail(email);

  return dedupe(`resend:${address}`, async () => {
    const waitSeconds = secondsUntilResendAllowed(address);
    if (waitSeconds > 0) throw new ResendCooldownError(waitSeconds);

    const { error } = await supabase.auth.resend({ type: 'signup', email: address });
    if (error) throw error;

    markEmailSent(address);
  });
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
  const address = normaliseEmail(email);

  return dedupe(`reset:${address}`, async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo });
    if (error) throw error;
  });
}

/**
 * Exchange a recovery token (from the emailed link, or typed in by hand)
 * for a short-lived session that is allowed to set a new password.
 */
export async function verifyRecoveryToken(tokenHash: string, email?: string): Promise<Session> {
  const { data, error } = email
    ? await supabase.auth.verifyOtp({
        email: normaliseEmail(email),
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
