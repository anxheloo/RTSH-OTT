/**
 * Register · step 1 — username / email / password / confirm. Presentational:
 * owns its RHF form + field-level zod errors, and hands the valid payload up via
 * `onSubmit`. The parent route owns the mutation, loading, and server error.
 */
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';

import { BORDERRADIUS, FONTSIZE } from '@/theme';
import TermsNotice from '@/components/auth/TermsNotice';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import {
  type RegisterCredentialsData,
  registerCredentialsSchema,
} from '@/features/auth/schemas';

export interface RegisterCredentialsFormProps {
  onSubmit: (data: RegisterCredentialsData) => void;
  isSubmitting?: boolean;
  errorText?: string;
  defaultEmail?: string;
}

const RegisterCredentialsForm: React.FC<RegisterCredentialsFormProps> = ({
  onSubmit,
  isSubmitting = false,
  errorText,
  defaultEmail = '',
}) => {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<RegisterCredentialsData>({
    resolver: zodResolver(registerCredentialsSchema),
    defaultValues: { username: '', email: defaultEmail, password: '', confirmPassword: '' },
  });

  return (
    <>
      <Controller
        control={control}
        name="username"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.register.username_placeholder')}
            autoCapitalize="none"
            autoComplete="username"
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-username-input"
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.register.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-email-input"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.register.password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-password-input"
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
            placeholder={t('auth.register.confirm_password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={error?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-confirm-password-input"
          />
        )}
      />

      {errorText ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {errorText}
        </ReusableText>
      ) : null}

      <ReusableBtn
        label={t('auth.register.continue')}
        onPress={handleSubmit(onSubmit)}
        variant="primary"
        isLoading={isSubmitting}
        isFullWidth
        height={60}
        borderRadius={BORDERRADIUS.pill}
        labelFontSize={FONTSIZE.md}
        testID="register-credentials-submit"
      />

      <TermsNotice testID="register-terms" />
    </>
  );
};

export default RegisterCredentialsForm;
