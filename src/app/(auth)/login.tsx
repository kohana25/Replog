import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBar, Button, InlineError, Input, Screen } from '@/components/ui';
import { authErrorMessage, isEmailNotConfirmedError, validateEmail } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Password login against the app's own Supabase Auth instance.
 *
 * There is no "continue with Google": the account's password is the app's own,
 * and a verified user goes straight to Home without seeing a code again.
 */
export default function LoginScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // The button is disabled while the request is in flight; this also stops
    // the keyboard's "go" key landing on top of a tap.
    if (submitting) return;

    const nextEmailError = validateEmail(email);
    // Deliberately only "is it present" here: telling the user their stored
    // password is too short would leak information about the account.
    const nextPasswordError = password ? null : 'Please enter your password.';

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextEmailError || nextPasswordError) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
      // The root layout routes to the app as soon as the session lands.
    } catch (error) {
      if (isEmailNotConfirmedError(error)) {
        // The account exists but was never verified. Finish that here rather
        // than leaving the user on a dead-end error: the verification screen
        // asks for a fresh code and signs them in once it is entered.
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: email.trim().toLowerCase(), resend: '1' },
        });
        return;
      }
      setFormError(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboardAware>
      <AppBar title="Log in" />
      <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
        <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
          Welcome back
        </Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          placeholder="you@gmail.com"
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
          error={passwordError}
          placeholder="Your password"
          secure
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        <InlineError message={formError} />

        <Button
          label="Log in"
          onPress={handleSubmit}
          loading={submitting}
          loadingLabel="Logging you in…"
          size="lg"
        />

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          accessibilityRole="button"
          style={{ alignSelf: 'center', paddingVertical: 8 }}
        >
          <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
            Forgot password?
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Don&apos;t have an account?
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/signup')} accessibilityRole="button">
            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
              Sign up
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
