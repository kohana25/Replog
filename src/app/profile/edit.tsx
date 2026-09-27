import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppBar, Button, InlineError, Input, OptionGroup, Screen } from '@/components/ui';
import { experienceLabel, goalLabel } from '@/lib/format';
import { parseNumericInput, parseWeightInput, weightInputValue } from '@/lib/units';
import { dataErrorMessage, validateFullName } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { updateProfile } from '@/services/profile';
import type { ExperienceLevel, FitnessGoal } from '@/types/database';

const GOALS: FitnessGoal[] = [
  'build_muscle',
  'gain_strength',
  'lose_weight',
  'improve_fitness',
  'maintain_fitness',
  'general_wellness',
];

const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, user, setProfile } = useAuth();
  const { settings } = useSettings();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [goal, setGoal] = useState<FitnessGoal | null>(profile?.fitness_goal ?? null);
  const [level, setLevel] = useState<ExperienceLevel | null>(profile?.experience_level ?? null);
  const [height, setHeight] = useState(
    profile?.height_cm != null ? String(profile.height_cm) : '',
  );
  const [weight, setWeight] = useState(weightInputValue(profile?.weight_kg ?? null, settings.unit));

  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const error = validateFullName(fullName);
    setNameError(error);
    setFormError(null);
    if (error || !user) return;

    setSaving(true);
    try {
      const updated = await updateProfile(user.id, {
        full_name: fullName.trim(),
        username: username.trim() || null,
        fitness_goal: goal,
        experience_level: level,
        height_cm: parseNumericInput(height),
        weight_kg: parseWeightInput(weight, settings.unit),
      });
      setProfile(updated);
      router.back();
    } catch (caught) {
      const message = dataErrorMessage(caught, 'Could not save your profile.');
      setFormError(message === 'That already exists.' ? 'That username is taken.' : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBar title="Edit profile" />
      <Screen keyboardAware>
        <View style={{ gap: 20 }}>
          <Input label="Full name" value={fullName} onChangeText={setFullName} error={nameError} />

          <Input
            label="Username (optional)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="yourname"
          />

          <OptionGroup
            label="Fitness goal"
            options={GOALS.map((value) => ({ value, label: goalLabel(value) }))}
            value={goal}
            onChange={setGoal}
          />

          <OptionGroup
            label="Experience level"
            options={LEVELS.map((value) => ({ value, label: experienceLabel(value) }))}
            value={level}
            onChange={setLevel}
          />

          <Input
            label="Height"
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            suffix="cm"
            placeholder="170"
          />

          <Input
            label="Body weight"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            suffix={settings.unit}
            placeholder="70"
          />

          <InlineError message={formError} />

          <Button label="Save changes" size="lg" loading={saving} onPress={handleSave} />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    </View>
  );
}
