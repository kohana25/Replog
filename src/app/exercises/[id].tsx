import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import {
  AppBar,
  Badge,
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingState,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { ExerciseImage } from '@/components/workout/ExerciseImage';
import { useAsync } from '@/hooks/useAsync';
import { confirmAction, notify } from '@/lib/alert';
import {
  equipmentLabel,
  experienceLabel,
  formatRelativeDate,
  muscleLabel,
  pluralize,
  recordLabel,
} from '@/lib/format';
import { formatWeight, weightInputValue } from '@/lib/units';
import { useAuth } from '@/providers/AuthProvider';
import { useUnit } from '@/providers/SettingsProvider';
import {
  deleteCustomExercise,
  getExercise,
  getExerciseHistory,
  getRecordsForExercise,
} from '@/services/exercises';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';

export default function ExerciseDetailScreen() {
  const { colors, typography, spacing } = useTheme();
  const { width, gutter } = useResponsive();
  const router = useRouter();
  const unit = useUnit();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, error, isLoading, refetch } = useAsync(async () => {
    const [exercise, history, records] = await Promise.all([
      getExercise(id as string),
      getExerciseHistory(id as string, 12),
      getRecordsForExercise(id as string),
    ]);
    return { exercise, history, records };
  }, [id]);

  const isOwner = Boolean(data?.exercise?.created_by && data.exercise.created_by === user?.id);

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: 'Delete this exercise?',
      message: 'Workouts that already used it keep their logged sets.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteCustomExercise(id as string);
      router.back();
    } catch {
      notify(
        'Could not delete',
        'This exercise may still be used by a routine. Remove it there first.',
      );
    }
  };

  // The RPC returns newest first; charts read left-to-right in time order.
  const chronological = [...(data?.history ?? [])].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title={data?.exercise?.name ?? 'Exercise'}
        right={
          isOwner ? (
            <IconButton
              icon="trash-outline"
              color={colors.danger}
              onPress={() => void handleDelete()}
              accessibilityLabel="Delete this custom exercise"
            />
          ) : null
        }
      />

      <Screen>
        {isLoading ? (
          <LoadingState message="Loading exercise…" />
        ) : error || !data?.exercise ? (
          <ErrorState message="Unable to load this exercise." onRetry={refetch} />
        ) : (
          <View style={{ gap: spacing.xl }}>
            {/* A banner rather than a thumbnail: this is the one screen whose
                whole subject is the exercise itself. */}
            <ExerciseImage
              name={data.exercise.name}
              muscle={data.exercise.primary_muscle}
              size="lg"
            />

            <View style={styles.badges}>
              <Badge label={muscleLabel(data.exercise.primary_muscle)} tone="primary" />
              <Badge label={equipmentLabel(data.exercise.equipment)} />
              {data.exercise.difficulty ? (
                <Badge label={experienceLabel(data.exercise.difficulty)} />
              ) : null}
              {!data.exercise.is_public ? <Badge label="Custom" tone="accent" /> : null}
            </View>

            {data.exercise.description ? (
              <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
                {data.exercise.description}
              </Text>
            ) : null}

            {data.exercise.instructions ? (
              <View>
                <SectionHeader title="How to do it" />
                <Card>
                  <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                    {data.exercise.instructions}
                  </Text>
                </Card>
              </View>
            ) : null}

            {/* ------------------- Personal records ------------------- */}
            <View>
              <SectionHeader title="Personal records" />
              <Card style={{ gap: spacing.sm }}>
                {data.records.length === 0 ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    No records yet. Log this exercise to set your first one.
                  </Text>
                ) : (
                  data.records.map((record) => (
                    <View key={record.id} style={styles.rowBetween}>
                      <Text style={[typography.body, { color: colors.textMuted }]}>
                        {recordLabel(record.record_type)}
                      </Text>
                      <Text style={[typography.bodyStrong, { color: colors.text }]}>
                        {record.record_type === 'best_reps'
                          ? `${Math.round(record.value)} reps`
                          : formatWeight(record.value, unit)}
                      </Text>
                    </View>
                  ))
                )}
              </Card>
            </View>

            {/* --------------------- Progression --------------------- */}
            <View>
              <SectionHeader title="Weight progression" />
              <Card>
                <LineChart
                  points={chronological
                    .filter((entry) => entry.top_weight != null)
                    .map((entry) => ({
                      label: formatRelativeDate(entry.performed_at),
                      value: Number(entry.top_weight) || 0,
                    }))}
                  width={Math.min(width - gutter * 2 - 34, 520)}
                  unitSuffix={` ${unit}`}
                />
              </Card>
            </View>

            {/* ----------------------- History ----------------------- */}
            <View>
              <SectionHeader title="Recent sessions" />
              {data.history.length === 0 ? (
                <Card>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    You have not logged this exercise yet.
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {data.history.map((entry) => (
                    <Card key={entry.workout_id} style={{ gap: 2 }}>
                      <View style={styles.rowBetween}>
                        <Text style={[typography.bodyStrong, { color: colors.text }]}>
                          {formatRelativeDate(entry.performed_at)}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                          {pluralize(entry.set_count, 'set')}
                        </Text>
                      </View>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        Top set {weightInputValue(entry.top_weight, unit)} {unit} ×{' '}
                        {entry.top_reps ?? 0} · volume{' '}
                        {formatWeight(Number(entry.total_volume) || 0, unit)}
                      </Text>
                    </Card>
                  ))}
                </View>
              )}
            </View>

            <Button label="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
