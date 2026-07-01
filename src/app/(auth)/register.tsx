/**
 * Register screen — design single-page form + OTP (decision 9).
 *
 *   step 1 — one form: email / username / password / confirm / birth date /
 *            city / country / gender / accept-terms  → POST /auth/register
 *   step 2 — OTP verify                              → POST /auth/register/verify
 *
 * The backend saves a pending account on step 1 and emails the code; a verified
 * OTP activates the account and returns user + tokens (validated in the service),
 * so we persist the refresh token, mark T&C accepted (the form's checkbox is the
 * acceptance), and log straight in — the Stack.Protected guard handles the
 * redirect. Steps are client-driven; only the rendered step + the email are kept.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import {
  useRegister,
  useRegisterResendOtp,
  useRegisterVerifyOtp,
} from '@/api/mutations/registerWizard';
import type { AuthResponse } from '@/api/services/auth';
import {
  AuthHeader,
  AuthScreen,
  OtpVerify,
  RegisterForm,
  StepHeader,
} from '@/components/auth';
import { authErrorMessage } from '@/features/auth/errors';
import type { RegisterFormData } from '@/features/auth/schemas';
import { setRefreshToken } from '@/lib/tokenVault';

const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();

  const rememberMeDefault = useAppStore((s) => s.rememberMe);
  const persistRememberMe = useAppStore((s) => s.setRememberMe);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  // Carried from the form (step 1) to the verify step (step 2), where tokens land.
  const [rememberMe, setRememberMe] = useState(rememberMeDefault);

  const start = useRegister();
  const verify = useRegisterVerifyOtp();
  const resend = useRegisterResendOtp();

  /** Verified OTP → activated account + tokens: persist per "remember me" + log straight in. */
  const completeLogin = async ({ user, accessToken, refreshToken }: AuthResponse) => {
    await setRefreshToken(refreshToken, { remember: rememberMe });
    useAppStore.getState().login(user, accessToken);
  };

  const handleRegister = (data: RegisterFormData) => {
    // confirmPassword + rememberMe are client-only — neither is part of the register payload.
    const { confirmPassword: _confirmPassword, rememberMe: remember, ...payload } = data;
    setEmail(data.email);
    setRememberMe(remember);
    persistRememberMe(remember); // pre-fill the box with this choice next time
    start.mutate(payload, { onSuccess: () => setStep(2) });
  };

  const handleVerify = (code: string) => {
    verify.mutate({ email, code }, { onSuccess: completeLogin });
  };

  const onBack = () => (step === 2 ? setStep(1) : router.back());

  return (
    <AuthScreen
      header={<AuthHeader title={t('auth.register.title')} onBack={onBack} testID="register-header" />}
      topSlot={<StepHeader currentStep={step} totalSteps={2} />}
      keyboardAvoidingEnabled={false}
      testID="register-screen"
    >
      {step === 1 ? (
        <RegisterForm
          onSubmit={handleRegister}
          isSubmitting={start.isPending}
          errorText={start.error ? authErrorMessage(start.error) : undefined}
          rememberMeDefault={rememberMeDefault}
        />
      ) : (
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
          testID="register-otp"
        />
      )}
    </AuthScreen>
  );
};

export default RegisterScreen;
