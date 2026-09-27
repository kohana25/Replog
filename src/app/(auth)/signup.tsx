import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  AppBar,
  Button,
  InlineError,
  Input,
  OptionGroup,
  PasswordRequirements,
  Screen,
} from '@/components/ui';
import { experienceLabel, goalLabel } from '@/lib/format';
import {
  authErrorMessage,
  isPasswordValid,
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

/**
 * Registration against the app's own Supabase Auth instance.
 *
 * The account is created here, a 6-digit code is emailed to the Gmail address,
 * and the verification screen exchanges that code for a session. There is no
 * Google sign-in: the Gmail address is only where the code is delivered.
 */
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

  const passwordComplete = isPasswordValid(password);

  const handleSubmit = async () => {
    // The button is disabled while a request is in flight; this is the guard
    // for the keyboard's return key arriving on the same frame as a tap.
    if (submitting) return;

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

      if (result.alreadyRegistered) {
        setErrors((current) => ({
          ...current,
          email: 'An account with this email already exists. Please log in instead.',
        }));
        return;
      }

      if (result.needsEmailConfirmation) {
        // Straight to the code screen — verifying is what logs the user in,
        // so registration never detours via the login page.
        router.replace({
          pathname: '/(auth)/verify-email',
          params: {
            email: email.trim().toLowerCase(),
            ...(goal ? { goal } : {}),
            ...(level ? { level } : {}),
          },
        });
        return;
      }

      // Email confirmation is switched off in the Supabase project, so the
      // session already exists and the root layout is about to show Home.
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

  return (
    <Screen keyboardAware>
      <AppBar title="Sign up" />
      <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
        <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
          Create your account
        </Text>

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
          helper="Use your Gmail address — that is where your code is sent."
          placeholder="you@gmail.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoCorrect={false}
        />

        <View style={{ gap: spacing.md }}>
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            placeholder="Create a password"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <PasswordRequirements password={password} />
        </View>

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

        <Button
          label="Create account"
          onPress={handleSubmit}
          loading={submitting}
          loadingLabel="Creating your account…"
          // Nothing incomplete can be submitted, and nothing can be submitted
          // twice: this is half of why spurious rate-limit errors appeared.
          disabled={!passwordComplete}
          accessibilityHint={
            passwordComplete ? undefined : 'Complete every password requirement to continue.'
          }
          size="lg"
        />

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
