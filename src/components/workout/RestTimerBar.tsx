import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { IconButton, ProgressBar } from '@/components/ui';
import { formatClock } from '@/lib/format';
import { useTick } from '@/hooks/useTick';
import { useTheme } from '@/theme/ThemeProvider';
import type { RestTimerState } from '@/types/models';

/**
 * Rest countdown.
 *
 * The remaining time is recomputed from `endsAt` on every tick rather than
 * decremented in state, so the timer stays accurate through re-renders and
 * across the app being backgrounded.
 */
export function RestTimerBar({
  timer,
  onAdjust,
  onPause,
  onResume,
  onSkip,
}: {
  timer: RestTimerState;
  onAdjust: (delta: number) => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const isPaused = timer.pausedRemaining !== null;
  const now = useTick(500, timer.endsAt !== null);

  const remaining = isPaused
    ? (timer.pausedRemaining ?? 0)
    : timer.endsAt
      ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
      : 0;

  const finished = remaining <= 0 && !isPaused;
  const notified = useRef(false);

  useEffect(() => {
    if (finished && !notified.current) {
      notified.current = true;
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    if (!finished) notified.current = false;
  }, [finished]);

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        finished ? 'Rest complete' : `Resting, ${remaining} seconds remaining`
      }
      style={{
        backgroundColor: finished ? colors.accentSoft : colors.surfaceRaised,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.micro, { color: colors.textMuted }]}>
            {finished ? 'REST COMPLETE' : isPaused ? 'REST PAUSED' : 'REST'}
          </Text>
          <Text
            style={[
              typography.metric,
              { color: finished ? colors.accent : colors.text, fontVariant: ['tabular-nums'] },
            ]}
          >
            {formatClock(remaining)}
          </Text>
        </View>

        <View
          style={[styles.controls, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
        >
          <IconButton
            icon="remove"
            onPress={() => onAdjust(-30)}
            accessibilityLabel="Subtract 30 seconds of rest"
            color={colors.text}
          />
          <IconButton
            icon="add"
            onPress={() => onAdjust(30)}
            accessibilityLabel="Add 30 seconds of rest"
            color={colors.text}
          />
          <IconButton
            icon={isPaused ? 'play' : 'pause'}
            onPress={isPaused ? onResume : onPause}
            accessibilityLabel={isPaused ? 'Resume rest timer' : 'Pause rest timer'}
            color={colors.text}
          />
          <IconButton
            icon="play-skip-forward"
            onPress={onSkip}
            accessibilityLabel="Skip rest"
            color={colors.text}
          />
        </View>
      </View>

      <ProgressBar
        value={timer.totalSeconds - remaining}
        max={Math.max(1, timer.totalSeconds)}
        tone={finished ? 'accent' : 'primary'}
        label={`Rest progress, ${remaining} seconds left`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
});
