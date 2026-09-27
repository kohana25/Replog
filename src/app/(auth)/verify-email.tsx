import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBar, Button, InlineError, Input, Screen } from '@/components/ui';
import { useTick } from '@/hooks/useTick';
import {
  sanitizeVerificationCode,
  VERIFICATION_CODE_LENGTH,
  validateVerificationCode,
  verificationErrorMessage,
} from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import {
  RESEND_COOLDOWN_SECONDS,
  ResendCooldownError,
  secondsUntilResendAllowed,
} from '@/services/auth';
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
 * Email verification for a brand-new account.
 *
 * Entering the emailed code is what confirms the address *and* creates the
 * session, so the user lands on Home from here — they never retype their
 * email and password on the login screen to finish registering.
 *
 * The optional `goal` / `level` params carry the sign-up screen's onboarding
 * answers: they can only be written to the profile once a session exists,
 * which is after verification.
 */
export default function VerifyEmailScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { verifyEmailCode, resendVerificationCode } = useAuth();

  const params = useLocalSearchParams<{
    email?: string;
    goal?: string;
    level?: string;
    /** Set by the login screen when the account was never verified. */
    resend?: string;
  }>();

  const email = (params.email ?? '').trim().toLowerCase();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  /**
   * The resend cooldown is stored as the epoch time it ends at and recomputed
   * on each tick, so a re-render or the app being backgrounded cannot make it
   * drift. `services/auth` enforces the same window server-side of the UI —
   * this is only what the countdown reads.
   */
  const [cooldownUntil, setCooldownUntil] = useState(
    () => Date.now() + secondsUntilResendAllowed(email) * 1000,
  );
  const now = useTick(1000, Boolean(email) && !verified);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const sendCode = useCallback(
    async (silent: boolean) => {
      if (!email) return;
      setResending(true);
      setFormError(null);
      try {
        await resendVerificationCode(email);
        setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
        if (!silent) setNotice(`We sent a new code to ${email}.`);
      } catch (error) {
        setNotice(null);
        setFormError(
          error instanceof ResendCooldownError ? error.message : verificationErrorMessage(error),
        );
      } finally {
        setResending(false);
      }
    },
    [email, resendVerificationCode],
  );

  /**
   * An unverified login sends the user here, where a fresh code is needed.
   * The ref is what keeps a re-render from emailing a second one — repeated
   * effect-driven requests are exactly what trips Supabase's email limit.
   */
  const autoSent = useRef(false);
  useEffect(() => {
    if (autoSent.current) return;
    if (params.resend !== '1' || !email) return;
    autoSent.current = true;
    if (secondsUntilResendAllowed(email) === 0) void sendCode(true);
  }, [params.resend, email, sendCode]);

  const handleVerify = async () => {
    if (verifying) return;

    const nextCodeError = validateVerificationCode(code);
    setCodeError(nextCodeError);
    setFormError(null);
    setNotice(null);
    if (nextCodeError) return;

    setVerifying(true);
    try {
      const session = await verifyEmailCode(email, code);
      setVerified(true);

      // Onboarding answers from the sign-up form, now that there is a session
      // for row-level security to accept.
      const goal = GOALS.includes(params.goal as FitnessGoal) ? (params.goal as FitnessGoal) : null;
      const level = LEVELS.includes(params.level as ExperienceLevel)
        ? (params.level as ExperienceLevel)
        : null;

      if (session.user && (goal || level)) {
        try {
          await updateProfile(session.user.id, {
            fitness_goal: goal,
            experience_level: level,
          });
        } catch {
          // Editable later from Profile — never block the user here.
        }
      }

      // Verified and signed in: straight to Home. `verifying` deliberately
      // stays true — the screen is on its way out and the button must not
      // become pressable again in the meantime.
      router.replace('/(tabs)');
    } catch (error) {
      setFormError(verificationErrorMessage(error));
      setVerifying(false);
    }
  };

  /* An address is required — without one there is nothing to verify. */
  if (!email) {
    return (
      <Screen>
        <AppBar title="Verify your email" />
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
          <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
            Verify your email
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
            We do not know which address to verify. Please start sign-up again.
          </Text>
          <Button label="Back to sign up" onPress={() => router.replace('/(auth)/signup')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboardAware>
      {/* No back arrow: the account already exists, going back would only
          invite a second sign-up attempt for the same address. */}
      <AppBar title="Verify your email" showBack={false} />
      <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
        <Text accessibilityRole="header" style={[typography.h1, { color: colors.text }]}>
          Verify your email
        </Text>

        <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
          We sent a {VERIFICATION_CODE_LENGTH}-digit verification code to:
        </Text>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>{email}</Text>

        <Input
          label={`Enter the ${VERIFICATION_CODE_LENGTH}-digit code`}
          value={code}
          onChangeText={(next) => {
            setCode(sanitizeVerificationCode(next));
            setCodeError(null);
          }}
          error={codeError}
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={VERIFICATION_CODE_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleVerify}
          returnKeyType="go"
        />

        <InlineError message={formError} />

        {verified ? (
          <Text style={[typography.bodyStrong, { color: colors.accent }]}>
            Email verified successfully!
          </Text>
        ) : notice ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>{notice}</Text>
        ) : null}

        <Button
          label="Verify email"
          onPress={handleVerify}
          loading={verifying}
          loadingLabel="Verifying…"
          disabled={code.length < VERIFICATION_CODE_LENGTH || resending}
          size="lg"
        />

        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Didn&apos;t receive the code?
          </Text>

          {cooldown > 0 ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[typography.body, { color: colors.textSubtle, fontWeight: '600' }]}
            >
              Resend code in {cooldown}s
            </Text>
          ) : (
            <Pressable
              onPress={() => void sendCode(false)}
              disabled={resending || verifying}
              accessibilityRole="button"
              accessibilityState={{ disabled: resending || verifying }}
              style={{ paddingVertical: 8 }}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color: resending || verifying ? colors.textSubtle : colors.primary,
                    fontWeight: '600',
                  },
                ]}
              >
                {resending ? 'Sending verification code…' : 'Resend code'}
              </Text>
            </Pressable>
          )}

          <Text
            style={[
              typography.caption,
              { color: colors.textSubtle, textAlign: 'center', maxWidth: 320 },
            ]}
          >
            Check your Gmail inbox, and the spam folder. The code expires after a short while.
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
