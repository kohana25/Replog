import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { AppBar, Button, Card, InlineError, OptionGroup, Screen, SectionHeader } from '@/components/ui';
import { formatClock } from '@/lib/format';
import { dataErrorMessage } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { updateProfile } from '@/services/profile';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference, UnitPreference } from '@/types/database';

const REST_OPTIONS = [30, 60, 90, 120, 180];

/**
 * Settings are written locally first (so the UI responds immediately) and
 * then synced to the profile so they follow the user to another device.
 */
export default function SettingsScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { user, profile, setProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const persist = async (patch: {
    unit?: UnitPreference;
    theme?: ThemePreference;
    defaultRestSeconds?: number;
  }) => {
    const next = await updateSettings(patch);
    setError(null);

    if (!user) return;
    try {
      const updated = await updateProfile(user.id, {
        unit_preference: next.unit,
        theme_preference: next.theme,
        default_rest_seconds: next.defaultRestSeconds,
      });
      setProfile(updated);
    } catch (caught) {
      setError(
        `${dataErrorMessage(caught, 'Could not sync this setting.')} It still applies on this device.`,
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBar title="Settings" />
      <Screen>
        <View style={{ gap: spacing['2xl'] }}>
          <View>
            <SectionHeader title="Units" />
            <Card style={{ gap: spacing.md }}>
              <OptionGroup
                options={[
                  { value: 'kg' as UnitPreference, label: 'Kilograms (kg)' },
                  { value: 'lb' as UnitPreference, label: 'Pounds (lb)' },
                ]}
                value={settings.unit}
                onChange={(value) => value && void persist({ unit: value })}
              />
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Weights are always stored in kilograms and converted for display, so switching
                units never changes what you have already logged.
              </Text>
            </Card>
          </View>

          <View>
            <SectionHeader title="Appearance" />
            <Card>
              <OptionGroup
                options={[
                  { value: 'system' as ThemePreference, label: 'Match device' },
                  { value: 'light' as ThemePreference, label: 'Light' },
                  { value: 'dark' as ThemePreference, label: 'Dark' },
                ]}
                value={settings.theme}
                onChange={(value) => value && void persist({ theme: value })}
              />
            </Card>
          </View>

          <View>
            <SectionHeader title="Default rest timer" />
            <Card style={{ gap: spacing.md }}>
              <OptionGroup
                options={REST_OPTIONS.map((seconds) => ({
                  value: String(seconds),
                  label: formatClock(seconds),
                }))}
                value={String(settings.defaultRestSeconds)}
                onChange={(value) =>
                  value && void persist({ defaultRestSeconds: Number(value) })
                }
              />
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Used for new routine exercises. Each exercise in a routine can override it.
              </Text>
            </Card>
          </View>

          <View>
            <SectionHeader title="Account" />
            <Card style={{ gap: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Signed in as</Text>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{user?.email}</Text>
              <Text style={[typography.caption, { color: colors.textSubtle }]}>
                Member since {profile ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </Text>
            </Card>
          </View>

          <InlineError message={error} />

          <View>
            <SectionHeader title="Privacy" />
            <Card>
              <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
                Your workouts, routines and measurements are visible only to your account. The
                database enforces this with row-level security, not just the app.
              </Text>
            </Card>
          </View>

          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    </View>
  );
}
