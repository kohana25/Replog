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
  normalizeUsername,
  validateConfirmPassword,
  validatePassword,
  validateUsername,
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
 * Users pick a username and a password — no email, no Google sign-in, and no
 * verification step. The account is created and the session is returned in one
 * call, so sign-up lands straight on Home. (The Supabase project must have
 * "Confirm email" disabled; see README.)
 */
export default function SignUpScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { signUp, setProfile } = useAuth();

  const [username, setUsername] = useState('');
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
      username: validateUsername(username),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    const handle = normalizeUsername(username);

    setSubmitting(true);
    try {
      const result = await signUp({ username: handle, password });

      if (result.alreadyTaken) {
        setErrors((current) => ({
          ...current,
          username: 'That username is already taken. Please choose another.',
        }));
        return;
      }

      if (!result.session || !result.user) {
        // No session means the Supabase project still requires email
        // confirmation — which can't work without a real inbox.
        setFormError('We could not complete sign-up. Please try again.');
        return;
      }

      // Persist the username (and optional onboarding choices) onto the profile
      // row the handle_new_user() trigger created, so it shows as @handle.
      try {
        const updated = await updateProfile(result.user.id, {
          username: handle,
          fitness_goal: goal,
          experience_level: level,
        });
        setProfile(updated);
      } catch (caught) {
        const code = (caught as { code?: string })?.code;
        if (code === '23505') {
          setErrors((current) => ({
            ...current,
            username: 'That username is already taken. Please choose another.',
          }));
          return;
        }
        // A non-fatal profile write: the account exists and the session is
        // live, so let the root layout route to Home. The username is editable
        // from Profile.
      }
      // The root layout routes to Home as soon as the session lands.
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
          label="Username"
          value={username}
          onChangeText={setUsername}
          error={errors.username}
          helper="This is how you'll log in and how your name shows in the app."
          placeholder="yourname"
          autoCapitalize="none"
          autoComplete="username-new"
          textContentType="username"
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
