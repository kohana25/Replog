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
import {
  authErrorMessage,
  sanitizeUsername,
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
 * An account is a username and a password. There is no email address, so
 * there is no confirmation step: the account works the moment it is created
 * and the root layout shows Home straight away. It also means a forgotten
 * password cannot be reset, which the screen says before anyone commits to
 * one.
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

      // There is nothing to confirm, so the session already exists and the
      // root layout is about to show Home.
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
          onChangeText={(next) => setUsername(sanitizeUsername(next))}
          onFocus={leavePassword}
          error={errors.username}
          helper="This is how you log in, and how others see you. Letters, numbers and underscores."
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

        {/* Said before they commit to a password, not after they forget it. */}
        <Text
          style={[
            typography.caption,
            { color: colors.textSubtle, textAlign: 'center', lineHeight: 18 },
          ]}
        >
          There is no email on your account, so a forgotten password cannot be reset. Keep it
          somewhere safe.
        </Text>

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
