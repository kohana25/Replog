import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBar, Button, InlineError, Input, Screen } from '@/components/ui';
import { authErrorMessage, sanitizeUsername, validateUsername } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Password login against the app's own Supabase Auth instance.
 *
 * Accounts are a username and a password — there is no email address, no
 * confirmation step and nothing to recover a forgotten password with, so this
 * screen is the only way in.
 */
export default function LoginScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // The button is disabled while the request is in flight; this also stops
    // the keyboard's "go" key landing on top of a tap.
    if (submitting) return;

    const nextUsernameError = validateUsername(username);
    // Deliberately only "is it present" here: telling the user their stored
    // password is too short would leak information about the account.
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
          onChangeText={(next) => {
            setUsername(sanitizeUsername(next));
            setUsernameError(null);
          }}
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

        {/* No "forgot password": there is no address to send a reset to. */}
        <Text
          style={[
            typography.caption,
            { color: colors.textSubtle, textAlign: 'center', lineHeight: 18 },
          ]}
        >
          Accounts have no email attached, so a forgotten password cannot be reset.
        </Text>

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
