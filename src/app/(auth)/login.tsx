import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBar, Button, InlineError, Input, Screen } from '@/components/ui';
import { stripUsernameSpaces } from '@/lib/username';
import { authErrorMessage } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Username and password, against this project's own Supabase Auth instance.
 *
 * No email is involved anywhere: no Google sign-in, nothing to verify, and no
 * emailed password recovery. A correct username and password land on Home.
 */
export default function LoginScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();

  // Sign-up hands the username over, so logging in straight afterwards is one
  // field rather than two.
  const params = useLocalSearchParams<{ username?: string }>();
  const prefilledUsername = stripUsernameSpaces(params.username ?? '').toLowerCase();

  const [username, setUsername] = useState(prefilledUsername);
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prefilledUsername) setUsername(prefilledUsername);
  }, [prefilledUsername]);

  const handleSubmit = async () => {
    // The button shows a spinner while the request is in flight; this also
    // stops the keyboard's "go" key landing on top of a tap.
    if (submitting) return;

    /*
     * Presence only, on both fields. Telling someone their own username is
     * too short, or their stored password too weak, would both leak something
     * about the account and stop an older account signing in at all.
     */
    const nextUsernameError = username.trim() ? null : 'Please enter your username.';
    const nextPasswordError = password ? null : 'Please enter your password.';

    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);
    setFormError(null);
    if (nextUsernameError || nextPasswordError) return;

    setSubmitting(true);
    try {
      await signIn(username, password);
      // The root layout routes to the app as soon as the session lands.
    } catch (error) {
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
          label="Username"
          value={username}
          onChangeText={(next) => setUsername(stripUsernameSpaces(next))}
          error={usernameError}
          placeholder="yourname"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
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

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Don&apos;t have an account?
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/signup')} accessibilityRole="button">
            <Text style={[typography.body, { color: colors.primaryText, fontWeight: '600' }]}>
              Sign up
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
