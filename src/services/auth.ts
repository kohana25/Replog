/**
 * All authentication goes through this module. Screens never call
 * supabase.auth directly — that keeps the session rules in one place.
 *
 * Accounts live in this project's own Supabase Auth/Postgres instance and are
 * authenticated with an email and password. The user's Gmail address is only
 * ever used as the address the 6-digit verification code is emailed to; there
 * is no Google sign-in and Google never controls the app's session.
 */

import type { Session, Subscription, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/** How long the user must wait between requests for a new code. */
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
   * and a verification code has been emailed, but there is no session until
   * the code is entered.
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
 * When a code was last emailed to each address. Kept in the module rather
 * than in screen state so leaving the verification screen and coming back
 * does not hand out a fresh allowance of emails.
 */
const lastCodeSentAt = new Map<string, number>();

function markCodeSent(email: string): void {
  lastCodeSentAt.set(normaliseEmail(email), Date.now());
}

/**
 * Thrown when a code is requested during the cooldown. It carries its own
 * user-ready message so the screen does not report it as a server failure.
 */
export class ResendCooldownError extends Error {
  readonly secondsRemaining: number;

  constructor(secondsRemaining: number) {
    super(`Please wait ${secondsRemaining}s before requesting another code.`);
    this.name = 'ResendCooldownError';
    this.secondsRemaining = secondsRemaining;
  }
}

/** Seconds left before another code may be requested; 0 when it is allowed. */
export function secondsUntilResendAllowed(email: string): number {
  const sentAt = lastCodeSentAt.get(normaliseEmail(email));
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

    // Sign-up itself emails the first code, so the cooldown starts here.
    if (needsEmailConfirmation) markCodeSent(address);

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
 * Email another sign-up verification code.
 *
 * `auth.resend` re-sends the code for the existing unconfirmed user — calling
 * signUp() again would be the wrong tool: it counts as a second registration
 * attempt and burns the email-send allowance.
 */
export async function resendVerificationCode(email: string): Promise<void> {
  const address = normaliseEmail(email);

  return dedupe(`resend:${address}`, async () => {
    const waitSeconds = secondsUntilResendAllowed(address);
    if (waitSeconds > 0) throw new ResendCooldownError(waitSeconds);

    const { error } = await supabase.auth.resend({ type: 'signup', email: address });
    if (error) throw error;

    markCodeSent(address);
  });
}

/**
 * Exchange the 6-digit code from the sign-up email for a real session — this
 * is what both confirms the address and logs the user in, so registration
 * never bounces back to the login screen. Supabase invalidates the code as
 * part of this call, so it cannot be replayed.
 */
export async function verifyEmailCode(email: string, code: string): Promise<Session> {
  const address = normaliseEmail(email);

  return dedupe(`verify:${address}`, async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: address,
      token: code.trim(),
      type: 'signup',
    });

    if (error) throw error;
    if (!data.session) throw new Error('Could not verify that code');

    // A used code is spent: clear the cooldown so a later sign-up on this
    // device is not held back by it.
    lastCodeSentAt.delete(address);
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
