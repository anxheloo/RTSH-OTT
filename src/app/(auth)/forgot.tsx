/**
 * Forgot Password screen — email input + send reset link.
 * Validates with forgotPasswordSchema before calling useForgotPasswordMutation.
 * On mutation success shows a confirmation message (no redirect — user stays to check email).
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
import { useAppStore } from '@/store/useAppStore';
import { useForgotPasswordMutation } from '@/api/mutations/useForgotPasswordMutation';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableInput from '@/components/Inputs/ReusableInput';
import ReusableText from '@/components/Inputs/ReusableText';
import { forgotPasswordSchema } from '@/features/auth/schemas';

const ForgotPasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const { mutate: sendReset, isPending, error: mutationError } = useForgotPasswordMutation();

  const handleSend = () => {
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return;
    }
    setEmailError(undefined);
    sendReset(
      result.data.email,
      { onSuccess: () => setSent(true) },
    );
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
          testID="forgot-header-logo"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <ReusableText
            variant="heading3"
            themeColor="text"
            style={styles.title}
          >
            {t('auth.forgot.title')}
          </ReusableText>

          <ReusableText
            variant="body"
            themeColor="textMuted"
            style={styles.subtitle}
          >
            {t('auth.forgot.subtitle')}
          </ReusableText>

          {sent ? (
            <View style={[styles.successBox, { backgroundColor: colors.surface }]}>
              <ReusableText
                variant="body"
                themeColor="success"
                textAlign="center"
              >
                {t('auth.forgot.success')}
              </ReusableText>
            </View>
          ) : (
            <>
              <ReusableInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailError) setEmailError(undefined);
                }}
                placeholder={t('auth.forgot.email_placeholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                errorText={emailError}
                height={60}
                borderRadius={BORDERRADIUS.pill}
                testID="forgot-email-input"
              />

              {mutationError ? (
                <ReusableText
                  variant="caption"
                  themeColor="error"
                  textAlign="center"
                >
                  {(mutationError as Error).message ?? t('auth.forgot.failed')}
                </ReusableText>
              ) : null}

              <ReusableBtn
                label={t('auth.forgot.submit')}
                onPress={handleSend}
                variant="primary"
                isLoading={isPending}
                isFullWidth
                height={60}
                borderRadius={BORDERRADIUS.pill}
                labelFontSize={FONTSIZE.md}
                testID="forgot-submit-btn"
                style={styles.submitBtn}
              />
            </>
          )}

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            activeOpacity={0.7}
            testID="forgot-back-link"
          >
            <ReusableText
              fontSize={FONTSIZE.regular}
              themeColor="textMuted"
              textAlign="center"
            >
              {t('auth.forgot.back_to')}{' '}
              <ReusableText
                fontSize={FONTSIZE.regular}
                style={{ color: colors.primary }}
              >
                {t('auth.forgot.sign_in')}
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
  title: {
    marginBottom: SPACING.space_4,
  },
  subtitle: {
    marginBottom: SPACING.space_8,
  },
  submitBtn: {
    marginTop: SPACING.space_8,
  },
  successBox: {
    borderRadius: BORDERRADIUS.radius_12,
    padding: SPACING.space_16,
  },
  backLink: {
    alignItems: 'center',
    marginTop: SPACING.space_8,
  },
});

export default ForgotPasswordScreen;
