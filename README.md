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

### 2.4 Turn email confirmation OFF (required)

Accounts are a **username and a password**. There is no email address anywhere in the app: no
confirmation step, no reset link, no inbox.

**Authentication → Sign In / Providers → Email** — uncheck *Confirm email*.

This is not optional. Supabase Auth has no username credential, so the app registers each
account under a synthetic address, `<username>@users.replog.invalid`. `.invalid` is reserved by
RFC 2606 and can never be a real domain, which is the point: the address is unroutable by
construction, so no mail can ever reach a stranger's inbox by mistake. It also means nothing
can ever confirm it. Leave *Confirm email* checked and Supabase will withhold the session
until an address that cannot receive mail is confirmed, producing accounts nobody can log
into. The app detects that case and says so on screen rather than showing a generic error.

The address never leaves `src/services/auth.ts`. Everything above it — screens, provider,
profile — works in usernames.

Usernames are 3–20 characters, must start with a letter, and allow letters, numbers and
underscores. They are stored lowercase, so `Alice` and `alice` are one account rather than two
that look identical. Uniqueness is free: Supabase already requires the address to be unique,
so a taken username is rejected before any row is written, and `profiles.username` carries a
`unique` constraint as a second line of defence.

### 2.5 There is no password reset

A forgotten password cannot be recovered. With no address on the account there is nowhere to
send a reset link, so the *Forgot password?* flow has been removed rather than left as a
button that cannot work. Both the sign-up and login screens say so before anyone commits to a
password.

A signed-in user can still change their password — that goes through
`updatePassword()` in `src/services/auth.ts`, which needs the current session rather than an
email.

> If you later want recovery back, the smallest change is an optional email field on the
> profile plus Supabase's standard reset flow. That is a deliberate re-addition, not a
> setting.

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
│   ├── (auth)/          welcome, login, signup
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

### Signing up with a username

Registration is the app's own, against Supabase Auth in this project. There is no email
address, no confirmation step and no third-party sign-in — the account, the password and the
session all belong to this project.

```
username + password  →  account created (password hashed by Supabase, never stored by the app)
                     →  session returned immediately
                     →  Home
```

Supabase Auth authenticates an email and a password, so `src/services/auth.ts` maps the
username onto a synthetic address — `<username>@users.replog.invalid` — and hands the username
through in the sign-up metadata. The `handle_new_user()` trigger
(`supabase/migrations/0005_username_auth.sql`) reads that metadata and seeds
`profiles.username`, so the username is written once, server-side, rather than by a client
that could send anything.

The address is an implementation detail and never leaves that one file. Screens, `AuthProvider`
and the profile all work in usernames.

Two properties fall out of the mapping. Usernames are unique for free, because Supabase
already requires the address to be unique — a taken username comes back as the same
"user with no identities" response a taken address does, which is what `usernameTaken`
detects. And usernames are case-insensitive, because both the app and the trigger lowercase
before storing, so `Alice` and `alice` cannot become two accounts that look the same.

Input is sanitized as it is typed, not only on submit: typing `Richard M!!` into the username
field leaves `richardm` in it, so the value that reaches validation is already one that can
be a username.

The password rules — 8+ characters, a number, a special character, no spaces — live in
`src/lib/validation.ts` as one list. `PasswordRequirements` renders that list live under the
field **while the password field has focus**, and hides when any other field takes focus;
`validatePassword` checks the same list on submit and names whatever is still missing, so the
rules the user is shown and the rules the form enforces cannot drift apart.

### Preventing duplicate requests

A double tap, or the keyboard's "go" key landing on the same frame as a press, used to send
two identical requests — and the second one is what Supabase counts towards a rate limit.
`src/services/auth.ts` keeps one in-flight promise per operation, so a duplicate call joins
the request already running instead of starting another.

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
- Accounts hold no email address. Nothing in the database identifies a person beyond the
  username they chose and whatever they put in their profile.
- The flip side, stated plainly: there is no account recovery. Losing a password loses the
  account, and an attacker who guesses one has no second factor to get past.
- Usernames are the only public identifier, and `profiles.username` is `unique`, so two
  accounts can never share one.
- The app ships only the publishable key. The service-role key appears nowhere.
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

**Registration** — sign up with a username and a password like `Fitness1!`. Type `Richard M!!`
into the username field: it should become `richardm` as you type. Tap the password field: the
requirement list appears under it and turns green as you type. Tap the name, username or
confirm field: it disappears. Tap the password field again: it is back. Then try `ab` (too
short), `9lifter` (must start with a letter), `password` (submit tells you it needs a number
and a special character) and `Pass 123!` (rejected for the space). Submit a good one: you
should land on **Home** immediately, with no confirmation step. Sign up again with the same
username and it should be refused as taken.

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

**Working, end to end:** sign-up and login with a username, logout, persistent sessions,
profile,
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
| "This project still has email confirmation switched on" | Uncheck *Confirm email* under Authentication → Sign In / Providers (§2.4) |
| Sign-up says the username is taken when it should not be | Usernames are case-insensitive and stored lowercase, so `Alice` and `alice` are one account (§2.4) |
| Forgot my password | It cannot be reset — there is no address to send a link to. Create a new account (§2.5) |
| Exercises list is empty | `0004_seed_exercises.sql` has not been run |
| "You do not have permission" | RLS migration `0002_rls.sql` has not been run |
| Stale bundle after editing `.env` | `npx expo start -c` |
| Metro dies with `Fatal process out of memory` while bundling | Usually low RAM during the web bundle. Close other apps, or raise Node's heap: PowerShell `$env:NODE_OPTIONS="--max-old-space-size=4096"; npx expo start`, bash `NODE_OPTIONS=--max-old-space-size=4096 npx expo start` |
| Windows: slow bundling, file-watcher errors, random crashes | Move the project out of a OneDrive-synced folder (e.g. `C:\dev\replog`). OneDrive syncing `node_modules` fights with Metro's watcher |
