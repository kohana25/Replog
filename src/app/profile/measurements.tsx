import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import {
  AppBar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  InlineError,
  Input,
  LoadingState,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { confirmAction, notify } from '@/lib/alert';
import { formatRelativeDate } from '@/lib/format';
import { parseNumericInput, parseWeightInput, weightInputValue } from '@/lib/units';
import { dataErrorMessage } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { deleteMeasurement, listMeasurements, saveMeasurement } from '@/services/measurements';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/useResponsive';

/** Optional tracking — nothing else in the app depends on these numbers. */
export default function MeasurementsScreen() {
  const { colors, typography, spacing } = useTheme();
  const { width, gutter } = useResponsive();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();

  const { data, error, isLoading, refetch } = useAsync(() => listMeasurements(), []);

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) return;
    const weightKg = parseWeightInput(weight, settings.unit);
    const fat = parseNumericInput(bodyFat);
    const waistCm = parseNumericInput(waist);

    if (weightKg === null && fat === null && waistCm === null) {
      setFormError('Enter at least one measurement.');
      return;
    }
    if (fat !== null && fat > 100) {
      setFormError('Body fat percentage must be 100 or less.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await saveMeasurement(user.id, {
        measuredOn: new Date().toISOString().slice(0, 10),
        weightKg,
        bodyFatPercentage: fat,
        chestCm: null,
        waistCm,
        armsCm: null,
        thighsCm: null,
      });
      setWeight('');
      setBodyFat('');
      setWaist('');
      await refetch();
    } catch (caught) {
      setFormError(dataErrorMessage(caught, 'Could not save that entry.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete entry?',
      message: 'This measurement will be removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteMeasurement(id);
      await refetch();
    } catch {
      notify('Could not delete', 'Please try again.');
    }
  };

  // Oldest-first for the chart; the list below stays newest-first.
  const weightPoints = [...(data ?? [])]
    .filter((entry) => entry.weight_kg != null)
    .reverse()
    .map((entry) => ({
      label: formatRelativeDate(entry.measured_on),
      value: Number(weightInputValue(entry.weight_kg, settings.unit)) || 0,
    }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Body measurements" />

      <Screen keyboardAware>
        <View style={{ gap: spacing['2xl'] }}>
          <Card style={{ gap: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text }]}>Log today</Text>
            <View style={styles.fieldRow}>
              <Input
                containerStyle={{ flex: 1 }}
                label="Weight"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                suffix={settings.unit}
                placeholder="—"
              />
              <Input
                containerStyle={{ flex: 1 }}
                label="Body fat"
                value={bodyFat}
                onChangeText={setBodyFat}
                keyboardType="decimal-pad"
                suffix="%"
                placeholder="—"
              />
            </View>
            <Input
              label="Waist"
              value={waist}
              onChangeText={setWaist}
              keyboardType="decimal-pad"
              suffix="cm"
              placeholder="—"
            />
            <InlineError message={formError} />
            <Button label="Save entry" loading={saving} onPress={handleSave} />
            <Text style={[typography.caption, { color: colors.textSubtle }]}>
              One entry per day — saving again today updates it.
            </Text>
          </Card>

          {isLoading ? (
            <LoadingState message="Loading measurements…" />
          ) : error ? (
            <ErrorState message="Unable to load measurements." onRetry={refetch} />
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              icon="body-outline"
              title="No measurements yet"
              message="These are entirely optional — the workout tracker works fine without them."
            />
          ) : (
            <>
              {weightPoints.length >= 2 ? (
                <View>
                  <SectionHeader title="Body weight trend" />
                  <Card>
                    <LineChart
                      points={weightPoints}
                      width={Math.min(width - gutter * 2 - 34, 520)}
                      unitSuffix={` ${settings.unit}`}
                    />
                  </Card>
                </View>
              ) : null}

              <View>
                <SectionHeader title="History" />
                <View style={{ gap: spacing.sm }}>
                  {data?.map((entry) => (
                    <Card key={entry.id}>
                      <View style={styles.entryRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[typography.bodyStrong, { color: colors.text }]}>
                            {formatRelativeDate(entry.measured_on)}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textMuted }]}>
                            {[
                              entry.weight_kg != null
                                ? `${weightInputValue(entry.weight_kg, settings.unit)} ${settings.unit}`
                                : null,
                              entry.body_fat_percentage != null
                                ? `${entry.body_fat_percentage}% fat`
                                : null,
                              entry.waist_cm != null ? `waist ${entry.waist_cm} cm` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </View>
                        <IconButton
                          icon="trash-outline"
                          size={18}
                          color={colors.danger}
                          onPress={() => void handleDelete(entry.id)}
                          accessibilityLabel={`Delete entry from ${formatRelativeDate(entry.measured_on)}`}
                        />
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            </>
          )}

          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', gap: 12 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
