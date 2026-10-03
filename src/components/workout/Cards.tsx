import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
import {
  equipmentLabel,
  formatDuration,
  formatRelativeDate,
  muscleLabel,
  pluralize,
} from '@/lib/format';
import { formatVolume } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';
import type { ExerciseRow, UnitPreference } from '@/types/database';
import type { WorkoutSummary } from '@/types/models';
import type { RoutineListItem } from '@/services/routines';

/** A saved session in the history list. */
export function WorkoutHistoryCard({
  workout,
  unit,
  onPress,
}: {
  workout: WorkoutSummary;
  unit: UnitPreference;
  onPress: () => void;
}) {
  const { colors, typography, spacing } = useTheme();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${workout.name}, ${formatRelativeDate(workout.completed_at)}, ${formatDuration(workout.duration_seconds)}, ${pluralize(workout.set_count, 'set')}`}
      accessibilityHint="Opens the full session"
      style={{ gap: spacing.xs }}
    >
      <View style={styles.rowBetween}>
        <Text numberOfLines={1} style={[typography.h3, { color: colors.text, flex: 1 }]}>
          {workout.name}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {formatRelativeDate(workout.completed_at)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Meta icon="time-outline" text={formatDuration(workout.duration_seconds)} />
        <Meta icon="layers-outline" text={pluralize(workout.set_count, 'set')} />
        <Meta icon="barbell-outline" text={pluralize(workout.exercise_count, 'exercise')} />
        {workout.total_volume > 0 ? (
          <Meta icon="trending-up-outline" text={formatVolume(workout.total_volume, unit)} />
        ) : null}
      </View>
    </Card>
  );
}

/** A reusable routine template. */
export function RoutineCard({
  routine,
  onPress,
  onStart,
}: {
  routine: RoutineListItem;
  onPress: () => void;
  onStart?: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  // The card is a plain container, not a Pressable. The "open" target and the
  // "Start" button are siblings, never nested — on web react-native-web renders
  // an accessibilityRole="button" Pressable as a real <button>, and a <button>
  // inside a <button> is invalid HTML and breaks hydration.
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.rowBetween}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Routine ${routine.name}, ${pluralize(routine.exercise_count, 'exercise')}`}
          accessibilityHint="Opens the routine"
          style={({ pressed }) => [{ flex: 1, minWidth: 0 }, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text numberOfLines={1} style={[typography.h3, { color: colors.text }]}>
            {routine.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {pluralize(routine.exercise_count, 'exercise')}
            {routine.estimated_duration ? ` · ~${routine.estimated_duration} min` : ''}
          </Text>
        </Pressable>

        {onStart ? (
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel={`Start ${routine.name}`}
            style={({ pressed }) => [
              styles.startButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="play" size={14} color={colors.onPrimary} />
            <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: '700' }]}>
              Start
            </Text>
          </Pressable>
        ) : null}
      </View>

      {routine.folder ? <Badge label={routine.folder} tone="neutral" /> : null}
    </Card>
  );
}

/** A row in the exercise library. */
export function ExerciseListItem({
  exercise,
  onPress,
  right,
  selected = false,
}: {
  exercise: ExerciseRow;
  onPress: () => void;
  right?: React.ReactNode;
  selected?: boolean;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${exercise.name}, ${muscleLabel(exercise.primary_muscle)}, ${equipmentLabel(exercise.equipment)}`}
      style={({ pressed }) => [
        styles.exerciseRow,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderRadius: radius.md,
          borderColor: selected ? colors.primary : colors.border,
          paddingHorizontal: spacing.lg,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.muscleDot,
          { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm },
        ]}
      >
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          {muscleLabel(exercise.primary_muscle).slice(0, 2).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.text }]}>
          {exercise.name}
        </Text>
        <Text numberOfLines={1} style={[typography.caption, { color: colors.textMuted }]}>
          {muscleLabel(exercise.primary_muscle)} · {equipmentLabel(exercise.equipment)}
          {exercise.is_public ? '' : ' · Custom'}
        </Text>
      </View>

      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />}
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={colors.textSubtle} />
      <Text style={[typography.caption, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: MIN_TOUCH_TARGET - 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: MIN_TOUCH_TARGET + 12,
  },
  muscleDot: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
