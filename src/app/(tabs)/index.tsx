import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ImageBackground, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { WorkoutHistoryCard } from '@/components/workout/Cards';
import { exerciseImage } from '@/lib/exercise-images';
import { WeekStrip } from '@/components/workout/WeekStrip';
import { WorkoutCalendar } from '@/components/workout/WorkoutCalendar';
import {
  Badge,
  BrandMark,
  Button,
  Card,
  ErrorState,
  IconButton,
  InfoHint,
  LoadingState,
  Screen,
  SectionHeader,
  StatCard,
  VolumeExplainer,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import {
  daysOfWeek,
  localDateKey,
  formatRelativeDate,
  greetingForNow,
  pluralize,
  recordLabel,
} from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { useAuth } from '@/providers/AuthProvider';
import { confirmAction, notify } from '@/lib/alert';
import { useUnit } from '@/providers/SettingsProvider';
import { getRecentRecords } from '@/services/exercises';
import { getOverview } from '@/services/progress';
import { listRoutines } from '@/services/routines';
import { getRecentWorkouts, getWorkoutDays } from '@/services/workouts';
import { clearRestDay, getRestDays, markRestDay } from '@/services/rest-days';
import { useTheme } from '@/theme/ThemeProvider';

/** Compact workout hero height — a fraction of the old full-width banner card. */
const HERO_MIN_HEIGHT = 150;

export default function HomeScreen() {
  const { colors, typography, spacing, radius, elevation } = useTheme();
  const router = useRouter();
  const unit = useUnit();

  const { profile, user } = useAuth();
  const { draft, startEmptyWorkout } = useActiveWorkout();

  const { data, error, isLoading, isRefreshing, refresh, refetch } = useAsync(
    async () => {
      const week = daysOfWeek(new Date());
      const [overview, routines, recentWorkouts, records, weekDays, restDays] = await Promise.all([
        getOverview(),
        listRoutines(),
        getRecentWorkouts(1),
        getRecentRecords(3),
        getWorkoutDays(week[0], week[6]),
        getRestDays(week[0], week[6]),
      ]);
      return { overview, routines, recentWorkouts, records, weekDays, restDays };
    },
    [],
  );

  /**
   * The calendar loads its own month, so it is told to reload rather than
   * being threaded through the dashboard query above. Bumping this on focus
   * is what makes a day fill in as soon as a workout is finished.
   */
  const [calendarToken, setCalendarToken] = useState(0);
  const firstFocus = useRef(true);

  // Numbers change every time a workout is saved, so refresh on return.
  useFocusEffect(
    useCallback(() => {
      // The first focus is the initial mount, which has already loaded.
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void refresh();
      setCalendarToken((token) => token + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const displayName = (profile?.full_name?.trim() || profile?.username || '').trim();

  const startEmpty = () => {
    startEmptyWorkout();
    router.push('/workout/active');
  };

  const todayKey = localDateKey(new Date());
  const restedToday = data?.restDays.has(todayKey) ?? false;
  const [restBusy, setRestBusy] = useState(false);

  const takeRestDay = async () => {
    if (!user || restBusy) return;
    setRestBusy(true);
    try {
      await markRestDay(user.id);
      await refresh();
      setCalendarToken((token) => token + 1);
    } catch {
      notify('Could not save', 'Please try again.');
    } finally {
      setRestBusy(false);
    }
  };

  const undoRestDay = async () => {
    if (restBusy) return;
    const confirmed = await confirmAction({
      title: 'Not resting after all?',
      message: 'Today goes back to being an ordinary day. Nothing else changes.',
      confirmLabel: 'Undo rest day',
    });
    if (!confirmed) return;

    setRestBusy(true);
    try {
      await clearRestDay();
      await refresh();
      setCalendarToken((token) => token + 1);
    } catch {
      notify('Could not undo', 'Please try again.');
    } finally {
      setRestBusy(false);
    }
  };

  /**
   * A goal only exists if the user set one. `training_days` is the days they
   * chose to train; when it is empty there is no target, and the week is
   * reported as what happened rather than as a shortfall.
   */
  const weeklyGoal = profile?.training_days?.length ?? 0;

  return (
    <Screen
      bottomInset={draft ? 64 : 0}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setCalendarToken((token) => token + 1);
            void refresh();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={{ gap: spacing.lg, marginBottom: spacing.xl }}>
        <View style={styles.headerRow}>
          <BrandMark size="sm" />
          <IconButton
            icon="person-circle-outline"
            accessibilityLabel="Open your profile"
            size={30}
            color={colors.text}
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>
        <View>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            {greetingForNow()}
            {displayName ? ',' : ''}
          </Text>
          <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
            {displayName || 'Welcome'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingState message="Loading your dashboard…" />
      ) : error ? (
        <ErrorState message="Unable to load your dashboard." onRetry={refetch} />
      ) : (
        <View style={{ gap: spacing['2xl'] }}>
          {/* ---------------- Today's workout ---------------- */}
          {restedToday ? (
            <Card style={{ gap: spacing.md }}>
              <Badge label="REST DAY" tone="accent" icon="bed-outline" />
              <Text style={[typography.h2, { color: colors.text }]}>Today is recovery</Text>
              <Text style={[typography.body, { color: colors.textMuted, lineHeight: 21 }]}>
                Recovery is part of your progress — this is where the work you already did
                turns into strength.
              </Text>
              {/* Resting does not lock the day: someone who changes their
                  mind can still train, and the rest day simply goes. */}
              <Button
                label="Undo rest day"
                variant="secondary"
                icon="arrow-undo-outline"
                loading={restBusy}
                onPress={() => void undoRestDay()}
              />
            </Card>
          ) : draft ? (
            <Card style={{ gap: spacing.md }}>
              <Badge label="IN PROGRESS" tone="accent" icon="pulse" />
              <Text style={[typography.h2, { color: colors.text }]}>{draft.name}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {pluralize(draft.exercises.length, 'exercise')} · picked up where you left off
              </Text>
              <Button
                label="Resume workout"
                icon="play"
                size="lg"
                onPress={() => router.push('/workout/active')}
              />
            </Card>
          ) : data && data.routines.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {/* Compact hero: the exercise image IS the card's background, with
                  the three workout texts and the start action laid over a dark
                  scrim so they stay readable. A fraction of the old full-banner
                  card's height, so "This week" (and its streak) stay in view. */}
              <View style={[styles.hero, { borderRadius: radius.lg }, elevation.card]}>
                <ImageBackground
                  source={exerciseImage(data.routines[0].cover_exercise?.name)}
                  resizeMode="cover"
                  accessible={false}
                  style={[styles.heroImage, { minHeight: HERO_MIN_HEIGHT, borderRadius: radius.lg }]}
                  imageStyle={{ borderRadius: radius.lg }}
                >
                  <View
                    style={[StyleSheet.absoluteFill, styles.heroScrim, { borderRadius: radius.lg }]}
                  />
                  <View style={[styles.heroContent, { padding: spacing.lg, gap: spacing.md }]}>
                    <View style={{ gap: 2 }}>
                      <Text style={[typography.caption, styles.onImageMuted]}>
                        Ready for today&apos;s workout?
                      </Text>
                      <Text numberOfLines={1} style={[typography.h2, styles.onImageTitle]}>
                        {data.routines[0].name}
                      </Text>
                      <Text style={[typography.caption, styles.onImageMuted]}>
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
                  </View>
                </ImageBackground>
              </View>
              <Button label="Start an empty workout" variant="ghost" size="sm" onPress={startEmpty} />
              <Button
                label="Mark as rest day"
                variant="ghost"
                size="sm"
                icon="bed-outline"
                loading={restBusy}
                onPress={() => void takeRestDay()}
              />
            </View>
          ) : (
            <Card style={{ gap: spacing.md }}>
              <Text style={[typography.h2, { color: colors.text }]}>Let&apos;s get started</Text>
              <Text style={[typography.body, { color: colors.textMuted, lineHeight: 21 }]}>
                Build a routine you can reuse, or jump straight in and log as you go.
              </Text>
              <Button
                label="Create a routine"
                icon="add"
                size="lg"
                onPress={() => router.push('/routines/builder')}
              />
              <Button label="Start an empty workout" variant="secondary" onPress={startEmpty} />
              <Button
                label="Mark as rest day"
                variant="ghost"
                size="sm"
                icon="bed-outline"
                loading={restBusy}
                onPress={() => void takeRestDay()}
              />
            </Card>
          )}

          {/* ---------------- This week ---------------- */}
          {data ? (
            <View style={{ gap: spacing.md }}>
              <SectionHeader title="This week" />
              <Card style={{ gap: spacing.lg }}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>
                      {pluralize(data.overview.workouts_this_week, 'workout')} this week
                    </Text>
                    {weeklyGoal > 0 ? (
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        Goal: {pluralize(weeklyGoal, 'workout')}
                      </Text>
                    ) : null}
                  </View>
                  {data.overview.current_streak_days > 0 ? (
                    <Badge
                      label={`${data.overview.current_streak_days} day streak`}
                      tone="warning"
                      icon="flame"
                    />
                  ) : null}
                </View>

                <WeekStrip workoutDays={data.weekDays} restDays={data.restDays} />
              </Card>

              <View style={styles.statRow}>
                <StatCard
                  label="Workouts"
                  value={String(data.overview.total_workouts)}
                  icon="barbell-outline"
                />
                <View style={{ flex: 1, minWidth: 150 }}>
                  <StatCard
                    label="Total volume"
                    value={formatWeight(data.overview.total_volume, unit)}
                    icon="trending-up-outline"
                  />
                  {/* Volume is not self-explanatory, so it carries its own
                      definition rather than being a number nobody can read. */}
                  <View style={styles.statInfo}>
                    <InfoHint title="What is Volume?">
                      <VolumeExplainer />
                    </InfoHint>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* ---------------- Workout calendar ---------------- */}
          <View>
            <SectionHeader
              title="Workout calendar"
              action="History"
              onActionPress={() => router.push('/workout/history')}
            />
            <WorkoutCalendar refreshToken={calendarToken} />
          </View>

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

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statInfo: { position: 'absolute', top: 2, right: 2 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Workout hero: dark fallback behind the image so overlaid white text stays
  // readable even for an exercise with no bundled photo. The image is clipped
  // to rounded corners by heroImage; the shadow is cast by the outer wrapper.
  hero: { backgroundColor: '#0B1017' },
  heroImage: { overflow: 'hidden' },
  heroScrim: { backgroundColor: 'rgba(5, 7, 11, 0.55)', pointerEvents: 'none' },
  heroContent: { flex: 1, justifyContent: 'space-between' },
  onImageTitle: { color: '#FFFFFF' },
  onImageMuted: { color: 'rgba(255, 255, 255, 0.88)' },
});
