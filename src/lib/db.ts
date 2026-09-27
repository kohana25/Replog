/**
 * Tiny helper used by every service.
 *
 * PostgREST's generated types cannot infer the shape of deeply embedded
 * selects from a hand-written schema type, so services state the shape they
 * expect and `unwrap` applies it in one place — instead of scattering
 * `as any` through the data layer.
 */

export interface QueryResult {
  data: unknown;
  error: { message?: string; code?: string; details?: string } | null;
}

export function unwrap<T>(result: QueryResult): T {
  if (result.error) throw result.error;
  return result.data as T;
}

/** For queries where "no rows" is a legitimate answer. */
export function unwrapMaybe<T>(result: QueryResult): T | null {
  if (result.error) throw result.error;
  return (result.data ?? null) as T | null;
}
