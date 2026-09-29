import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppBar,
  Badge,
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingState,
  Screen,
  StatCard,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { confirmAction, notify } from '@/lib/alert';
import {
  formatDuration,
  formatLongDate,
  formatTimeOfDay,
  pluralize,
  setTypeLabel,
} from '@/lib/format';
import { formatVolume, weightInputValue } from '@/lib/units';
import { useUnit } from '@/providers/SettingsProvider';
import {
  computeWorkoutVolume,
  countWorkoutSets,
  deleteWorkout,
  getWorkout,
} from '@/services/workouts';
import { useTheme } from '@/theme/ThemeProvider';

export default function WorkoutDetailScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const unit = useUnit();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, error, isLoading, refetch } = useAsync(() => getWorkout(id as string), [id]);

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: 'Delete this workout?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteWorkout(id as string);
      router.back();
    } catch {
      notify('Could not delete', 'Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title={data?.name ?? 'Workout'}
        subtitle={data ? formatLongDate(data.completed_at) : undefined}
        right={
          data ? (
            <IconButton
              icon="trash-outline"
              onPress={() => void handleDelete()}
              accessibilityLabel="Delete this workout"
              color={colors.danger}
            />
          ) : null
        }
      />

      <Screen>
        {isLoading ? (
          <LoadingState message="Loading workout…" />
        ) : error || !data ? (
          <ErrorState message="Unable to load this workout." onRetry={refetch} />
        ) : (
          <View style={{ gap: spacing.xl }}>
            <View style={styles.grid}>
              <StatCard
                label="Duration"
                value={formatDuration(data.duration_seconds)}
                icon="time-outline"
              />
              <StatCard
                label="Sets"
                value={String(countWorkoutSets(data))}
                icon="layers-outline"
              />
              <StatCard
                label="Volume"
                value={formatVolume(computeWorkoutVolume(data), unit)}
                icon="trending-up-outline"
              />
              <StatCard
                label="Started"
                value={formatTimeOfDay(data.started_at) || '—'}
                icon="calendar-outline"
              />
            </View>

            {data.notes ? (
              <Card>
                <Text style={[typography.caption, { color: colors.textMuted }]}>NOTES</Text>
                <Text style={[typography.body, { color: colors.text }]}>{data.notes}</Text>
              </Card>
            ) : null}

            {data.workout_exercises.map((entry) => (
              <Card key={entry.id} style={{ gap: spacing.sm }}>
                <Text
                  onPress={() => router.push(`/exercises/${entry.exercise_id}`)}
                  accessibilityRole="link"
                  style={[typography.h3, { color: colors.primaryText }]}
                >
                  {entry.exercise?.name ?? 'Exercise'}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {pluralize(entry.workout_sets.length, 'set')}
                </Text>

                {entry.workout_sets.map((set) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={[typography.caption, { color: colors.textMuted, width: 34 }]}>
                      {set.set_number}
                    </Text>
                    <Text style={[typography.bodyStrong, { color: colors.text, flex: 1 }]}>
                      {set.duration_seconds != null
                        ? `${set.duration_seconds}s`
                        : `${weightInputValue(set.weight, unit)} ${unit} × ${set.reps ?? 0}`}
                    </Text>
                    {set.rpe != null ? <Badge label={`RPE ${set.rpe}`} /> : null}
                    {set.set_type !== 'normal' ? (
                      <Badge label={setTypeLabel(set.set_type)} tone="warning" />
                    ) : null}
                  </View>
                ))}
              </Card>
            ))}

            <Button label="Back to history" variant="secondary" onPress={() => router.back()} />
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
