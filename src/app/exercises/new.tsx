import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppBar, Button, InlineError, Input, OptionGroup, Screen } from '@/components/ui';
import { equipmentLabel, muscleLabel } from '@/lib/format';
import { dataErrorMessage, validateRequiredText } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { createCustomExercise } from '@/services/exercises';
import type { Equipment, ExerciseType, MuscleGroup } from '@/types/database';

const MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'cardio',
  'full_body',
];

const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'resistance_band',
  'bodyweight',
  'other',
];

const TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'strength', label: 'Weight & reps' },
  { value: 'bodyweight', label: 'Bodyweight reps' },
  { value: 'duration', label: 'Timed hold' },
  { value: 'cardio', label: 'Cardio' },
];

export default function NewExerciseScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [type, setType] = useState<ExerciseType>('strength');
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const error = validateRequiredText(name, 'Exercise name');
    setNameError(error);
    setFormError(null);
    if (error || !user) return;

    setSaving(true);
    try {
      const created = await createCustomExercise(user.id, {
        name,
        primaryMuscle: muscle,
        equipment,
        exerciseType: type,
        notes,
      });
      router.replace(`/exercises/${created.id}`);
    } catch (caught) {
      setFormError(
        dataErrorMessage(caught, 'Could not save this exercise.') ===
        'That already exists.'
          ? 'You already have an exercise with that name.'
          : dataErrorMessage(caught, 'Could not save this exercise.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBar title="New exercise" />
      <Screen keyboardAware>
        <View style={{ gap: 20 }}>
          <Input
            label="Exercise name"
            value={name}
            onChangeText={setName}
            error={nameError}
            placeholder="Landmine press"
          />

          <OptionGroup
            label="Primary muscle"
            options={MUSCLES.map((value) => ({ value, label: muscleLabel(value) }))}
            value={muscle}
            onChange={(value) => value && setMuscle(value)}
          />

          <OptionGroup
            label="Equipment"
            options={EQUIPMENT.map((value) => ({ value, label: equipmentLabel(value) }))}
            value={equipment}
            onChange={(value) => value && setEquipment(value)}
          />

          <OptionGroup
            label="How is it tracked?"
            options={TYPES}
            value={type}
            onChange={(value) => value && setType(value)}
          />

          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Setup cues, machine number, anything useful"
            multiline
          />

          <InlineError message={formError} />

          <Button label="Save exercise" size="lg" loading={saving} onPress={handleSave} />
        </View>
      </Screen>
    </View>
  );
}
