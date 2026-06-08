/**
 * Reset · step 3 — set a new password. Presentational: owns its RHF form +
 * field-level zod errors (incl. the confirm-match refine), hands the new
 * password up via `onSubmit`. Parent owns the mutation, loading, server error.
 */
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';

import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import { type ResetPasswordData, resetPasswordSchema } from '@/features/auth/schemas';

export interface ResetPasswordFormProps {
  onSubmit: (newPassword: string) => void;
  isSubmitting?: boolean;
  errorText?: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSubmit,
  isSubmitting = false,
  errorText,
}) => {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  return (
    <>
      <ReusableText variant="heading3" themeColor="text">
        {t('auth.reset.new_password_title')}
      </ReusableText>

      <Controller
        control={control}
        name="newPassword"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.reset.new_password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={error?.message}
            testID="reset-new-password-input"
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.reset.confirm_password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={error?.message}
            testID="reset-confirm-password-input"
          />
        )}
      />

      {errorText ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {errorText}
        </ReusableText>
      ) : null}

      <ReusableBtn
        label={t('auth.reset.submit')}
        onPress={handleSubmit(({ newPassword }) => onSubmit(newPassword))}
        variant="primary"
        size="large"
        isLoading={isSubmitting}
        isFullWidth
        testID="reset-submit-btn"
      />
    </>
  );
};

export default ResetPasswordForm;
