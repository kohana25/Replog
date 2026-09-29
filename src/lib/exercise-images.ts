/**
 * Photographs for the exercise library.
 *
 * SOURCE AND LICENCE
 * free-exercise-db (https://github.com/yuhonas/free-exercise-db), released
 * under The Unlicense — a public-domain dedication, so no attribution is
 * required and the images may be used and redistributed freely. They are
 * bundled rather than fetched so the app works offline and does not depend
 * on anyone else's uptime; each one is resized to 480px wide and re-encoded,
 * which keeps the whole set to about 1.3 MB.
 *
 * KEYED BY NAME, NOT ID
 * Exercise ids are per-database uuids, so a map keyed on them would break in
 * any other project. Names in the public library are unique and stable, and
 * are what 0004 seeds, so the key is the normalised name.
 *
 * This file is generated — see the Phase 2 notes in README.md. Exercises with
 * no suitable photograph (currently only Burpee) are absent on purpose and
 * fall back to a muscle-group icon in ExerciseImage.
 */

export type ExerciseImageSource = ReturnType<typeof require>;

/** Lower-cased, punctuation-stripped: "Farmer's Walk" -> "farmer s walk". */
export function exerciseImageKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const IMAGES: Record<string, ExerciseImageSource> = {
  'arnold press': require('@/assets/exercises/arnold-press.jpg'),
  'back squat': require('@/assets/exercises/back-squat.jpg'),
  'barbell bench press': require('@/assets/exercises/barbell-bench-press.jpg'),
  'barbell curl': require('@/assets/exercises/barbell-curl.jpg'),
  'barbell row': require('@/assets/exercises/barbell-row.jpg'),
  'bulgarian split squat': require('@/assets/exercises/bulgarian-split-squat.jpg'),
  'cable chest fly': require('@/assets/exercises/cable-chest-fly.jpg'),
  'cable crunch': require('@/assets/exercises/cable-crunch.jpg'),
  'cable curl': require('@/assets/exercises/cable-curl.jpg'),
  'cable kickback': require('@/assets/exercises/cable-kickback.jpg'),
  'chest dip': require('@/assets/exercises/chest-dip.jpg'),
  'chin up': require('@/assets/exercises/chin-up.jpg'),
  'close grip bench press': require('@/assets/exercises/close-grip-bench-press.jpg'),
  'dead bug': require('@/assets/exercises/dead-bug.jpg'),
  'deadlift': require('@/assets/exercises/deadlift.jpg'),
  'dumbbell bench press': require('@/assets/exercises/dumbbell-bench-press.jpg'),
  'dumbbell curl': require('@/assets/exercises/dumbbell-curl.jpg'),
  'dumbbell row': require('@/assets/exercises/dumbbell-row.jpg'),
  'face pull': require('@/assets/exercises/face-pull.jpg'),
  'farmer s walk': require('@/assets/exercises/farmer-s-walk.jpg'),
  'front squat': require('@/assets/exercises/front-squat.jpg'),
  'glute bridge': require('@/assets/exercises/glute-bridge.jpg'),
  'hammer curl': require('@/assets/exercises/hammer-curl.jpg'),
  'hanging leg raise': require('@/assets/exercises/hanging-leg-raise.jpg'),
  'hip thrust': require('@/assets/exercises/hip-thrust.jpg'),
  'incline barbell press': require('@/assets/exercises/incline-barbell-press.jpg'),
  'incline dumbbell press': require('@/assets/exercises/incline-dumbbell-press.jpg'),
  'jump rope': require('@/assets/exercises/jump-rope.jpg'),
  'kettlebell swing': require('@/assets/exercises/kettlebell-swing.jpg'),
  'lat pulldown': require('@/assets/exercises/lat-pulldown.jpg'),
  'lateral raise': require('@/assets/exercises/lateral-raise.jpg'),
  'leg curl': require('@/assets/exercises/leg-curl.jpg'),
  'leg extension': require('@/assets/exercises/leg-extension.jpg'),
  'leg press': require('@/assets/exercises/leg-press.jpg'),
  'overhead press': require('@/assets/exercises/overhead-press.jpg'),
  'overhead tricep extension': require('@/assets/exercises/overhead-tricep-extension.jpg'),
  'plank': require('@/assets/exercises/plank.jpg'),
  'preacher curl': require('@/assets/exercises/preacher-curl.jpg'),
  'pull up': require('@/assets/exercises/pull-up.jpg'),
  'push up': require('@/assets/exercises/push-up.jpg'),
  'rear delt fly': require('@/assets/exercises/rear-delt-fly.jpg'),
  'resistance band pull apart': require('@/assets/exercises/resistance-band-pull-apart.jpg'),
  'romanian deadlift': require('@/assets/exercises/romanian-deadlift.jpg'),
  'rowing machine': require('@/assets/exercises/rowing-machine.jpg'),
  'russian twist': require('@/assets/exercises/russian-twist.jpg'),
  'seated cable row': require('@/assets/exercises/seated-cable-row.jpg'),
  'seated dumbbell shoulder press': require('@/assets/exercises/seated-dumbbell-shoulder-press.jpg'),
  'skull crusher': require('@/assets/exercises/skull-crusher.jpg'),
  'standing calf raise': require('@/assets/exercises/standing-calf-raise.jpg'),
  'stationary bike': require('@/assets/exercises/stationary-bike.jpg'),
  'treadmill run': require('@/assets/exercises/treadmill-run.jpg'),
  'tricep dip': require('@/assets/exercises/tricep-dip.jpg'),
  'tricep pushdown': require('@/assets/exercises/tricep-pushdown.jpg'),
  'walking lunge': require('@/assets/exercises/walking-lunge.jpg'),
};

/** The bundled photograph for an exercise, or null when there is none. */
export function exerciseImage(name: string | null | undefined): ExerciseImageSource | null {
  if (!name) return null;
  return IMAGES[exerciseImageKey(name)] ?? null;
}

/** How many exercises currently have artwork — used by the asset test. */
export const EXERCISE_IMAGE_COUNT = 54;
