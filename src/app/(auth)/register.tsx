/**
 * Register screen — design single-page form + OTP (decision 9).
 *
 *   step 1 — one form: email / username / password / confirm / age /
 *            city-country / gender / accept-terms  → POST /auth/register
 *   step 2 — OTP verify                            → POST /auth/register/verify
 *
 * All profile fields are posted at step 1; a verified OTP completes registration
 * and returns user + tokens, so we persist the refresh token, mark T&C accepted
 * (the form's checkbox is the acceptance), and log straight in — the
 * Stack.Protected guard handles the redirect. The local machine tracks only the
 * rendered step + the email carried between steps.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import {
  useRegisterResendOtp,
  useRegisterStart,
  useRegisterVerifyOtp,
} from '@/api/mutations/registerWizard';
import type { AuthStepResponse } from '@/api/services/auth';
import {
  AuthHeader,
  AuthScreen,
  OtpVerify,
  RegisterForm,
  StepHeader,
} from '@/components/auth';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { authErrorMessage } from '@/features/auth/errors';
import type { RegisterFormData } from '@/features/auth/schemas';
import { storeOnKeychain } from '@/services/keychain';

const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');

  const start = useRegisterStart();
  const verify = useRegisterVerifyOtp();
  const resend = useRegisterResendOtp();

  /** Move forward from a step response (or finalize + log in when it completes). */
  const advance = async (res: AuthStepResponse) => {
    if (res.user && res.accessToken && res.refreshToken) {
      await storeOnKeychain(REFRESH_TOKEN_KEY, res.refreshToken);
      useAppStore.getState().acceptTC(); // the form's accept-terms checkbox is the acceptance
      useAppStore.getState().login(res.user, res.accessToken);
      return;
    }
    if (res.email) setEmail(res.email);
    setStep(res.step + 1);
  };

  const handleRegister = (data: RegisterFormData) => {
    setEmail(data.email);
    start.mutate(
      {
        username: data.username,
        email: data.email,
        password: data.password,
        age: Number(data.age),
        location: data.location,
        gender: data.gender,
      },
      { onSuccess: advance },
    );
  };

  const handleVerify = (code: string) => {
    verify.mutate({ email, code }, { onSuccess: advance });
  };

  const onBack = () => (step === 2 ? setStep(1) : router.back());

  return (
    <AuthScreen
      header={<AuthHeader title={t('auth.register.title')} onBack={onBack} testID="register-header" />}
      topSlot={<StepHeader currentStep={step} totalSteps={2} />}
      testID="register-screen"
    >
      {step === 1 ? (
        <RegisterForm
          onSubmit={handleRegister}
          isSubmitting={start.isPending}
          errorText={start.error ? authErrorMessage(start.error) : undefined}
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
