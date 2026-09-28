import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';

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
import { stripUsernameSpaces, USERNAME_MAX_LENGTH } from '@/lib/username';
import {
  authErrorMessage,
  stripPasswordSpaces,
  validateConfirmPassword,
  validateFullName,
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
 * The user picks a username and a password. Supabase hashes the password and
 * issues the session immediately — there is nothing to verify, no email, and
 * no Google sign-in — so a new account goes straight to Home.
 */
export default function SignUpScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);

  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * The requirement checklist belongs to the password field, so it appears
   * only once that field is being edited *and* has something in it — never on
   * an untouched form. Focusing any other input blurs the password, which
   * hides it again.
   */
  const [passwordFocused, setPasswordFocused] = useState(false);
  const showPasswordRequirements = passwordFocused && password.length > 0;

  /** Focusing another text field. Blur alone would do it; this is immediate. */
  const leavePassword = () => setPasswordFocused(false);

  /**
   * Chips are not text inputs, so tapping one does not move focus by itself
   * (the ScrollView keeps taps from dismissing the keyboard). Dismissing it
   * explicitly blurs the password field, which is what hides the checklist.
   */
  const leavePasswordForChips = () => {
    Keyboard.dismiss();
    setPasswordFocused(false);
  };

  const handleSubmit = async () => {
    // The button shows a spinner while a request is in flight; this is the
    // guard for the keyboard's return key arriving on the same frame as a tap.
    if (submitting) return;

    const nextErrors = {
      fullName: validateFullName(fullName),
      username: validateUsername(username),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(null);
    // An invalid password can never be submitted: validatePassword() names
    // whichever requirements are still missing and the request is not sent.
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const result = await signUp({ username, password, fullName });

      if (result.usernameTaken) {
        setErrors((current) => ({
          ...current,
          username: 'That username is already taken. Please choose another.',
        }));
        return;
      }

      // The session exists from here, and the root layout is about to show
      // Home, so the onboarding answers can be written to the profile row the
      // sign-up trigger just created.
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
          onFocus={leavePassword}
          error={errors.fullName}
          placeholder="Your name"
          autoComplete="name"
          textContentType="name"
        />

        <Input
          label="Username"
          value={username}
          // A username cannot contain a space, so one is never let in rather
          // than being rejected after the fact.
          onChangeText={(next) => setUsername(stripUsernameSpaces(next))}
          onFocus={leavePassword}
          error={errors.username}
          helper="This is what you will log in with. Letters, numbers and underscores."
          placeholder="yourname"
          autoCapitalize="none"
          autoComplete="username-new"
          textContentType="username"
          autoCorrect={false}
          maxLength={USERNAME_MAX_LENGTH}
        />

        <View style={{ gap: spacing.md }}>
          <Input
            label="Password"
            value={password}
            // Whitespace never makes it into the value, so a space cannot be
            // typed, pasted or autofilled into a password.
            onChangeText={(next) => setPassword(stripPasswordSpaces(next))}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            error={errors.password}
            placeholder="Create a password"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {/* Only once the user is actually entering a password. */}
          {showPasswordRequirements ? <PasswordRequirements password={password} /> : null}
        </View>

        <Input
          label="Confirm password"
          value={confirm}
          onChangeText={(next) => setConfirm(stripPasswordSpaces(next))}
          onFocus={leavePassword}
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
            onChange={(next) => {
              leavePasswordForChips();
              setGoal(next);
            }}
            allowClear={false}
          />

          <OptionGroup
            label="Experience"
            options={LEVELS.map((value) => ({ value, label: experienceLabel(value) }))}
            value={level}
            onChange={(next) => {
              leavePasswordForChips();
              setLevel(next);
            }}
            allowClear={false}
          />
        </View>

        <InlineError message={formError} />

        <Button
          label="Create account"
          onPress={handleSubmit}
          loading={submitting}
          loadingLabel="Creating your account…"
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
