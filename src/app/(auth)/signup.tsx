import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBar, Button, InlineError, Input, OptionGroup, Screen } from '@/components/ui';
import { experienceLabel, goalLabel } from '@/lib/format';
import {
  authErrorMessage,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
} from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services/profile';
import { useTheme } from '@/theme/ThemeProvider';
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

export default function SignUpScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);

  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const result = await signUp({ email, password, fullName });

      if (result.needsEmailConfirmation) {
        setConfirmationSent(true);
        return;
      }

      // Optional onboarding answers go straight onto the profile the
      // handle_new_user trigger just created.
      if (result.user && (goal || level)) {
        try {
          await updateProfile(result.user.id, {
            fitness_goal: goal,
            experience_level: level,
          });
        } catch {
          // Not worth blocking sign-up; editable later from Profile.
        }
      }
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmationSent) {
    return (
      <Screen>
        <AppBar title="Check your email" />
        <View style={{ gap: spacing.lg, paddingTop: spacing['3xl'] }}>
          <Text style={[typography.h1, { color: colors.text }]}>Confirm your email</Text>
          <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
            We sent a confirmation link to {email.trim()}. Open it, then come back and log in.
          </Text>
          <Button label="Go to log in" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboardAware>
      <AppBar title="Sign up" />
      <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
        <Text style={[typography.h1, { color: colors.text }]}>Create your account</Text>

        <Input
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          placeholder="Your name"
          autoComplete="name"
          textContentType="name"
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoCorrect={false}
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          helper="At least 8 characters."
          placeholder="Create a password"
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <Input
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          placeholder="Repeat your password"
          secure
          autoCapitalize="none"
          autoComplete="new-password"
        />

        <View style={{ gap: spacing.md }}>
          <Text style={[typography.caption, { color: colors.textSubtle }]}>
            Optional — you can set these later.
          </Text>

          <OptionGroup
            label="What are you training for?"
            options={GOALS.map((value) => ({ value, label: goalLabel(value) }))}
            value={goal}
            onChange={setGoal}
            allowClear={false}
          />

          <OptionGroup
            label="Experience"
            options={LEVELS.map((value) => ({ value, label: experienceLabel(value) }))}
            value={level}
            onChange={setLevel}
            allowClear={false}
          />
        </View>

        <InlineError message={formError} />

        <Button label="Create account" onPress={handleSubmit} loading={submitting} size="lg" />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Already have an account?
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')} accessibilityRole="button">
            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
              Log in
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
