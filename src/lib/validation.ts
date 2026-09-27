/**
 * Form validation and error-message mapping.
 *
 * Auth errors are deliberately vague about whether an account exists:
 * "Incorrect email or password" rather than "no user with that email".
 */

/**
 * Accounts are Gmail-only: the sign-up verification code is emailed to the
 * address, so it has to be a real Gmail inbox. Google ignores dots and
 * everything after a `+` in the local part, but both are still valid
 * addresses, so they are accepted here.
 */
const GMAIL_PATTERN = /^[a-z0-9][a-z0-9._%+-]*@gmail\.com$/i;

export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Please enter your email address.';
  if (!GMAIL_PATTERN.test(email)) return 'Please enter a valid Gmail address.';
  return null;
}

/* ------------------------- password requirements ------------------------ */

export interface PasswordRequirement {
  id: 'length' | 'number' | 'special' | 'noSpaces';
  /** Checklist wording, e.g. "Contains a number". */
  label: string;
  /** Sentence wording, e.g. "a number" — used to name what is still missing. */
  shortLabel: string;
  met: boolean;
}

/**
 * The live checklist shown under the password field. The rules the user is
 * shown and the rules the form enforces are this one list, so the indicator
 * and the submit button can never disagree about whether a password passes.
 */
export function checkPasswordRequirements(value: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      shortLabel: `at least ${MIN_PASSWORD_LENGTH} characters`,
      met: value.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: 'number',
      label: 'Contains a number',
      shortLabel: 'a number',
      met: /\d/.test(value),
    },
    {
      id: 'special',
      label: 'Contains a special character',
      shortLabel: 'a special character',
      // Anything that is not a letter, a digit or whitespace — @ ! # $ % & * ?
      // and friends all qualify.
      met: /[^a-z0-9\s]/i.test(value),
    },
    // An empty password has no spaces, but showing this one as already met
    // before the user has typed anything reads as a pass they did not earn.
    {
      id: 'noSpaces',
      label: 'No spaces',
      shortLabel: 'no spaces',
      met: value.length > 0 && !/\s/.test(value),
    },
  ];
}

export function isPasswordValid(value: string): boolean {
  return checkPasswordRequirements(value).every((requirement) => requirement.met);
}

/**
 * The submit-time message. The checklist under the field is only shown while
 * that field has focus, so this names the requirements that are still missing
 * rather than pointing at a list the user may not be able to see.
 */
export function validatePassword(value: string): string | null {
  if (!value) return 'Please enter your password.';
  if (/\s/.test(value)) return 'Passwords cannot contain spaces.';

  const missing = checkPasswordRequirements(value)
    .filter((requirement) => !requirement.met)
    .map((requirement) => requirement.shortLabel);

  if (missing.length === 0) return null;

  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
  return `Your password still needs ${list}.`;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

/** Strip anything that is not a digit, and cap the length, as the user types. */
export function sanitizeVerificationCode(value: string, length = 6): string {
  return value.replace(/\D/g, '').slice(0, length);
}

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Please enter your name.';
  if (name.length < 2) return 'Please enter your full name.';
  if (name.length > 80) return 'That name is too long.';
  return null;
}

export function validateRequiredText(value: string, label: string, max = 120): string | null {
  const text = value.trim();
  if (!text) return `${label} is required.`;
  if (text.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

/** Workout numbers must be non-negative and within the DB constraints. */
export function clampReps(value: number | null): number | null {
  if (value === null) return null;
  return Math.min(Math.max(Math.round(value), 0), 1000);
}

export function clampWeightKg(value: number | null): number | null {
  if (value === null) return null;
  return Math.min(Math.max(value, 0), 1000);
}

export function clampDuration(value: number | null): number | null {
  if (value === null) return null;
  return Math.min(Math.max(Math.round(value), 0), 86_400);
}

export function clampRpe(value: number | null): number | null {
  if (value === null) return null;
  if (value < 1 || value > 10) return null;
  return Math.round(value * 2) / 2;
}

export function clampRestSeconds(value: number | null): number {
  if (value === null) return 90;
  return Math.min(Math.max(Math.round(value), 0), 3600);
}

/* --------------------------- error messages --------------------------- */

interface MaybeSupabaseError {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

function normalise(error: unknown): { raw: string; code: string; status?: number } {
  const err = (error ?? {}) as MaybeSupabaseError;
  return {
    raw: (err.message ?? '').toLowerCase(),
    code: (err.code ?? '').toLowerCase(),
    status: err.status,
  };
}

/** True for the "this account exists but the email is unconfirmed" error. */
export function isEmailNotConfirmedError(error: unknown): boolean {
  const { raw, code } = normalise(error);
  return code === 'email_not_confirmed' || raw.includes('email not confirmed');
}

/** True when Supabase could not send the email at all (SMTP/template problem). */
function isEmailSendFailure(raw: string): boolean {
  return raw.includes('error sending') || raw.includes('failed to send');
}

/**
 * True only for a rate limit on *sending* an email, which is a real limit but
 * deserves its own message — telling someone who just asked for a second code
 * that they have made "too many attempts" is misleading.
 */
function isEmailSendRateLimit(raw: string, code: string): boolean {
  return (
    code === 'over_email_send_rate_limit' ||
    code === 'email_send_rate_limit' ||
    raw.includes('email rate limit') ||
    raw.includes('security purposes')
  );
}

/**
 * Turn a Supabase/network error into something worth showing a person.
 * Never surfaces raw server text, which can leak implementation detail.
 */
export function authErrorMessage(error: unknown): string {
  const { raw, code, status } = normalise(error);

  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (isEmailNotConfirmedError(error)) {
    return 'Please confirm your email first — open the link we sent you.';
  }
  if (code === 'user_already_exists' || raw.includes('already registered')) {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (raw.includes('password should be at least') || code === 'weak_password') {
    return 'Please complete all password requirements.';
  }
  if (isEmailSendRateLimit(raw, code)) {
    return 'Please wait a moment before asking for another email.';
  }
  if (isEmailSendFailure(raw)) {
    return "We couldn't send the confirmation email. Please try again in a moment.";
  }
  // Only a genuine request-rate limit reaches this line.
  if (code === 'over_request_rate_limit' || raw.includes('rate limit') || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (raw.includes('same as the old password') || code === 'same_password') {
    return 'Please choose a password you have not used before.';
  }
  if (
    raw.includes('network request failed') ||
    raw.includes('fetch failed') ||
    raw.includes('failed to fetch')
  ) {
    return 'No connection. Check your network and try again.';
  }
  if (raw.includes('token has expired') || raw.includes('invalid token') || code === 'otp_expired') {
    return 'That reset link has expired. Please request a new one.';
  }
  return 'Something went wrong. Please try again.';
}

/** Generic data-layer errors (queries, inserts). */
export function dataErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const err = (error ?? {}) as MaybeSupabaseError;
  const raw = (err.message ?? '').toLowerCase();

  if (
    raw.includes('network request failed') ||
    raw.includes('fetch failed') ||
    raw.includes('failed to fetch')
  ) {
    return 'No connection. Check your network and try again.';
  }
  if (err.code === '23505') return 'That already exists.';
  if (err.code === '23514') return 'Some of those values are out of range.';
  if (err.code === '42501' || raw.includes('row-level security')) {
    return 'You do not have permission to do that.';
  }
  return fallback;
}
