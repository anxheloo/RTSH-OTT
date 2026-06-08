/**
 * Reset · step 1 — request a code by email. Presentational: owns its RHF form +
 * field-level zod error, hands the valid email up via `onSubmit`. Parent owns
 * the mutation, loading, and server error.
 */
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';

import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import { type ForgotPasswordFormData, forgotPasswordSchema } from '@/features/auth/schemas';

export interface ResetRequestFormProps {
  onSubmit: (email: string) => void;
  isSubmitting?: boolean;
  errorText?: string;
}

const ResetRequestForm: React.FC<ResetRequestFormProps> = ({
  onSubmit,
  isSubmitting = false,
  errorText,
}) => {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  return (
    <>
      <ReusableText variant="bodySmall" themeColor="textMuted">
        {t('auth.forgot.subtitle')}
      </ReusableText>

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.forgot.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            errorText={error?.message}
            testID="forgot-email-input"
          />
        )}
      />

      {errorText ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {errorText}
        </ReusableText>
      ) : null}

      <ReusableBtn
        label={t('auth.forgot.submit')}
        onPress={handleSubmit(({ email }) => onSubmit(email))}
        variant="primary"
        size="large"
        isLoading={isSubmitting}
        isFullWidth
        testID="forgot-submit-btn"
      />
    </>
  );
};

export default ResetRequestForm;
