/**
 * Form validation and error-message mapping.
 *
 * Auth errors are deliberately vague about whether an account exists:
 * "Incorrect username or password" rather than "no user with that name".
 */

export const MIN_PASSWORD_LENGTH = 8;

/* ------------------------------- username ------------------------------ */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;

/**
 * The username is the only identifier a user ever types. It maps 1:1 to the
 * internal Supabase Auth email (see src/services/auth.ts), so it is normalised
 * to lowercase and restricted to characters that are safe both as an email
 * local-part and as a public handle.
 */
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]*$/;

/** Lowercase + trim. The stored username and the auth identifier both use this. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (!username) return 'Please enter a username.';
  if (username.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return `Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Use letters, numbers, dots or underscores only.';
  }
  return null;
}

/* ------------------------- password requirements ------------------------ */

export interface PasswordRequirement {
  id: 'length' | 'letter' | 'number' | 'special';
  label: string;
  met: boolean;
}

/**
 * The live checklist shown under the password field. Everything the user
 * sees comes from this one list, so the indicator and the submit button can
 * never disagree about whether a password is acceptable.
 *
 * Spaces are allowed anywhere in a password (passphrases are encouraged); they
 * simply do not count towards the "special character" requirement.
 */
export function checkPasswordRequirements(value: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: value.length >= MIN_PASSWORD_LENGTH,
    },
    { id: 'letter', label: 'Contains a letter', met: /[a-z]/i.test(value) },
    { id: 'number', label: 'Contains a number', met: /\d/.test(value) },
    {
      id: 'special',
      label: 'Contains a special character',
      // Anything that is not a letter, a digit or whitespace — @ ! # $ % & * ?
      // and friends all qualify. Spaces are allowed but are not "special".
      met: /[^a-z0-9\s]/i.test(value),
    },
  ];
}

export function isPasswordValid(value: string): boolean {
  return checkPasswordRequirements(value).every((requirement) => requirement.met);
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Please enter your password.';
  if (!isPasswordValid(value)) return 'Please complete all password requirements.';
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

function normalise(error: unknown): { raw: string; code: string; status?: number } {
  const err = (error ?? {}) as MaybeSupabaseError;
  return {
    raw: (err.message ?? '').toLowerCase(),
    code: (err.code ?? '').toLowerCase(),
    status: err.status,
  };
}

/**
 * Turn a Supabase/network error into something worth showing a person.
 * Never surfaces raw server text, which can leak implementation detail.
 */
export function authErrorMessage(error: unknown): string {
  const { raw, code, status } = normalise(error);

  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    return 'Incorrect username or password.';
  }
  if (code === 'user_already_exists' || raw.includes('already registered')) {
    return 'That username is already taken. Please choose another.';
  }
  if (raw.includes('password should be at least') || code === 'weak_password') {
    return 'Please complete all password requirements.';
  }
  if (code === 'over_request_rate_limit' || raw.includes('rate limit') || status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (
    raw.includes('network request failed') ||
    raw.includes('fetch failed') ||
    raw.includes('failed to fetch')
  ) {
    return 'No connection. Check your network and try again.';
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
