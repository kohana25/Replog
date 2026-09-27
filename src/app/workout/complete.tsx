import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, StatCard } from '@/components/ui';
import { formatDuration, pluralize, recordLabel } from '@/lib/format';
import { formatVolume, formatWeight } from '@/lib/units';
import { useUnit } from '@/providers/SettingsProvider';
import { useTheme } from '@/theme/ThemeProvider';
import type { WorkoutSummaryStats } from '@/types/models';

/**
 * Post-workout summary. The stats are handed over as a route param so this
 * screen needs no extra round trip to the database right after saving.
 */
export default function WorkoutCompleteScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const unit = useUnit();

  const params = useLocalSearchParams<{ workoutId?: string; stats?: string }>();

  const stats = useMemo<WorkoutSummaryStats | null>(() => {
    if (!params.stats) return null;
    try {
      return JSON.parse(params.stats as string) as WorkoutSummaryStats;
    } catch {
      return null;
    }
  }, [params.stats]);

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm }}>
        <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
        <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
          Workout saved
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
          Nice work. It is in your history and counted towards your progress.
        </Text>
      </View>

      {stats ? (
        <View style={{ gap: spacing.xl }}>
          <View style={styles.grid}>
            <StatCard
              label="Duration"
              value={formatDuration(stats.durationSeconds)}
              icon="time-outline"
            />
            <StatCard
              label="Exercises"
              value={String(stats.exerciseCount)}
              icon="barbell-outline"
            />
            <StatCard label="Sets" value={String(stats.setCount)} icon="layers-outline" />
            <StatCard
              label="Volume"
              value={formatVolume(stats.totalVolume, unit)}
              icon="trending-up-outline"
            />
          </View>

          {stats.newRecords.length > 0 ? (
            <Card style={{ gap: spacing.md }}>
              <View style={styles.row}>
                <Ionicons name="trophy" size={20} color={colors.warning} />
                <Text style={[typography.h3, { color: colors.text }]}>
                  {pluralize(stats.newRecords.length, 'new personal record')}
                </Text>
              </View>

              {stats.newRecords.map((record, index) => (
                <View key={`${record.exerciseName}-${record.recordType}-${index}`} style={{ gap: 2 }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>
                    {record.exerciseName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {recordLabel(record.recordType)}:{' '}
                    {record.recordType === 'best_reps'
                      ? `${Math.round(record.value)} reps`
                      : formatWeight(record.value, unit)}
                    {record.previousValue != null
                      ? ` (was ${
                          record.recordType === 'best_reps'
                            ? `${Math.round(record.previousValue)} reps`
                            : formatWeight(record.previousValue, unit)
                        })`
                      : ' — first time logged'}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: spacing.md, marginTop: spacing['2xl'] }}>
        {params.workoutId ? (
          <Button
            label="View this workout"
            variant="secondary"
            onPress={() => router.replace(`/workout/${params.workoutId}`)}
          />
        ) : null}
        <Button label="Done" size="lg" onPress={() => router.replace('/(tabs)')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
