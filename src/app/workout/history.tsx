import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { WorkoutHistoryCard } from '@/components/workout/Cards';
import { AppBar, Button, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { dataErrorMessage } from '@/lib/validation';
import { useUnit } from '@/providers/SettingsProvider';
import { listWorkoutHistory } from '@/services/workouts';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';
import type { WorkoutSummary } from '@/types/models';

export default function WorkoutHistoryScreen() {
  const { colors, spacing } = useTheme();
  const { gutter, contentMaxWidth } = useResponsive();
  const router = useRouter();
  const unit = useUnit();

  const [items, setItems] = useState<WorkoutSummary[]>([]);
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Workout history" />

      {isLoading ? (
        <LoadingState message="Loading your history…" />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
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
              title="No workouts yet"
              message="Start your first workout and your training history will appear here."
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
          renderItem={({ item }) => (
            <WorkoutHistoryCard
              workout={item}
              unit={unit}
              onPress={() => router.push(`/workout/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
