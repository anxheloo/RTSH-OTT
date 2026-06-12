/**
 * Reusable OTP step for the auth wizards (register verify + reset verify).
 * A single hidden `TextInput` drives the six display boxes (no per-box ref
 * juggling); auto-submits when full, with a resend countdown. Adapted from the
 * RTSH `OneTimePass` + `OTP` + `CountDown` components.
 *
 * The resend cooldown uses `useCountdown` (wall-clock default): the cooldown is
 * a server-side constraint, so time backgrounded still counts toward it.
 */
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useCountdown } from '@/hooks';
import ReusableBtn from '@/components/Buttons/ReusableBtn';
import ReusableText from '@/components/Inputs/ReusableText';

export interface OtpVerifyProps {
  /** Shown in the "code sent to …" hint. */
  email: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  isVerifying?: boolean;
  isResending?: boolean;
  errorText?: string;
  length?: number;
  resendSeconds?: number;
  testID?: string;
}

const OtpVerify: React.FC<OtpVerifyProps> = ({
  email,
  onVerify,
  onResend,
  isVerifying = false,
  isResending = false,
  errorText,
  length = 6,
  resendSeconds = 30,
  testID,
}) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const { remaining: seconds, isDone: canResend, restart } = useCountdown(resendSeconds);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    setCode(digits);
    if (digits.length === length) onVerify(digits);
  };

  const handleResend = () => {
    onResend();
    setCode('');
    restart();
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container} testID={testID}>
      <ReusableText variant="bodySmall" themeColor="textMuted" textAlign="center">
        {t('auth.otp.sent', { length, email })}
      </ReusableText>

      <Pressable style={styles.boxesRow} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length }).map((_, i) => {
          const isCursor = i === code.length;
          const borderColor = errorText
            ? colors.error
            : isCursor
              ? colors.primary
              : colors.border;
          return (
            <View
              key={i}
              style={[styles.box, { borderColor, backgroundColor: colors.inputBackground }]}
            >
              <ReusableText variant="heading3" style={{ color: colors.text }}>
                {code[i] ?? ''}
              </ReusableText>
            </View>
          );
        })}

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus
          caretHidden
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          style={styles.hiddenInput}
          testID={testID ? `${testID}-input` : undefined}
        />
      </Pressable>

      {errorText ? (
        <ReusableText variant="caption" themeColor="error" textAlign="center">
          {errorText}
        </ReusableText>
      ) : null}

      <ReusableBtn
        label={t('auth.otp.verify')}
        onPress={() => onVerify(code)}
        isLoading={isVerifying}
        isDisabled={code.length < length}
        isFullWidth
        size="large"
        testID={testID ? `${testID}-verify` : undefined}
      />

      <TouchableOpacity
        onPress={canResend ? handleResend : undefined}
        disabled={!canResend || isResending}
        activeOpacity={0.7}
        testID={testID ? `${testID}-resend` : undefined}
      >
        <ReusableText
          variant="bodySmall"
          themeColor={canResend && !isResending ? 'primary' : 'textMuted'}
          textAlign="center"
        >
          {isResending
            ? t('auth.otp.resending')
            : canResend
              ? t('auth.otp.resend')
              : t('auth.otp.resend_in', { seconds })}
        </ReusableText>
      </TouchableOpacity>
    </View>
  );
};

export default OtpVerify;

const styles = StyleSheet.create({
  container: {
    gap: SPACING.space_16,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.space_8,
  },
  box: {
    flex: 1,
    height: 56,
    borderRadius: BORDERRADIUS.radius_14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
