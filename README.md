# RepLog — Personal Fitness & Workout Management App

An Expo (React Native) + Supabase workout tracker. Plan routines, log sets fast while you
train, and see whether the numbers are actually going up.

Built to the project brief in `Personal_Fitness_Workout_Management_App_Context.md`.

---

## 1. What you need

| Tool | Version |
| --- | --- |
| Node.js | 22.13 or newer (required by Expo SDK 57) |
| npm | comes with Node |
| Expo Go | latest, from the App Store / Play Store |
| A Supabase project | free tier is fine |

Check your Node version with `node -v`. If it is older than 22.13, install the current LTS
from [nodejs.org](https://nodejs.org) first — the bundler will fail on older versions.

---

## 2. Set up Supabase (do this first)

The app is useless without a backend, and the database has to exist before the UI can do
anything real. This takes about five minutes.

### 2.1 Create the project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Wait for it to finish provisioning.

### 2.2 Run the migrations

Open **SQL Editor** in the Supabase dashboard and run these four files **in order**, from
`supabase/migrations/`:

| # | File | What it does |
| --- | --- | --- |
| 1 | `0001_schema.sql` | Tables, constraints, indexes, sign-up trigger |
| 2 | `0002_rls.sql` | Row Level Security policies |
| 3 | `0003_functions.sql` | Stats queries + personal-record rules |
| 4 | `0004_seed_exercises.sql` | 55 starter exercises |

Paste each file's contents into a new query and hit Run. All four are safe to run again if
you need to.

### 2.3 Get your keys

**Project Settings → API**. You need two values:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon / publishable key** — the long public key

> Do **not** copy the `service_role` key. It bypasses Row Level Security, and anything
> bundled into a mobile app can be extracted from it. It must never leave a server.

### 2.4 Email verification (required — sign-up emails a 6-digit code)

Accounts are **Gmail-only** and the address is verified with a code that the app emails at
sign-up, so email confirmation has to stay **on**:

**Authentication → Sign In / Providers → Email** — leave *Confirm email* **checked**.

Then make the code visible in the email. Edit **Authentication → Emails → Confirm signup**
so the template contains the token rather than only a link:

```html
<h2>Confirm your RepLog account</h2>
<p>Enter this code in the app:</p>
<p><strong>{{ .Token }}</strong></p>
```

That is the whole of the Google involvement: Gmail receives the code. There is no Google
sign-in, no OAuth and no Google password — accounts, passwords and sessions all belong to
this project's own Supabase Auth instance.

If you do uncheck *Confirm email*, the app still works: sign-up gets a session immediately
and goes straight to Home, skipping the code screen.

> Supabase's built-in email sender is rate-limited (a handful of messages per hour, and one
> per address every few seconds). The app has a 30-second resend cooldown so you do not hit
> it by accident. For heavier testing, add your own SMTP under
> **Authentication → Emails → SMTP Settings**.

### 2.5 Password reset

The reset flow emails a code. To make it work, edit
**Authentication → Emails → Reset Password** and make sure the template includes the token,
for example:

```html
<h2>Reset your RepLog password</h2>
<p>Enter this code in the app:</p>
<p><strong>{{ .Token }}</strong></p>
```

Then in the app: *Forgot password?* → enter your email → *I have a reset code* → type the
code. This works in Expo Go.

The app also accepts a deep link (`replog://reset-password?token_hash=...`) if you add
`replog://*` under **Authentication → URL Configuration → Redirect URLs**. Deep links need a
development build; the code route is the reliable path in Expo Go.

---

## 3. Run the app

```bash
npm install
cp .env.example .env      # then fill in your two values
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

Your `.env` should end up looking like:

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
```

If you edit `.env` while the server is running, restart with `npx expo start -c` — env vars
are baked in at bundle time.

**If the app opens to a "Finish the Supabase setup" screen**, one of those two variables is
missing or malformed. That screen is deliberate; it beats a red error box.

**If Expo Go says the SDK version does not match**, your installed Expo Go is newer than this
project. Run `npx expo install --fix` to realign the dependencies.

---

## 4. Project structure

```
supabase/
├── migrations/          run these against your Supabase project, in order
└── tests/               SQL test suite (see §7)

src/
├── app/                 screens — file-based routes (Expo Router)
│   ├── (auth)/          welcome, login, signup, verify-email, forgot/reset password
│   ├── (tabs)/          home, workout, progress, exercises, profile
│   ├── workout/         active logger, completion, history, detail
│   ├── routines/        builder (create + edit), detail
│   ├── exercises/       detail, create custom
│   └── profile/         edit, settings, measurements
├── components/
│   ├── ui/              Button, Input, Card, Screen, Sheet, states…
│   ├── workout/         SetRow, ActiveExerciseCard, RestTimerBar, picker
│   └── charts/          BarChart (Views), LineChart (SVG)
├── providers/           Auth, Settings, ActiveWorkout
├── services/            every Supabase call lives here
├── hooks/               useAsync, useTick
├── lib/                 supabase client, secure storage, units, formatting
├── theme/               tokens, ThemeProvider, responsive breakpoints
└── types/               database row types + app models
```

