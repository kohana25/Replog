import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { AppBar, Button, InlineError, Input, Screen } from '@/components/ui';
import { authErrorMessage, validateEmail } from '@/lib/validation';
import { resetPassword } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';

export default function ForgotPasswordScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    const nextError = validateEmail(email);
    setError(nextError);
    setFormError(null);
    if (nextError) return;

    setSubmitting(true);
    try {
      // Deep link back into the app; see README for the matching Supabase
      // email-template and redirect-URL settings.
      await resetPassword(email, Linking.createURL('/reset-password'));
      setSent(true);
    } catch (caught) {
      setFormError(authErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboardAware>
      <AppBar title="Reset password" />
      <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
        {sent ? (
          <>
            <Text style={[typography.h1, { color: colors.text }]}>Check your email</Text>
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
              If an account exists for that address, we have sent a link to reset the password.
              Open it on this device to continue.
            </Text>
            <Button
              label="I have a reset code"
              variant="secondary"
              onPress={() => router.push('/(auth)/reset-password')}
            />
            <Button label="Back to log in" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : (
          <>
            <Text style={[typography.h1, { color: colors.text }]}>Forgot your password?</Text>
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
              Enter your email address and we will send you a link to set a new one.
            </Text>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={error}
              placeholder="you@gmail.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              autoCorrect={false}
              onSubmitEditing={handleSubmit}
            />

            <InlineError message={formError} />
            <Button
              label="Send reset link"
              onPress={handleSubmit}
              loading={submitting}
              loadingLabel="Sending…"
              size="lg"
            />
          </>
        )}
      </View>
    </Screen>
  );
}
