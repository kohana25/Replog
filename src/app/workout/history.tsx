import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { RestDayCard, WorkoutHistoryCard } from '@/components/workout/Cards';
import { AppBar, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { dataErrorMessage } from '@/lib/validation';
import { useUnit } from '@/providers/SettingsProvider';
import { listWorkoutHistory } from '@/services/workouts';
import { listRecentRestDays } from '@/services/rest-days';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';
import type { WorkoutSummary } from '@/types/models';
import type { RestDayRow } from '@/types/database';
import { localDateKey } from '@/lib/format';

export default function WorkoutHistoryScreen() {
  const { colors, spacing } = useTheme();
  const { gutter, contentMaxWidth } = useResponsive();
  const router = useRouter();
  const unit = useUnit();

  const [items, setItems] = useState<WorkoutSummary[]>([]);
  const [restDays, setRestDays] = useState<RestDayRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, mode: 'replace' | 'append') => {
    try {
      const result = await listWorkoutHistory(nextPage);
      setItems((current) => (mode === 'replace' ? result.items : [...current, ...result.items]));
      // Rest days are few and not paginated; they are merged into whatever
      // stretch of workouts is currently on screen.
      if (mode === 'replace') setRestDays(await listRecentRestDays(90));
      setHasMore(result.hasMore);
      setPage(nextPage);
      setError(null);
    } catch (caught) {
      setError(dataErrorMessage(caught, 'Unable to load workouts.'));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await load(0, 'replace');
      setIsLoading(false);
    })();
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load(0, 'replace');
    setIsRefreshing(false);
  };

  // Pagination keeps the first screen fast even after a year of training.
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    await load(page + 1, 'append');
    setIsLoadingMore(false);
  };

  /**
   * One list, newest first, of everything the user did — sessions and the
   * days they chose to recover. Rest days older than the oldest loaded
   * workout are held back so that "load more" keeps revealing history in
   * order rather than dropping older rest days in above newer workouts.
   */
  type Entry =
    | { kind: 'workout'; key: string; date: string; workout: WorkoutSummary }
    | { kind: 'rest'; key: string; date: string; restDay: RestDayRow };

  const entries: Entry[] = React.useMemo(() => {
    const workouts: Entry[] = items.map((w) => ({
      kind: 'workout',
      key: w.id,
      date: w.completed_at ? localDateKey(w.completed_at) : '',
      workout: w,
    }));

    const oldestLoaded = workouts.length
      ? workouts[workouts.length - 1].date
      : hasMore
        ? localDateKey(new Date())
        : '';

    const rests: Entry[] = restDays
      .filter((r) => !hasMore || r.rest_on >= oldestLoaded)
      .map((r) => ({ kind: 'rest', key: `rest-${r.id}`, date: r.rest_on, restDay: r }));

    return [...workouts, ...rests].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [items, restDays, hasMore]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Workout history" />

      {isLoading ? (
        <LoadingState message="Loading your history…" />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.key}
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingVertical: spacing.lg,
            gap: spacing.md,
            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
          }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="Nothing logged yet"
              message="Start your first workout — or mark a rest day — and your history will appear here."
              actionLabel="Start a workout"
              onAction={() => router.replace('/(tabs)/workout')}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <Button
                label={isLoadingMore ? 'Loading…' : 'Load more'}
                variant="secondary"
                loading={isLoadingMore}
                onPress={() => void loadMore()}
              />
            ) : null
          }
          renderItem={({ item: entry }) =>
            entry.kind === 'rest' ? (
              <RestDayCard restDay={entry.restDay} />
            ) : (
              <WorkoutHistoryCard
                workout={entry.workout}
                unit={unit}
                onPress={() => router.push(`/workout/${entry.workout.id}`)}
              />
            )
          }
        />
      )}
    </View>
  );
}