Screens never call `supabase` directly — they go through `src/services/`. That keeps queries
in one place and means a schema change touches one file, not twelve.

---

## 5. How the important parts work

### Signing up, and why verification ends on Home

Registration is the app's own, against Supabase Auth in this project. The Gmail address is
only the inbox the code is delivered to — Google never holds the session.

```
Gmail + password  →  account created (password hashed by Supabase, never stored by the app)
                  →  6-digit code emailed
                  →  code entered  →  session issued  →  Home
```

The last two arrows are one call: `supabase.auth.verifyOtp({ type: 'signup' })` both confirms
the address and returns a session, so a new user is signed in by verifying and never has to
retype their email and password on the login screen. Supabase invalidates the code as part of
that call, so it cannot be reused, and it expires on its own after a short while.

The password rules — 8+ characters, a letter, a number, a special character, no spaces — live
in `src/lib/validation.ts` as one list. `PasswordRequirements` renders that list live under
the field and the submit button is disabled until every item passes, so the checklist and the
button can never disagree.

Logging in with an account that was never verified goes to the code screen with a fresh code
rather than a dead-end error, and it reuses the existing account: `auth.resend` re-sends the
code for the unconfirmed user instead of registering again.

### Why "Too many attempts" used to appear when it shouldn't

Three separate causes, all fixed:

1. **Every 429 was reported as a rate limit on *attempts*.** Supabase's per-address email
   throttle ("you can only request this after N seconds") also arrives as a 429, and one
   perfectly reasonable request for a second code was enough to trigger it.
   `authErrorMessage` now separates the email-send throttle from a real request-rate limit and
   says which it is.
2. **Verification was a dead end.** Sign-up used to finish on "check your email → go to log
   in", so people came back and submitted the *sign-up form* again. Each re-submit called
   `auth.signUp` for the same address, which emails another confirmation and trips the
   throttle. There is now a verification screen with its own **Resend code** button, on a
   30-second cooldown, that calls `auth.resend`.
3. **Nothing stopped a request being sent twice.** A double tap, or the keyboard's "go" key
   landing on the same frame as a press, sent two identical requests — and the second one is
   what Supabase counts. `src/services/auth.ts` now keeps one in-flight promise per
   operation, so a duplicate call joins the request already running instead of starting
   another.

None of the underlying protections were weakened: the throttle, the code expiry and the
single-use codes are all still enforced by Supabase.

### Staying logged in

This was a core requirement, and it has one real complication worth knowing about.

Supabase persists its session through a storage adapter. The obvious choice,
`expo-secure-store`, writes to the iOS Keychain and Android EncryptedSharedPreferences —
exactly what you want for auth tokens. But it is built for small values and becomes
unreliable above roughly 2 KB, and a Supabase session (access token + refresh token + user
object) is routinely larger than that.

So `src/lib/secure-storage.ts` splits large values into numbered chunks and stores a small
manifest under the original key. Reads reassemble them; writes clean up leftovers from a
previous, longer value. The app stores **tokens only** — never your password, never anything
in plain text.

On launch, `AuthProvider` reads the stored session before rendering any screen.
`isBootstrapping` stays true until that finishes, so the Login screen never flashes for
someone who is already signed in.

### The active workout is local-first

While you are training, the session lives in React state and is mirrored to AsyncStorage on
every change. Typing a weight never waits on the network. The whole session is written to
Supabase once, when you tap **Finish**:

```
workouts → workout_exercises → workout_sets → refresh_personal_records
```

If any step fails, the parent workout row is deleted so there is no half-saved session, the
error is shown, and **your draft is kept** so you can tap Finish again.

This is a save-and-retry model, not full offline sync. Drafts survive force-quitting the app;
they are not queued and replayed in the background. The brief asked not to overclaim here,
so: that is exactly what it does and no more.

### Timers

The elapsed clock and the rest timer store the timestamp they started or end at, and
recompute the remainder on each tick. They never decrement a number in state, so re-renders,
dropped frames and backgrounding cannot make them drift.

### Units

**Everything is stored in kilograms.** `kg`/`lb` is a display preference, converted at the
input and output edges only. Switching units never changes what you have already logged.

### Personal records

Four record types, evaluated per exercise over the completed sets of a finished workout:

| Record | Rule |
| --- | --- |
| `heaviest_weight` | `max(weight)` among sets with at least 1 rep |
| `best_reps` | `max(reps)` in a single set |
| `best_volume` | `max(weight × reps)` in a single set |
| `estimated_1rm` | `max(weight × (1 + reps/30))` — Epley formula, 2 dp |

A record is written only when the candidate is **strictly greater** than the stored value, so
re-running the calculation for the same workout changes nothing. The logic lives in
`refresh_personal_records()` in SQL, not in the client, so it cannot drift between devices.

### Streak

The number of consecutive calendar days with at least one completed workout, counting back
from today — or from yesterday if you have not trained yet today. Computed in the device's
timezone, not UTC, so it matches the calendar you actually look at.

---

## 6. Security

