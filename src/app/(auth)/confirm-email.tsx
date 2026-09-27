import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { AppBar, Button, InlineError, Screen } from '@/components/ui';
import { useTick } from '@/hooks/useTick';
import { authErrorMessage } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import {
  RESEND_COOLDOWN_SECONDS,
  ResendCooldownError,
  secondsUntilResendAllowed,
} from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * "Check your email" for a new, unconfirmed account.
 *
 * Confirmation is Supabase's standard emailed link, so there is nothing to
 * type here: the user opens the link, comes back, and logs in with the email
 * and password they just registered with. The only action on this screen is
 * sending that email again if it never arrived.
 *
 * Reached from sign-up, and from a login attempt on an account whose address
 * was never confirmed (`reason=unconfirmed`).
 */
export default function ConfirmEmailScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { resendConfirmationEmail } = useAuth();

  const params = useLocalSearchParams<{ email?: string; reason?: string }>();
  const email = (params.email ?? '').trim().toLowerCase();
  const fromFailedLogin = params.reason === 'unconfirmed';

  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  /**
   * The resend cooldown is stored as the epoch time it ends at and recomputed
   * on each tick, so a re-render or the app being backgrounded cannot make it
   * drift. `services/auth` enforces the same window regardless of the UI —
   * this is only what the countdown reads.
   */
  const [cooldownUntil, setCooldownUntil] = useState(
    () => Date.now() + secondsUntilResendAllowed(email) * 1000,
  );
  const now = useTick(1000, Boolean(email));
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const handleResend = useCallback(async () => {
    if (!email || resending) return;

    setResending(true);
    setFormError(null);
    setNotice(null);
    try {
      await resendConfirmationEmail(email);
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setNotice(`We sent another confirmation email to ${email}.`);
    } catch (error) {
      setFormError(
        error instanceof ResendCooldownError ? error.message : authErrorMessage(error),
      );
    } finally {
      setResending(false);
    }
  }, [email, resending, resendConfirmationEmail]);

  const goToLogin = () =>
    router.replace({
      pathname: '/(auth)/login',
      // Pre-filled so logging in after confirming is one field, not two.
      params: email ? { email } : {},
    });

  return (
    <Screen>
      {/* No back arrow: the account already exists, and going back would only
          invite a second sign-up attempt for the same address. */}
      <AppBar title="Confirm your email" showBack={false} />
      <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
        <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
          {fromFailedLogin ? 'Confirm your email first' : 'Check your email'}
        </Text>

        <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
          {fromFailedLogin
            ? 'This account has not been confirmed yet. We sent a confirmation link to:'
            : 'Your account is created. We sent a confirmation link to:'}
        </Text>

        {email ? (
          <Text style={[typography.bodyStrong, { color: colors.text }]}>{email}</Text>
        ) : null}

        <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
          Open that email and tap the link to confirm your address. Then come back and log in
          with the email and password you just chose.
        </Text>

        <InlineError message={formError} />

        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.caption, { color: colors.accent }]}
          >
            {notice}
          </Text>
        ) : null}

        <Button label="Log in" onPress={goToLogin} size="lg" />

        <View style={{ gap: spacing.xs, alignItems: 'center' }}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Didn&apos;t get the email?
          </Text>

          {cooldown > 0 ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                typography.body,
                { color: colors.textSubtle, fontWeight: '600', paddingVertical: 8 },
              ]}
            >
              Resend email in {cooldown}s
            </Text>
          ) : (
            <Button
              label="Resend confirmation email"
              variant="ghost"
              onPress={handleResend}
              loading={resending}
              loadingLabel="Sending…"
              disabled={!email}
            />
          )}

          <Text
            style={[
              typography.caption,
              { color: colors.textSubtle, textAlign: 'center', maxWidth: 320 },
            ]}
          >
            Check your Gmail inbox, and the spam folder. The link expires after a while — send a
            new one if it does.
          </Text>
        </View>

        <Button
          label="Use a different email"
          variant="ghost"
          onPress={() => router.replace('/(auth)/signup')}
        />
      </View>
    </Screen>
  );
}
