import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { AppBar, Button, InlineError, Input, LoadingState, Screen } from '@/components/ui';
import {
  authErrorMessage,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { updatePassword, verifyRecoveryToken } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Handles both ways in:
 *  1. The user opened the emailed deep link, which carries `token_hash`.
 *  2. The user typed the 6-digit code from the email by hand.
 *
 * Either way we exchange the token for a short-lived recovery session before
 * allowing a password change — the app never sees the old password.
 */
export default function ResetPasswordScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { isRecovering, clearRecovery, isAuthenticated } = useAuth();

  const params = useLocalSearchParams<{ token_hash?: string; type?: string; email?: string }>();

  const [verifying, setVerifying] = useState(Boolean(params.token_hash));
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const attempted = useRef(false);

  useEffect(() => {
    if (!params.token_hash || attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        await verifyRecoveryToken(params.token_hash as string);
        setVerified(true);
      } catch (caught) {
        setFormError(authErrorMessage(caught));
      } finally {
        setVerifying(false);
      }
    })();
  }, [params.token_hash]);

  // A PASSWORD_RECOVERY event means Supabase already established the session.
  useEffect(() => {
    if (isRecovering && isAuthenticated) setVerified(true);
  }, [isRecovering, isAuthenticated]);

  const handleVerifyCode = async () => {
    const emailError = validateEmail(email);
    const codeError = code.trim() ? null : 'Enter the code from the email.';
    setErrors({ email: emailError, code: codeError });
    if (emailError || codeError) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await verifyRecoveryToken(code, email);
      setVerified(true);
    } catch (caught) {
      setFormError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async () => {
    const nextErrors = {
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await updatePassword(password);
      clearRecovery();
      setDone(true);
    } catch (caught) {
      setFormError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <Screen>
        <AppBar title="Reset password" />
        <LoadingState message="Checking your reset link…" />
      </Screen>
    );
  }

  return (
    <Screen keyboardAware>
      <AppBar title="Reset password" />
      <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
        {done ? (
          <>
            <Text style={[typography.h1, { color: colors.text }]}>Password updated</Text>
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
              You are signed in with your new password. Your workouts and routines are untouched.
            </Text>
            <Button label="Continue" onPress={() => router.replace('/(tabs)')} size="lg" />
          </>
        ) : verified ? (
          <>
            <Text style={[typography.h1, { color: colors.text }]}>Choose a new password</Text>
            <Input
              label="New password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              helper="At least 8 characters."
              secure
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
              secure
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <InlineError message={formError} />
            <Button
              label="Update password"
              onPress={handleSetPassword}
              loading={submitting}
              size="lg"
            />
          </>
        ) : (
          <>
            <Text style={[typography.h1, { color: colors.text }]}>Enter your reset code</Text>
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
              Open the link from the email on this device, or type the code it contains below.
            </Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <Input
              label="Reset code"
              value={code}
              onChangeText={setCode}
              error={errors.code}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <InlineError message={formError} />
            <Button label="Verify code" onPress={handleVerifyCode} loading={submitting} size="lg" />
            <Button
              label="Back to log in"
              variant="ghost"
              onPress={() => router.replace('/(auth)/login')}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
