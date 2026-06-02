/**
 * Login screen — RTSH TANI auth entry point.
 * Layout verified against Figma screen 2 (2026-06-02).
 *
 * Flow:
 *   1. Local Zod validation via loginSchema.safeParse
 *   2. On success → useLoginMutation (stores refresh token in keychain,
 *      access token in store — Stack.Protected handles redirect)
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

import { router } from 'expo-router';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import { useLoginMutation } from '@/api/mutations/useLoginMutation';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import { loginSchema } from '@/features/auth/schemas';

type FieldErrors = {
  email?: string;
  password?: string;
};

const LoginScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { mutate: login, isPending, error: mutationError } = useLoginMutation();

  const handleLogin = () => {
    const result = loginSchema.safeParse({ email, password, rememberMe });
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
    login({ email: result.data.email, password: result.data.password });
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
          testID="login-header-logo"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form inputs */}
        <View style={styles.form}>
          <ReusableInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
            }}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            errorText={fieldErrors.email}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="login-email-input"
          />

          <ReusableInput
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
            }}
            placeholder="Password"
            isPassword
            autoComplete="current-password"
            errorText={fieldErrors.password}
            height={60}
            borderRadius={BORDERRADIUS.pill}
            testID="login-password-input"
          />

          {/* Remember Me + Forgot Password row */}
          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={styles.rememberMe}
              onPress={() => setRememberMe((v) => !v)}
              activeOpacity={0.8}
              testID="login-remember-me"
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: rememberMe ? colors.primary : 'transparent',
                    borderColor: rememberMe ? colors.primary : colors.textMuted,
                  },
                ]}
              />
              <ReusableText
                fontSize={FONTSIZE.md}
                style={{ color: colors.text, fontFamily: Fonts.regular }}
              >
                Remember Me
              </ReusableText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot')}
              activeOpacity={0.7}
              testID="login-forgot-password"
            >
              <ReusableText
                fontSize={FONTSIZE.md}
                style={{ color: colors.text, fontFamily: Fonts.regular }}
              >
                Forgot Password?
              </ReusableText>
            </TouchableOpacity>
          </View>

          {/* API error */}
          {mutationError ? (
            <ReusableText
              variant="caption"
              themeColor="error"
              textAlign="center"
              style={styles.apiError}
            >
              {(mutationError as Error).message ?? 'Login failed. Please try again.'}
            </ReusableText>
          ) : null}

          {/* Login button */}
          <ReusableBtn
            label="Login"
            onPress={handleLogin}
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
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.7}
            testID="login-register-link"
          >
            <ReusableText
              fontSize={FONTSIZE.regular}
              themeColor="textMuted"
              textAlign="center"
            >
              Don&apos;t have an account?{' '}
              <ReusableText
                fontSize={FONTSIZE.regular}
                style={{ color: colors.primary, fontFamily: Fonts.bold }}
              >
                Sign up
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  loginBtn: {
    marginTop: SPACING.space_8,
  },
  apiError: {
    marginTop: -SPACING.space_8,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: SPACING.space_8,
  },
});

export default LoginScreen;
