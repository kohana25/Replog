import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/charts/BarChart';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeading,
  SectionHeader,
  StatCard,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { formatDuration, formatRelativeDate, muscleLabel, recordLabel } from '@/lib/format';
import { formatVolume, formatWeight } from '@/lib/units';
import { useUnit } from '@/providers/SettingsProvider';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { getRecentRecords } from '@/services/exercises';
import { getMuscleDistribution, getOverview, getWeeklyVolume } from '@/services/progress';
import { useTheme } from '@/theme/ThemeProvider';

export default function ProgressScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const unit = useUnit();
  const { draft } = useActiveWorkout();

  const { data, error, isLoading, isRefreshing, refresh, refetch } = useAsync(async () => {
    const [overview, weekly, muscles, records] = await Promise.all([
      getOverview(),
      getWeeklyVolume(8),
      getMuscleDistribution(30),
      getRecentRecords(8),
    ]);
    return { overview, weekly, muscles, records };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const weekLabel = (iso: string) => {
    const date = new Date(iso);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <Screen
      bottomInset={draft ? 64 : 0}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <ScreenHeading title="Progress" subtitle="Am I improving?" />

      {isLoading ? (
        <LoadingState message="Crunching your numbers…" />
      ) : error ? (
        <ErrorState message="Unable to load your progress." onRetry={refetch} />
      ) : data && data.overview.total_workouts === 0 ? (
        <EmptyState
          icon="stats-chart-outline"
          title="No progress to show yet"
          message="Finish your first workout and your stats, charts and records will appear here."
          actionLabel="Go to workouts"
          onAction={() => router.push('/(tabs)/workout')}
        />
      ) : data ? (
        <View style={{ gap: spacing['2xl'] }}>
          <View style={styles.statGrid}>
            <StatCard
              label="Workouts"
              value={String(data.overview.total_workouts)}
              icon="barbell-outline"
            />
            <StatCard
              label="Streak"
              value={`${data.overview.current_streak_days}d`}
              icon="flame-outline"
              hint="consecutive days"
            />
            <StatCard label="Total sets" value={String(data.overview.total_sets)} icon="layers-outline" />
            <StatCard
              label="Total volume"
              value={formatVolume(data.overview.total_volume, unit)}
              icon="trending-up-outline"
            />
            <StatCard
              label="Time trained"
              value={formatDuration(data.overview.total_duration_seconds)}
              icon="time-outline"
            />
            <StatCard
              label="Last workout"
              value={formatRelativeDate(data.overview.last_workout_at)}
              icon="calendar-outline"
            />
          </View>

          {/* -------------------- Weekly volume -------------------- */}
          <View>
            <SectionHeader title="Volume by week" />
            <Card style={{ gap: spacing.md }}>
              <BarChart
                data={data.weekly.map((week) => ({
                  label: weekLabel(week.week_start),
                  value: Number(week.total_volume) || 0,
                }))}
                unitSuffix={` ${unit}`}
                emptyMessage="No volume logged in the last 8 weeks."
              />
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Volume is weight × reps across all completed sets.
              </Text>
            </Card>
          </View>

          {/* ------------------ Workout frequency ------------------ */}
          <View>
            <SectionHeader title="Workouts per week" />
            <Card>
              <BarChart
                data={data.weekly.map((week) => ({
                  label: weekLabel(week.week_start),
                  value: week.workout_count,
                }))}
                height={110}
                emptyMessage="No workouts in the last 8 weeks."
              />
            </Card>
          </View>

          {/* ----------------- Muscle distribution ----------------- */}
          <View>
            <SectionHeader title="Muscle groups (last 30 days)" />
            <Card style={{ gap: spacing.md }}>
              {data.muscles.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Nothing logged in the last 30 days.
                </Text>
              ) : (
                data.muscles.map((entry) => {
                  const max = Math.max(...data.muscles.map((item) => item.set_count), 1);
                  return (
                    <View key={entry.primary_muscle} style={{ gap: 4 }}>
                      <View style={styles.rowBetween}>
                        <Text style={[typography.caption, { color: colors.text }]}>
                          {muscleLabel(entry.primary_muscle)}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                          {entry.set_count} sets
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.surfaceAlt,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${(entry.set_count / max) * 100}%`,
                            height: '100%',
                            backgroundColor: colors.primary,
                          }}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </View>

          {/* -------------------- Personal records ------------------ */}
          <View>
            <SectionHeader title="Personal records" />
            {data.records.length === 0 ? (
              <Card>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Records appear once you beat a previous best.
                </Text>
              </Card>
            ) : (
              <Card style={{ gap: spacing.md }}>
                {data.records.map((record) => (
                  <View key={record.id} style={styles.rowBetween}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.text }]}>
                        {record.exercise?.name ?? 'Exercise'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {recordLabel(record.record_type)} · {formatRelativeDate(record.achieved_at)}
                      </Text>
                    </View>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>
                      {record.record_type === 'best_reps'
                        ? `${Math.round(record.value)} reps`
                        : formatWeight(record.value, unit)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}
          </View>

          <Button
            label="Body measurements"
            variant="secondary"
            icon="body-outline"
            onPress={() => router.push('/profile/measurements')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
