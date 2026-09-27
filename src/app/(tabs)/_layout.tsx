import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatClock } from '@/lib/format';
import { useElapsedSeconds } from '@/hooks/useTick';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: 'Workout',
            tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: 'Exercises',
            tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>

      <ActiveWorkoutBanner bottomOffset={56 + insets.bottom} />
    </View>
  );
}

/**
 * Persistent "workout in progress" strip. Without this it is far too easy to
 * wander off to another tab mid-session and lose track of the running clock.
 */
function ActiveWorkoutBanner({ bottomOffset }: { bottomOffset: number }) {
  const { colors, typography, radius } = useTheme();
  const router = useRouter();
  const { draft } = useActiveWorkout();
  const elapsed = useElapsedSeconds(draft?.startedAt ?? null);

  if (!draft) return null;

  const completedSets = draft.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length,
    0,
  );

  return (
    <Pressable
      onPress={() => router.push('/workout/active')}
      accessibilityRole="button"
      accessibilityLabel={`Workout in progress: ${draft.name}, ${formatClock(elapsed)} elapsed. Tap to return.`}
      style={({ pressed }) => [
        styles.banner,
        {
          bottom: bottomOffset + 8,
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Ionicons name="pulse" size={18} color={colors.onPrimary} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.onPrimary }]}>
          {draft.name}
        </Text>
        <Text style={[typography.micro, { color: colors.onPrimary, opacity: 0.85 }]}>
          {formatClock(elapsed)} · {completedSets} sets logged
        </Text>
      </View>
      <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: '700' }]}>
        Resume
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
