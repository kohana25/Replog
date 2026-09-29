# Supabase

## Migrations — run in order

| # | File | Purpose |
| --- | --- | --- |
| 1 | `migrations/0001_schema.sql` | 9 tables, constraints, indexes, `handle_new_user` trigger |
| 2 | `migrations/0002_rls.sql` | Row Level Security on every table |
| 3 | `migrations/0003_functions.sql` | Stats helpers + `refresh_personal_records` |
| 4 | `migrations/0004_seed_exercises.sql` | 55 public exercises |
| 5 | `migrations/0005_username_auth.sql` | Seeds `profiles.username` at sign-up; enforces it case-insensitively |
| 6 | `migrations/0006_suggested_workouts.sql` | Suggested Workouts catalogue tables + read-only RLS |
| 7 | `migrations/0007_seed_suggested_workouts.sql` | 36 suggested routines — 2 per goal x experience pair |

Paste each into the Supabase **SQL Editor** and run it. 0002-0007 are idempotent; re-running
0001 fails on its `profiles_set_updated_at` trigger, which is harmless once it has been applied
once.

> **Required setting:** turn **Confirm email** OFF under Authentication → Sign In / Providers.
> Accounts are registered under `<username>@replog.internal`, an address that can never
> receive mail, so leaving confirmation on creates accounts nobody can ever log into.

## Tables

| Table | Owner column | Notes |
| --- | --- | --- |
| `profiles` | `user_id` | One row per user, created automatically at sign-up |
| `exercises` | `created_by` | Public library (`is_public`) + private custom exercises |
| `workout_routines` | `user_id` | Reusable templates |
| `routine_exercises` | *via routine* | Ordered by `order_index` |
| `workouts` | `user_id` | An actual session |
| `workout_exercises` | *via workout* | Ordered by `order_index` |
| `workout_sets` | *via workout* | One row per set — never collapsed into JSON |
| `personal_records` | `user_id` | Unique per (user, exercise, record type) |
| `body_measurements` | `user_id` | Optional, one entry per day |
| `suggested_routines` | *none* | Shared catalogue, matched on `fitness_goal` + `experience_level` |
| `suggested_routine_exercises` | *via routine* | FK into `exercises` — suggestions never add exercises |

Child tables have no `user_id`. Their RLS policies walk up to the parent row, so a set can
only ever be attached to a workout the caller owns.

## Functions

All are `SECURITY INVOKER`, so RLS applies inside them and a user can only aggregate their
own rows.

| Function | Returns |
| --- | --- |
| `get_previous_exercise_sets(exercise)` | Sets from the most recent completed session |
| `get_exercise_history(exercise, limit)` | Per-session top weight, reps, volume, est. 1RM |
| `get_workout_overview(timezone)` | Totals, workouts this week, streak, last workout |
| `get_volume_by_week(weeks, timezone)` | Weekly volume, padded so empty weeks still show |
| `get_muscle_distribution(days)` | Set count and volume per muscle group |
| `refresh_personal_records(workout)` | Upserts PRs, returns only the ones beaten |

## Conventions

- **Weights are kilograms. Lengths are centimetres.** `kg`/`lb` is display-only.
- **Timestamps are `timestamptz` in UTC.** The client converts for display, and the stats
  functions take a timezone so "this week" and the streak match the user's calendar.

## Tests

See `tests/` and §7 of the root `README.md`.
