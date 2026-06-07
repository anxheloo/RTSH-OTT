/**
 * Login screen — RTSH TANI auth entry point. Design 2026-06-06: welcome heading,
 * pill inputs with leading mail/key glyphs, a remember-me checkbox beside the
 * forgot-password link, red CTA, and a register footer link.
 *
 * Form state via react-hook-form + zodResolver(loginSchema). On valid submit →
 * useLoginMutation (refresh token → keychain, access token → store; the
 * Stack.Protected guard handles the redirect). Chrome from shared `AuthScreen`.
 */
import React, { useState } from 'react';
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
import { Checkbox, ReusableInput, ReusableText } from '@/components/Inputs';
import { KeyIcon, MailIcon } from '@/assets/icons';
import { authErrorMessage } from '@/features/auth/errors';
import { type LoginFormData, loginSchema } from '@/features/auth/schemas';

const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const [rememberMe, setRememberMe] = useState(true);

  const { mutate: login, isPending, error } = useLoginMutation();

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(({ email, password }) => login({ email, password }));

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
            errorText={fieldError?.message}
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
            errorText={fieldError?.message}
            testID="login-password-input"
          />
        )}
      />

      {/* Remember me + forgot password */}
      <View style={styles.metaRow}>
        <Checkbox
          value={rememberMe}
          onValueChange={setRememberMe}
          label={t('auth.login.remember_me')}
          testID="login-remember-me"
        />
        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot')}
          activeOpacity={0.7}
          testID="login-forgot-password"
        >
          <ReusableText variant="label" themeColor="primary">
            {t('auth.login.forgot_password')}
          </ReusableText>
        </TouchableOpacity>
      </View>

      {error ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {authErrorMessage(error, { 401: t('auth.login.failed') })}
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
    </AuthScreen>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  welcome: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
