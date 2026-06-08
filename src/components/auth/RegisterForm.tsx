/**
 * Register form (design single page, decision 9) — credentials + profile in one
 * RHF form: email, username, password, confirm, age, city/country, gender, and
 * an accept-terms checkbox. Field errors are zod i18n keys resolved with `t()`.
 * The valid payload is handed up via `onSubmit`; the parent owns the mutation,
 * loading, and server error. The terms link opens in an in-app browser.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';
import * as WebBrowser from 'expo-web-browser';

import { SPACING } from '@/theme/spacing';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import Checkbox from '@/components/Inputs/Checkbox';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import SegmentedChoice from '@/components/Inputs/SegmentedChoice';
import { LINKS } from '@/config/links';
import {
  REGISTER_GENDERS,
  type RegisterFormData,
  registerSchema,
} from '@/features/auth/schemas';

export interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void;
  isSubmitting?: boolean;
  errorText?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, isSubmitting = false, errorText }) => {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      age: '',
      location: '',
      gender: 'male',
      acceptTerms: false,
    },
  });

  const genderOptions = REGISTER_GENDERS.map((g) => ({
    value: g,
    label: t(`auth.register.gender.${g}`),
  }));

  const tr = (key?: string) => (key ? t(key) : undefined);

  return (
    <>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            label={t('auth.register.email_label')}
            placeholder={t('auth.register.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            errorText={tr(error?.message)}
            testID="register-email-input"
          />
        )}
      />

      <Controller
        control={control}
        name="username"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            label={t('auth.register.username_label')}
            placeholder={t('auth.register.username_placeholder')}
            autoCapitalize="none"
            autoComplete="username"
            errorText={tr(error?.message)}
            testID="register-username-input"
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
            label={t('auth.register.password_label')}
            placeholder={t('auth.register.password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={tr(error?.message)}
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
            label={t('auth.register.confirm_password_label')}
            placeholder={t('auth.register.confirm_password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={tr(error?.message)}
            testID="register-confirm-password-input"
          />
        )}
      />

      <Controller
        control={control}
        name="age"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            label={t('auth.register.age_label')}
            placeholder={t('auth.register.age_placeholder')}
            keyboardType="number-pad"
            errorText={tr(error?.message)}
            testID="register-age-input"
          />
        )}
      />

      <Controller
        control={control}
        name="location"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            label={t('auth.register.location_label')}
            placeholder={t('auth.register.location_placeholder')}
            errorText={tr(error?.message)}
            testID="register-location-input"
          />
        )}
      />

      <Controller
        control={control}
        name="gender"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View style={styles.fieldGap}>
            <ReusableText variant="label" themeColor="textMuted">
              {t('auth.register.gender_label')}
            </ReusableText>
            <SegmentedChoice
              options={genderOptions}
              value={value}
              onChange={onChange}
              testID="register-gender"
            />
            {error?.message ? (
              <ReusableText variant="caption" themeColor="error">
                {t(error.message)}
              </ReusableText>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View style={styles.fieldGap}>
            <Checkbox value={value} onValueChange={onChange} testID="register-accept-terms">
              <ReusableText variant="bodySmall" themeColor="text" style={styles.flex}>
                {t('auth.register.accept_terms_prefix')}{' '}
                <ReusableText
                  variant="bodySmall"
                  themeColor="primary"
                  onPress={() => WebBrowser.openBrowserAsync(LINKS.TERMS)}
                  testID="register-terms-link"
                >
                  {t('auth.register.accept_terms_link')}
                </ReusableText>
              </ReusableText>
            </Checkbox>
            {error?.message ? (
              <ReusableText variant="caption" themeColor="error">
                {t(error.message)}
              </ReusableText>
            ) : null}
          </View>
        )}
      />

      {errorText ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {errorText}
        </ReusableText>
      ) : null}

      <ReusableBtn
        label={t('auth.register.submit')}
        onPress={handleSubmit(onSubmit)}
        variant="primary"
        size="large"
        isLoading={isSubmitting}
        isFullWidth
        testID="register-submit"
      />
    </>
  );
};

export default RegisterForm;

const styles = StyleSheet.create({
  fieldGap: {
    gap: SPACING.space_8,
  },
  flex: {
    flex: 1,
  },
});