- Every table has Row Level Security enabled.
- Ownership is always derived from `auth.uid()`, never from a `user_id` the client sends.
- `workout_sets`, `workout_exercises` and `routine_exercises` have no `user_id` of their own.
  Ownership is proven by walking up to the parent workout or routine, so a client cannot
  attach a set to someone else's session even by guessing an ID.
- The public exercise library is readable by any signed-in user and writable by none of them.
  Custom exercises are private to whoever created them.
- Passwords are sent straight to Supabase Auth, which stores a bcrypt hash. The app never
  stores, logs or transmits a password anywhere else, and never sees the stored hash.
- Verification codes are generated and checked by Supabase: random, time-limited, tied to the
  one address, single-use, and throttled per address. The app adds a 30-second resend cooldown
  in front of them rather than relaxing any of that.
- Emails are Gmail-only by validation, and the code is the proof the address is real.
- The app ships only the publishable key. The service-role key appears nowhere. No SMTP
  credential or email API key is in the client — Supabase sends the mail server-side.
- Logging out clears the local session. It never deletes your data.

---

## 7. Testing

### Database and RLS (automated)

`supabase/tests/` contains a suite that creates two users, has one log a workout, and then
checks that the other cannot read, update, delete, or write into any of it — plus the PR
rules and the stats functions.

The easiest way to run it is against a local Postgres:

```bash
psql -d replog -f supabase/tests/00_stub_auth.sql     # stubs auth.uid() and the roles
psql -d replog -f supabase/migrations/0001_schema.sql
psql -d replog -c 'grant all on all tables in schema public to anon, authenticated;'
psql -d replog -f supabase/migrations/0002_rls.sql
psql -d replog -f supabase/migrations/0003_functions.sql
psql -d replog -f supabase/migrations/0004_seed_exercises.sql
psql -d replog -f supabase/tests/10_rls_tests.sql
```

Every check prints `PASS` or `FAIL`. Currently 28 pass and none fail. Skip
`00_stub_auth.sql` if you are running it against a real Supabase database, which already has
the `auth` schema.

### Type checking

```bash
npm run typecheck
```

### Manual checks worth doing on a device

**Registration** — sign up with a Gmail address and a password like `Fitness1!`. Watch the
requirement list turn green as you type; the button stays disabled until it all does. Try
`you@yahoo.com` (rejected), `password` (no number, no special character) and `Pass 123!` (has
a space). Submit, check Gmail for the code, enter it — you should land on **Home**, already
signed in, without ever seeing the login screen. Try a wrong code first: it should say so and
let you try again.

**Session** — sign up, force-quit the app, reopen it. You should land on Home with no login
screen at any point. Then log out and back in; your data should still be there.

**A full workout** — create a routine, start it, log sets, use the rest timer, finish. Check
it appears in History and that Progress updated.

**Interruption** — start a workout, log a set, force-quit mid-session, reopen. The draft
should still be there.

**Responsiveness** — check a small phone, a standard phone, and a tablet if you have one. No
horizontal scrolling, no clipped text, nothing under the notch or home indicator.

---

## 8. What is and is not built

**Working, end to end:** sign-up with Gmail verification codes, login, logout, password reset,
persistent sessions, profile,
exercise library with search and filters, custom exercises, routine create/edit/delete/
duplicate, live workout logging with previous-performance hints, rest timer, supersets field
(stored, minimal UI), workout history with pagination, workout detail, exercise history and
progression charts, personal records, progress statistics, body measurements, units, light/
dark theme, tablet layouts.

**Deliberately not built:** push notifications, progress photos, social features, wearable
integration, AI recommendations, account deletion. The brief listed these as optional and
warned against destabilising the core; account deletion in particular needs a server-side
flow, which does not belong in a client-only project.

**Partial, and honestly labelled:** offline support is draft persistence plus retry, not
background sync. Supersets can be stored on a routine but there is no grouping UI yet.

---

## 9. Where this deviates from the brief

- **Routes live in `src/app/`, not `app/`.** This is what Expo SDK 57's own template does,
  and §74 of the brief allows a different Expo Router layout.
- **`profiles.height_cm` / `weight_kg`** rather than `height` / `weight`, so the unit is
  impossible to misread at a glance.
- **Unit, theme and rest-timer settings are columns on `profiles`** rather than a separate
  settings table. Fewer joins, one row per user.
- **Charts are hand-built** (Views for bars, `react-native-svg` for lines) instead of pulling
  in a charting library, per the brief's instruction to keep dependencies manageable.

---

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Finish the Supabase setup" screen | `.env` missing or malformed; restart with `npx expo start -c` |
| Expo Go SDK mismatch | `npx expo install --fix` |
| Login always fails | The address was never verified — the app now sends you to the code screen; enter the code (§2.4) |
| The verification email has a link but no code | The **Confirm signup** template is missing `{{ .Token }}` (§2.4) |
| "Please wait a moment before requesting another code." | Supabase's per-address email throttle. Wait for the countdown; add your own SMTP for heavy testing (§2.4) |
| Exercises list is empty | `0004_seed_exercises.sql` has not been run |
| "You do not have permission" | RLS migration `0002_rls.sql` has not been run |
| Stale bundle after editing `.env` | `npx expo start -c` |
