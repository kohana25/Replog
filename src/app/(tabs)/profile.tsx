import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, ScreenHeading, SectionHeader } from '@/components/ui';
import { experienceLabel, goalLabel, initialsFor } from '@/lib/format';
import { cmToDisplay, formatWeight } from '@/lib/units';
import { accountEmailToUsername } from '@/lib/username';
import { useActiveWorkout } from '@/providers/ActiveWorkoutProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

export default function ProfileScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const { settings } = useSettings();
  const { draft, discardWorkout } = useActiveWorkout();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Log out?',
      draft
        ? 'You have a workout in progress. Logging out will discard it. Your saved workouts stay safe.'
        : 'Your workouts and routines stay saved in your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              if (draft) discardWorkout();
              await signOut();
            } catch {
              Alert.alert('Could not log out', 'Please try again.');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  // The username is the account's identifier, so it is the fallback whenever
  // no display name has been set.
  const accountUsername = profile?.username ?? accountEmailToUsername(user?.email);
  const name = profile?.full_name?.trim() || accountUsername || 'Your profile';

  return (
    <Screen bottomInset={draft ? 64 : 0}>
      <ScreenHeading title="Profile" />

      <View style={{ gap: spacing['2xl'] }}>
        <Card style={{ gap: spacing.lg }}>
          <View style={styles.identity}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: radius.pill,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[typography.h2, { color: colors.primary }]}>
                {initialsFor(profile?.full_name ?? accountUsername)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[typography.h2, { color: colors.text }]}>
                {name}
              </Text>
              <Text numberOfLines={1} style={[typography.caption, { color: colors.textMuted }]}>
                {accountUsername ? `@${accountUsername}` : 'No username'}
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <DetailRow label="Goal" value={goalLabel(profile?.fitness_goal ?? null)} />
            <DetailRow label="Experience" value={experienceLabel(profile?.experience_level ?? null)} />
            <DetailRow
              label="Height"
              value={cmToDisplay(profile?.height_cm ?? null, settings.unit)}
            />
            <DetailRow
              label="Weight"
              value={
                profile?.weight_kg != null ? formatWeight(profile.weight_kg, settings.unit) : '—'
              }
            />
          </View>

          <Button
            label="Edit profile"
            variant="secondary"
            icon="create-outline"
            onPress={() => router.push('/profile/edit')}
          />
        </Card>

        <View>
          <SectionHeader title="Settings" />
          <Card padded={false}>
            <MenuRow
              icon="options-outline"
              label="App settings"
              hint={`${settings.unit.toUpperCase()} · ${settings.theme} theme`}
              onPress={() => router.push('/profile/settings')}
            />
            <MenuRow
              icon="body-outline"
              label="Body measurements"
              onPress={() => router.push('/profile/measurements')}
            />
            <MenuRow
              icon="time-outline"
              label="Workout history"
              onPress={() => router.push('/workout/history')}
              last
            />
          </Card>
        </View>

        <Button
          label="Log out"
          variant="secondary"
          icon="log-out-outline"
          loading={signingOut}
          onPress={handleSignOut}
        />

        <Text style={[typography.caption, { color: colors.textSubtle, textAlign: 'center' }]}>
          RepLog · your data is private to your account
        </Text>
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      style={({ pressed }) => [
        styles.menuRow,
        {
          paddingHorizontal: spacing.lg,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{label}</Text>
      {hint ? <Text style={[typography.caption, { color: colors.textSubtle }]}>{hint}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: MIN_TOUCH_TARGET + 8,
  },
});
