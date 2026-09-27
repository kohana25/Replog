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
 * The account is created here and Supabase emails its standard confirmation
 * link to the address. The next screen says so; the user opens the link and
 * then logs in with the same email and password. No Google sign-in is
 * involved — the Gmail address is only where the link is delivered.
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

  /**
   * The requirement checklist belongs to the password field, so it is shown
   * only while that field is being edited. Focusing any other input blurs the
   * password, which hides it again.
   */
  const [passwordFocused, setPasswordFocused] = useState(false);

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
      email: validateEmail(email),
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
      const result = await signUp({ email, password, fullName });

      if (result.alreadyRegistered) {
        setErrors((current) => ({
          ...current,
          email: 'An account with this email already exists. Please log in instead.',
        }));
        return;
      }

      if (result.needsEmailConfirmation) {
        router.replace({
          pathname: '/(auth)/confirm-email',
          params: { email: email.trim().toLowerCase() },
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
          onFocus={leavePassword}
          error={errors.fullName}
          placeholder="Your name"
          autoComplete="name"
          textContentType="name"
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          onFocus={leavePassword}
          error={errors.email}
          helper="Use your Gmail address — that is where your confirmation link is sent."
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
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            error={errors.password}
            placeholder="Create a password"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {/* Only while the password field is being edited. */}
          {passwordFocused ? <PasswordRequirements password={password} /> : null}
        </View>

        <Input
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
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
