/**
 * Display formatting. Timestamps arrive from Postgres as UTC and are
 * rendered in the device's local timezone by the platform Date APIs.
 */

import type {
  Equipment,
  ExperienceLevel,
  FitnessGoal,
  MuscleGroup,
  RecordType,
  SetType,
} from '@/types/database';

/** "32:18" or "1:04:09" — used for live elapsed time and rest timers. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "45 min", "1h 12m", "—" */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined) return '—';
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Today", "Yesterday", "Sep 12" or "Sep 12, 2025" for other years. */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago`;

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

/** "Sunday, 14 September" style long date. */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTimeOfDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Good morning" / "Good afternoon" / "Good evening" */
export function greetingForNow(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The device timezone name, passed to the SQL stats functions. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/* ----------------------------- enum labels ----------------------------- */

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  cardio: 'Cardio',
  full_body: 'Full Body',
};

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  resistance_band: 'Resistance Band',
  bodyweight: 'Bodyweight',
  other: 'Other',
};

const GOAL_LABELS: Record<FitnessGoal, string> = {
  build_muscle: 'Build Muscle',
  gain_strength: 'Gain Strength',
  lose_weight: 'Lose Weight',
  improve_fitness: 'Improve Fitness',
  maintain_fitness: 'Maintain Fitness',
  general_wellness: 'General Wellness',
};

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const RECORD_LABELS: Record<RecordType, string> = {
  heaviest_weight: 'Heaviest weight',
  best_reps: 'Best reps',
  best_volume: 'Best set volume',
  estimated_1rm: 'Estimated 1RM',
};

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Warm-up',
  drop: 'Drop set',
  failure: 'To failure',
};

/** Short marker shown in the set-number column. */
const SET_TYPE_MARKERS: Record<SetType, string | null> = {
  normal: null,
  warmup: 'W',
  drop: 'D',
  failure: 'F',
};

export const muscleLabel = (value: MuscleGroup | string): string =>
  MUSCLE_LABELS[value as MuscleGroup] ?? value;

export const equipmentLabel = (value: Equipment | string): string =>
  EQUIPMENT_LABELS[value as Equipment] ?? value;

export const goalLabel = (value: FitnessGoal | string | null): string =>
  value ? (GOAL_LABELS[value as FitnessGoal] ?? value) : 'Not set';

export const experienceLabel = (value: ExperienceLevel | string | null): string =>
  value ? (EXPERIENCE_LABELS[value as ExperienceLevel] ?? value) : 'Not set';

export const recordLabel = (value: RecordType | string): string =>
  RECORD_LABELS[value as RecordType] ?? value;

export const setTypeLabel = (value: SetType): string => SET_TYPE_LABELS[value] ?? value;

export const setTypeMarker = (value: SetType): string | null => SET_TYPE_MARKERS[value] ?? null;

/** "6 exercises" / "1 exercise" */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

/** First initial(s) for the avatar placeholder. */
export function initialsFor(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}
