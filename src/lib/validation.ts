/**
 * Form validation and error-message mapping.
 *
 * Auth errors are deliberately vague about whether an account exists:
 * "Incorrect username or password" rather than "no such user".
 */

import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from './username';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * The sign-up rules for a new username. Login does not use these — someone
 * with an older account should be told their password is wrong, not that
 * their own username is invalid.
 */
export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);

  if (!username) return 'Please enter a username.';
  if (/\s/.test(username)) return 'Usernames cannot contain spaces.';
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Usernames must be at least ${USERNAME_MIN_LENGTH} characters.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Usernames must be ${USERNAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Usernames can use letters, numbers and underscores, starting with a letter or number.';
  }
  return null;
}

/* ------------------------- password requirements ------------------------ */

export interface PasswordRequirement {
  id: 'length' | 'number' | 'special';
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
 *
 * Spaces are not on the list because they are never allowed to reach it: the
 * password fields strip whitespace as it is typed or pasted (see
 * stripPasswordSpaces). isPasswordValid still refuses one, so a value that
 * somehow arrives with a space in it cannot be submitted.
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
  ];
}

/**
 * Remove every whitespace character. Applied on change, so it covers a typed
 * space, a pasted value, and an autofilled one alike.
 */
export function stripPasswordSpaces(value: string): string {
  return value.replace(/\s/g, '');
}

export function isPasswordValid(value: string): boolean {
  if (/\s/.test(value)) return false;
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
 * True when the project still has "Confirm email" switched on.
 *
 * Username accounts are held against addresses that cannot receive mail, so a
 * project that insists on confirming them can never activate an account. The
 * errors that says so — a failed send at sign-up, an unconfirmed account at
 * login — are one setting, and get one message.
 */
export function isEmailConfirmationEnabledError(error: unknown): boolean {
  const { raw, code } = normalise(error);
  return (
    code === 'email_not_confirmed' ||
    raw.includes('email not confirmed') ||
    raw.includes('error sending') ||
    raw.includes('failed to send')
  );
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
  if (isEmailConfirmationEnabledError(error)) {
    return 'Accounts cannot be activated while “Confirm email” is on in Supabase (see README §2.4).';
  }
  if (code === 'user_already_exists' || raw.includes('already registered')) {
    return 'That username is already taken. Please choose another.';
  }
  if (raw.includes('password should be at least') || code === 'weak_password') {
    return 'Please complete all password requirements.';
  }
  // Only a genuine request-rate limit reaches this line.
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
