/**
 * Login screen — RTSH TANI auth entry point. Design 2026-06-06: welcome heading,
 * pill inputs with leading mail/key glyphs, a forgot-password link, red CTA,
 * and a register footer link.
 *
 * Form state via react-hook-form + zodResolver(loginSchema). On valid submit →
 * useLoginMutation (refresh token → keychain, access token → store; the
 * Stack.Protected guard handles the redirect). Chrome from shared `AuthScreen`.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useLoginMutation } from '@/api/mutations/useLoginMutation';
import { AuthFooterLink, AuthScreen } from '@/components/auth';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import { Icon } from '@/components/Icons';
import { ReusableInput, ReusableText } from '@/components/Inputs';
import { KeyIcon, MailIcon } from '@/assets/icons';
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

  // Zod error messages are i18n keys (RTSH pattern) — resolve at render time.
  const tr = (key?: string) => (key ? t(key) : undefined);

  const onSubmit = handleSubmit(({ email, password }) => login({ email, password }));

  // Inline only for client (4xx) errors; 5xx/network resolves to undefined and
  // the global apiError modal owns it (authErrorMessage gates the boundary).
  const errorMessage = authErrorMessage(error, { 401: t('auth.login.failed') });

  return (
    <AuthScreen testID="login-screen">
      <View style={styles.welcome}>
        <ReusableText variant="heading1">{t('auth.login.welcome')}</ReusableText>
        <ReusableText variant="bodySmall" themeColor="textMuted">
          {t('auth.login.welcome_subtitle')}
        </ReusableText>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur }, fieldState: { error: fieldError } }) => (
          <ReusableInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={t('auth.login.email_placeholder')}
            leftIcon={<Icon as={MailIcon} size={19} color={colors.textMuted} />}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            errorText={tr(fieldError?.message)}
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
            leftIcon={<Icon as={KeyIcon} size={19} color={colors.textMuted} />}
            isPassword
            autoComplete="current-password"
            errorText={tr(fieldError?.message)}
            testID="login-password-input"
          />
        )}
      />

      {errorMessage ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {errorMessage}
        </ReusableText>
      ) : null}

      <ReusableBtn
        label={t('auth.login.submit')}
        onPress={onSubmit}
        variant="primary"
        size="large"
        isLoading={isPending}
        isFullWidth
        testID="login-submit-btn"
      />

      <AuthFooterLink
        prefix={t('auth.login.no_account')}
        linkLabel={t('auth.login.sign_up')}
        onPress={() => router.push('/(auth)/register')}
        testID="login-register-link"
      />

      <TouchableOpacity
        onPress={() => router.push('/(auth)/forgot')}
        activeOpacity={0.7}
        style={styles.forgotRow}
        testID="login-forgot-password"
      >
        <ReusableText variant="label" themeColor="primary">
          {t('auth.login.forgot_password')}
        </ReusableText>
      </TouchableOpacity>
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  welcome: {
    gap: 4,
  },
  forgotRow: {
    alignSelf: 'center',
  },
});

export default LoginScreen;
