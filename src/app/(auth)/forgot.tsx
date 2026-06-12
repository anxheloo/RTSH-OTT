/**
 * Forgot-password screen — client-driven 3-step reset wizard.
 *
 *   step 1 — request a code by email   → POST /auth/forgot-password (always 202)
 *   step 2 — OTP verify                → POST /auth/reset-password/verify
 *                                        → returns a one-time `resetToken`
 *   step 3 — set a new password        → POST /auth/reset-password
 *                                        {resetToken, newPassword}
 *
 * Resend has no dedicated endpoint — re-firing the step-1 request replaces the
 * live code. On success the route is REPLACED with login (no stale wizard in
 * the back stack) and the confirmation shows via the `notify` modal.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import {
  useResetPassword,
  useResetRequest,
  useResetVerifyOtp,
} from '@/api/mutations/resetWizard';
import {
  AuthFooterLink,
  AuthHeader,
  AuthScreen,
  OtpVerify,
  ResetPasswordForm,
  ResetRequestForm,
  StepHeader,
} from '@/components/auth';
import { authErrorMessage } from '@/features/auth/errors';

const ForgotPasswordScreen: React.FC = () => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  const request = useResetRequest();
  const verify = useResetVerifyOtp();
  const reset = useResetPassword();

  const handleRequest = (value: string) => {
    setEmail(value);
    request.mutate(value, { onSuccess: () => setStep(2) });
  };

  const handleVerify = (code: string) => {
    verify.mutate(
      { email, code },
      {
        onSuccess: (data) => {
          setResetToken(data.resetToken);
          setStep(3);
        },
      },
    );
  };

  const handleNewPassword = (newPassword: string) => {
    reset.mutate(
      { resetToken, newPassword },
      {
        onSuccess: () => {
          useAppStore.getState().updateModalSlice({
            currentModal: 'notify',
            modalData: { description: t('auth.reset.success') },
          });
          router.replace('/login');
        },
      },
    );
  };

  const backToLogin = (
    <AuthFooterLink
      prefix={t('auth.forgot.back_to')}
      linkLabel={t('auth.forgot.sign_in')}
      onPress={() => router.back()}
      testID="forgot-back-link"
    />
  );

  const onBack = () => (step > 1 ? setStep(step - 1) : router.back());
  const header = (
    <AuthHeader title={t('auth.forgot.title')} onBack={onBack} testID="forgot-header" />
  );

  return (
    <AuthScreen
      header={header}
      topSlot={<StepHeader currentStep={step} />}
      testID="forgot-screen"
    >
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
          onResend={() => request.mutate(email)}
          isVerifying={verify.isPending}
          isResending={request.isPending}
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
