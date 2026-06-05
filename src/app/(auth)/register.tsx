/**
 * Register screen — server-driven, resumable 3-step wizard.
 *
 *   step 1 — credentials (username / email / password)  → POST /auth/register
 *   step 2 — OTP verify                                  → POST /auth/register/verify
 *   step 3 — profile details                             → POST /auth/register/details
 *
 * Each response carries the COMPLETED step; the client renders `completed + 1`.
 * Step-3 returns user + tokens → we persist the refresh token and log straight
 * in (Stack.Protected handles the redirect). The local machine only tracks the
 * rendered step + the email carried between steps.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import {
  useRegisterDetails,
  useRegisterResendOtp,
  useRegisterStart,
  useRegisterVerifyOtp,
} from '@/api/mutations/registerWizard';
import type { AuthStepResponse } from '@/api/services/auth';
import {
  AuthFooterLink,
  AuthScreen,
  OtpVerify,
  RegisterCredentialsForm,
  RegisterDetailsForm,
  StepHeader,
} from '@/components/auth';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { authErrorMessage } from '@/features/auth/errors';
import type { RegisterCredentialsData, RegisterDetailsData } from '@/features/auth/schemas';
import { storeOnKeychain } from '@/services/keychain';

const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');

  const start = useRegisterStart();
  const verify = useRegisterVerifyOtp();
  const details = useRegisterDetails();
  const resend = useRegisterResendOtp();

  /** Move the wizard forward from a step response (or log in when it completes). */
  const advance = async (res: AuthStepResponse) => {
    if (res.user && res.accessToken && res.refreshToken) {
      await storeOnKeychain(REFRESH_TOKEN_KEY, res.refreshToken);
      useAppStore.getState().login(res.user, res.accessToken);
      return;
    }
    if (res.email) setEmail(res.email);
    setStep(res.step + 1);
  };

  const handleCredentials = (data: RegisterCredentialsData) => {
    setEmail(data.email);
    start.mutate(
      { username: data.username, email: data.email, password: data.password },
      { onSuccess: advance },
    );
  };

  const handleVerify = (code: string) => {
    verify.mutate({ email, code }, { onSuccess: advance });
  };

  const handleDetails = (data: RegisterDetailsData) => {
    details.mutate({ email, ...data }, { onSuccess: advance });
  };

  return (
    <AuthScreen topSlot={<StepHeader currentStep={step} />} testID="register-screen">
      {step === 1 ? (
        <RegisterCredentialsForm
          onSubmit={handleCredentials}
          isSubmitting={start.isPending}
          errorText={start.error ? authErrorMessage(start.error) : undefined}
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
          testID="register-otp"
        />
      ) : null}

      {step === 3 ? (
        <RegisterDetailsForm
          onSubmit={handleDetails}
          isSubmitting={details.isPending}
          errorText={details.error ? authErrorMessage(details.error) : undefined}
        />
      ) : null}

      {step === 1 ? (
        <AuthFooterLink
          prefix={t('auth.register.have_account')}
          linkLabel={t('auth.register.sign_in')}
          onPress={() => router.back()}
          testID="register-login-link"
        />
      ) : null}
    </AuthScreen>
  );
};

export default RegisterScreen;
