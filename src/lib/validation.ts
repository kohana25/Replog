/**
 * Form validation and error-message mapping.
 *
 * Auth errors are deliberately vague about whether an account exists:
 * "Incorrect email or password" rather than "no user with that email".
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Please enter your email address.';
  if (!EMAIL_PATTERN.test(email)) return 'Invalid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Please enter your password.';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
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

/**
 * Turn a Supabase/network error into something worth showing a person.
 * Never surfaces raw server text, which can leak implementation detail.
 */
export function authErrorMessage(error: unknown): string {
  const err = (error ?? {}) as MaybeSupabaseError;
  const raw = (err.message ?? '').toLowerCase();
  const code = (err.code ?? '').toLowerCase();

  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (raw.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Please confirm your email address, then log in.';
  }
  if (code === 'user_already_exists' || raw.includes('already registered')) {
    return 'An account with that email already exists.';
  }
  if (raw.includes('password should be at least') || code === 'weak_password') {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (code === 'over_email_send_rate_limit' || raw.includes('rate limit') || err.status === 429) {
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
