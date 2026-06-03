/**
 * Register screen — new account creation.
 * 4 fields: Display Name, Email, Password, Confirm Password.
 * Validates with registerSchema before calling useRegisterMutation.
 */
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import { useRegisterMutation } from '@/api/mutations/useRegisterMutation';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import { registerSchema } from '@/features/auth/schemas';

type FieldErrors = {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { mutate: register, isPending, error: mutationError } = useRegisterMutation();

  const clearError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleRegister = () => {
    const result = registerSchema.safeParse({ displayName, email, password, confirmPassword });
    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errs[field]) errs[field] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    register({
      displayName: result.data.displayName,
      email: result.data.email,
      password: result.data.password,
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <Image
          source={require('../../../assets/images/logo-glow.png')}
          style={styles.logo}
          resizeMode="contain"
          testID="register-header-logo"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <ReusableInput
            value={displayName}
            onChangeText={(v) => { setDisplayName(v); clearError('displayName'); }}
            placeholder={t('auth.register.display_name_placeholder')}
            autoCapitalize="words"
            autoComplete="name"
            errorText={fieldErrors.displayName}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-display-name-input"
          />

          <ReusableInput
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            placeholder={t('auth.register.email_placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            errorText={fieldErrors.email}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-email-input"
          />

          <ReusableInput
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
            placeholder={t('auth.register.password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={fieldErrors.password}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-password-input"
          />

          <ReusableInput
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
            placeholder={t('auth.register.confirm_password_placeholder')}
            isPassword
            autoComplete="new-password"
            errorText={fieldErrors.confirmPassword}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="register-confirm-password-input"
          />

          {mutationError ? (
            <ReusableText
              variant="caption"
              themeColor="error"
              textAlign="center"
            >
              {(mutationError as Error).message ?? t('auth.register.failed')}
            </ReusableText>
          ) : null}

          <ReusableBtn
            label={t('auth.register.submit')}
            onPress={handleRegister}
            variant="primary"
            isLoading={isPending}
            isFullWidth
            height={60}
            borderRadius={BORDERRADIUS.pill}
            labelFontSize={FONTSIZE.md}
            testID="register-submit-btn"
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
            activeOpacity={0.7}
            testID="register-login-link"
          >
            <ReusableText
              fontSize={FONTSIZE.regular}
              themeColor="textMuted"
              textAlign="center"
            >
              {t('auth.register.have_account')}{' '}
              <ReusableText
                fontSize={FONTSIZE.regular}
                style={{ color: colors.primary, fontFamily: Fonts.bold }}
              >
                {t('auth.register.sign_in')}
              </ReusableText>
            </ReusableText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    height: 78,
    paddingHorizontal: SPACING.space_15,
    justifyContent: 'center',
  },
  logo: {
    width: 86,
    height: 38,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.space_15,
    paddingTop: SPACING.space_32,
    paddingBottom: SPACING.space_40,
  },
  form: {
    gap: SPACING.space_16,
  },
  submitBtn: {
    marginTop: SPACING.space_8,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: SPACING.space_8,
  },
});

export default RegisterScreen;
