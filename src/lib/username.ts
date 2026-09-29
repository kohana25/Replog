/**
 * Usernames, and how they reach Supabase Auth.
 *
 * The app signs people in with a username and a password. Supabase Auth
 * identifies an account by an email address, so each username is mapped to a
 * fixed address on a domain that is never delegated in the public DNS:
 *
 *     alex  ->  alex@replog.internal
 *
 * That keeps everything Supabase Auth already does — bcrypt password hashing,
 * refresh tokens, `auth.uid()` behind every Row Level Security policy — while
 * no real mailbox is ever involved. Nothing is sent to these addresses, they
 * cannot receive mail even by accident, and the user never sees one.
 *
 * The mapping is deterministic, so signing in needs no lookup: the username
 * typed on the login screen becomes the address Supabase is asked about.
 * Uniqueness comes free with it — auth.users.email is unique, so two people
 * cannot hold the same username.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/**
 * Reserved by ICANN for private internal use and never delegated in the public
 * DNS, so it cannot resolve or accept mail on the internet.
 *
 * Changing this string re-points every account: the mapping is deterministic
 * and there is no lookup, so a username resolves to a different Supabase
 * account the moment the domain differs. It must keep matching the addresses
 * already stored in auth.users.
 */
const ACCOUNT_EMAIL_DOMAIN = 'replog.internal';

/** Letters, digits and underscores, starting with a letter or digit. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]*$/;

/**
 * The stored form of a username: trimmed and lower-cased, so `Alex` and `alex`
 * are the same account rather than two.
 */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Drop whitespace as it is typed or pasted. A username with a space in it
 * could not be part of an address, and is not worth an error message when it
 * can simply never be entered.
 */
export function stripUsernameSpaces(value: string): string {
  return value.replace(/\s/g, '');
}

/** The address Supabase Auth knows this username by. */
export function usernameToAccountEmail(username: string): string {
  return `${normalizeUsername(username)}@${ACCOUNT_EMAIL_DOMAIN}`;
}

/**
 * The username behind an account address, for screens that have the auth user
 * but no profile row yet. Returns null for anything else, so a real address
 * left over from an older account is never shown as a username.
 */
export function accountEmailToUsername(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  return domain === ACCOUNT_EMAIL_DOMAIN && local ? local : null;
}
