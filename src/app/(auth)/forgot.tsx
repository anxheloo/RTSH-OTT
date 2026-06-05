/**
 * Forgot-password screen — server-driven, resumable 3-step reset wizard.
 *
 *   step 1 — request a code by email   → POST /auth/forgot-password
 *   step 2 — OTP verify                → POST /auth/reset/verify
 *   step 3 — set a new password        → POST /auth/reset/password
 *
 * Mirrors the register wizard (each response carries the COMPLETED step; client
 * renders `completed + 1`), but step 3 does NOT return tokens — on success we
 * show a confirmation and send the user back to login to sign in.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { BORDERRADIUS, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import {
  useResetPassword,
  useResetRequest,
  useResetResendOtp,
  useResetVerifyOtp,
} from '@/api/mutations/resetWizard';
import type { AuthStepResponse } from '@/api/services/auth';
import {
  AuthFooterLink,
  AuthScreen,
  OtpVerify,
  ResetPasswordForm,
  ResetRequestForm,
  StepHeader,
} from '@/components/auth';
import ReusableText from '@/components/Inputs/ReusableText';
import { authErrorMessage } from '@/features/auth/errors';

const ForgotPasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const request = useResetRequest();
  const verify = useResetVerifyOtp();
  const reset = useResetPassword();
  const resend = useResetResendOtp();

  const advance = (res: AuthStepResponse) => {
    if (res.email) setEmail(res.email);
    setStep(res.step + 1);
  };

  const handleRequest = (value: string) => {
    setEmail(value);
    request.mutate(value, { onSuccess: advance });
  };

  const handleVerify = (code: string) => {
    verify.mutate({ email, code }, { onSuccess: advance });
  };

  const handleNewPassword = (newPassword: string) => {
    reset.mutate({ email, newPassword }, { onSuccess: () => setDone(true) });
  };

  const backToLogin = (
    <AuthFooterLink
      prefix={t('auth.forgot.back_to')}
      linkLabel={t('auth.forgot.sign_in')}
      onPress={() => router.back()}
      testID="forgot-back-link"
    />
  );

  if (done) {
    return (
      <AuthScreen testID="forgot-screen">
        <View style={[styles.successBox, { backgroundColor: colors.surface }]}>
          <ReusableText variant="body" themeColor="success" textAlign="center">
            {t('auth.reset.success')}
          </ReusableText>
        </View>
        {backToLogin}
      </AuthScreen>
    );
  }

  return (
    <AuthScreen topSlot={<StepHeader currentStep={step} />} testID="forgot-screen">
      {step === 1 ? (
        <ResetRequestForm
          onSubmit={handleRequest}
          isSubmitting={request.isPending}
          errorText={request.error ? authErrorMessage(request.error) : undefined}
        />
      ) : null}

      {step === 2 ? (
        <OtpVerify
          email={email}
          onVerify={handleVerify}
          onResend={() => resend.mutate(email)}
          isVerifying={verify.isPending}
          isResending={resend.isPending}
          errorText={
            verify.error
              ? authErrorMessage(verify.error, {
                  400: t('auth.otp.invalid'),
                  401: t('auth.otp.invalid'),
                })
              : undefined
          }
          testID="forgot-otp"
        />
      ) : null}

      {step === 3 ? (
        <ResetPasswordForm
          onSubmit={handleNewPassword}
          isSubmitting={reset.isPending}
          errorText={reset.error ? authErrorMessage(reset.error) : undefined}
        />
      ) : null}

      {step === 1 ? backToLogin : null}
    </AuthScreen>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  successBox: {
    borderRadius: BORDERRADIUS.radius_12,
    padding: SPACING.space_16,
  },
});
