import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ImageBackground, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { WorkoutHistoryCard } from '@/components/workout/Cards';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
  SectionHeader,
  StatCard,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import {
  formatRelativeDate,
  greetingForNow,
  pluralize,
  recordLabel,
} from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useUnit } from '@/providers/SettingsProvider';
import { getRecentRecords } from '@/services/exercises';
import { getOverview } from '@/services/progress';
import { listRoutines } from '@/services/routines';
import { getRecentWorkouts } from '@/services/workouts';
import { useTheme } from '@/theme/ThemeProvider';
import { palette } from '@/theme/tokens';
import { useResponsive } from '@/theme/useResponsive';

// Bundled, on-brand background for the "Today's workout" hero. Shipped with the
// app so the card always has a background (routines carry no image of their own),
// and dark enough that the overlaid white text stays readable in both themes.
const WORKOUT_BG = require('@/assets/images/workout-card-bg.png');

export default function HomeScreen() {
  const { colors, typography, spacing } = useTheme();
  const { isWide, isSmall } = useResponsive();
  const router = useRouter();
  const unit = useUnit();

  const { profile, user } = useAuth();
  const { draft, startEmptyWorkout } = useActiveWorkout();

  const { data, error, isLoading, isRefreshing, refresh, refetch } = useAsync(
    async () => {
      const [overview, routines, recentWorkouts, records] = await Promise.all([
        getOverview(),
        listRoutines(),
        getRecentWorkouts(1),
        getRecentRecords(3),
      ]);
      return { overview, routines, recentWorkouts, records };
    },
    [],
  );

  // Numbers change every time a workout is saved, so refresh on return.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const displayName = (
    profile?.full_name?.trim() ||
    profile?.username ||
    user?.email?.split('@')[0] ||
    ''
  ).trim();

  const startEmpty = () => {
    startEmptyWorkout();
    router.push('/workout/active');
  };

  const weeklyTarget = Math.max(profile?.training_days?.length ?? 0, 4);

  // Compact hero: a fraction of the old text-only card's footprint, so the
  // streak ("This week", below) stays in view the moment Home opens.
  const heroMinHeight = isSmall ? 140 : isWide ? 176 : 156;

  return (
    <Screen
      bottomInset={draft ? 64 : 0}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.body, { color: colors.textMuted }]}>{greetingForNow()}</Text>
        <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
          {displayName || 'Welcome'}
        </Text>
      </View>

      {isLoading ? (
        <LoadingState message="Loading your dashboard…" />
      ) : error ? (
        <ErrorState message="Unable to load your dashboard." onRetry={refetch} />
      ) : (
        <View style={{ gap: spacing['2xl'] }}>
          {/* ---------------- Today's workout ---------------- */}
          {draft ? (
            <WorkoutHero minHeight={heroMinHeight}>
              <View style={{ gap: spacing.xs, alignItems: 'flex-start' }}>
                <Badge label="IN PROGRESS" tone="accent" icon="pulse" />
                <Text numberOfLines={1} style={[typography.h2, styles.onImageTitle]}>
                  {draft.name}
                </Text>
                <Text style={[typography.caption, styles.onImageText]}>
                  {pluralize(draft.exercises.length, 'exercise')} · picked up where you left off
                </Text>
              </View>
              <Button
                label="Resume workout"
                icon="play"
                size="md"
                onPress={() => router.push('/workout/active')}
              />
            </WorkoutHero>
          ) : data && data.routines.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <WorkoutHero minHeight={heroMinHeight}>
                <View style={{ gap: 2 }}>
                  <Text style={[typography.caption, styles.onImageText]}>
                    Ready for today&apos;s workout?
                  </Text>
                  <Text numberOfLines={1} style={[typography.h2, styles.onImageTitle]}>
                    {data.routines[0].name}
                  </Text>
                  <Text style={[typography.caption, styles.onImageText]}>
                    {pluralize(data.routines[0].exercise_count, 'exercise')}
                    {data.routines[0].estimated_duration
                      ? ` · ~${data.routines[0].estimated_duration} min`
                      : ''}
                  </Text>
                </View>
                <Button
                  label="Start workout"
                  icon="play"
                  size="md"
                  onPress={() => router.push(`/routines/${data.routines[0].id}`)}
                />
              </WorkoutHero>
              <Button label="Start an empty workout" variant="ghost" size="sm" onPress={startEmpty} />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <WorkoutHero minHeight={heroMinHeight}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={[typography.h2, styles.onImageTitle]}>Let&apos;s get started</Text>
                  <Text style={[typography.body, styles.onImageText, { lineHeight: 21 }]}>
                    Build a routine you can reuse, or jump straight in and log as you go.
                  </Text>
                </View>
                <Button
                  label="Create a routine"
                  icon="add"
                  size="md"
                  onPress={() => router.push('/routines/builder')}
                />
              </WorkoutHero>
              <Button label="Start an empty workout" variant="secondary" onPress={startEmpty} />
            </View>
          )}

          {/* ---------------- This week ---------------- */}
          {data ? (
            <View style={{ gap: spacing.md }}>
              <SectionHeader title="This week" />
              <Card style={{ gap: spacing.md }}>
                <View style={styles.rowBetween}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>
                    {data.overview.workouts_this_week} / {weeklyTarget} workouts
                  </Text>
                  {data.overview.current_streak_days > 0 ? (
                    <Badge
                      label={`${data.overview.current_streak_days} day streak`}
                      tone="warning"
                      icon="flame"
                    />
                  ) : null}
                </View>
                <ProgressBar
                  value={data.overview.workouts_this_week}
                  max={weeklyTarget}
                  tone="accent"
                  label={`${data.overview.workouts_this_week} of ${weeklyTarget} workouts this week`}
                />
              </Card>

              <View style={[styles.statRow, { flexDirection: isWide ? 'row' : 'row' }]}>
                <StatCard
                  label="Workouts"
                  value={String(data.overview.total_workouts)}
                  icon="barbell-outline"
                />
                <StatCard
                  label="Total volume"
                  value={formatWeight(data.overview.total_volume, unit)}
                  icon="trending-up-outline"
                />
              </View>
            </View>
          ) : null}

          {/* ---------------- Recent session ---------------- */}
          {data && data.recentWorkouts.length > 0 ? (
            <View>
              <SectionHeader
                title="Last workout"
                action="See all"
                onActionPress={() => router.push('/workout/history')}
              />
              <WorkoutHistoryCard
                workout={data.recentWorkouts[0]}
                unit={unit}
                onPress={() => router.push(`/workout/${data.recentWorkouts[0].id}`)}
              />
            </View>
          ) : null}

          {/* ---------------- Recent records ---------------- */}
          {data && data.records.length > 0 ? (
            <View>
              <SectionHeader
                title="Recent personal records"
                action="Progress"
                onActionPress={() => router.push('/(tabs)/progress')}
              />
              <Card style={{ gap: spacing.md }}>
                {data.records.map((record) => (
                  <View key={record.id} style={styles.recordRow}>
                    <Ionicons name="trophy-outline" size={18} color={colors.warning} />
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
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

/**
 * Compact "Today's workout" card whose background IS the workout image.
 * A single scrim (the theme's overlay token) keeps the overlaid white text
 * readable over the image in both light and dark mode. The image is clipped
 * to rounded corners while the shadow is cast by the outer wrapper, so the
 * elevation is not swallowed by `overflow: 'hidden'` on Android.
 */
function WorkoutHero({
  children,
  minHeight,
}: {
  children: React.ReactNode;
  minHeight: number;
}) {
  const { colors, radius, spacing, elevation } = useTheme();

  return (
    <View style={[{ borderRadius: radius.lg, backgroundColor: colors.surface }, elevation.card]}>
      <ImageBackground
        source={WORKOUT_BG}
        resizeMode="cover"
        accessible={false}
        style={[styles.heroImage, { minHeight, borderRadius: radius.lg }]}
        imageStyle={{ borderRadius: radius.lg }}
      >
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
        />
        <View style={[styles.heroContent, { padding: spacing.lg, gap: spacing.md }]}>
          {children}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroImage: { overflow: 'hidden' },
  heroContent: { flex: 1, justifyContent: 'space-between' },
  onImageTitle: { color: palette.white },
  onImageText: { color: 'rgba(255, 255, 255, 0.86)' },
});
