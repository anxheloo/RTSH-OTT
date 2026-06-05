/**
 * Login screen — RTSH TANI auth entry point.
 * Layout verified against Figma screen 2 (2026-06-02).
 *
 * Form state via react-hook-form + zodResolver(loginSchema). On valid submit →
 * useLoginMutation (stores refresh token in keychain, access token in store —
 * Stack.Protected handles the redirect). Chrome from the shared `AuthScreen`.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import { useLoginMutation } from '@/api/mutations/useLoginMutation';
import { AuthFooterLink, AuthScreen } from '@/components/auth';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import { authErrorMessage } from '@/features/auth/errors';
import { type LoginFormData, loginSchema } from '@/features/auth/schemas';

const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);

  const { mutate: login, isPending, error } = useLoginMutation();

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(({ email, password }) => login({ email, password }));

  return (
    <AuthScreen testID="login-screen">
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur }, fieldState: { error: fieldError } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.login.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            errorText={fieldError?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="login-email-input"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur }, fieldState: { error: fieldError } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.login.password_placeholder')}
            isPassword
            autoComplete="current-password"
            errorText={fieldError?.message}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="login-password-input"
          />
        )}
      />

      {/* Forgot password */}
      <TouchableOpacity
        style={styles.forgotRow}
        onPress={() => router.push('/(auth)/forgot')}
        activeOpacity={0.7}
        testID="login-forgot-password"
      >
        <ReusableText
          fontSize={FONTSIZE.md}
          style={{ color: colors.primary, fontFamily: Fonts.regular }}
        >
          {t('auth.login.forgot_password')}
        </ReusableText>
      </TouchableOpacity>

      {/* API error */}
      {error ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center" style={styles.apiError}>
          {authErrorMessage(error, { 401: t('auth.login.failed') })}
        </ReusableText>
      ) : null}

      {/* Login button */}
      <ReusableBtn
        label={t('auth.login.submit')}
        onPress={onSubmit}
        variant="primary"
        isLoading={isPending}
        isFullWidth
        height={60}
        borderRadius={BORDERRADIUS.pill}
        labelFontSize={FONTSIZE.md}
        testID="login-submit-btn"
        style={styles.loginBtn}
      />

      {/* Register link */}
      <AuthFooterLink
        prefix={t('auth.login.no_account')}
        linkLabel={t('auth.login.sign_up')}
        onPress={() => router.push('/(auth)/register')}
        testID="login-register-link"
      />
    </AuthScreen>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  forgotRow: {
    alignSelf: 'flex-end',
  },
  loginBtn: {
    marginTop: SPACING.space_8,
  },
  apiError: {
    marginTop: -SPACING.space_8,
  },
});
