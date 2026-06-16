/**
 * ParentalPinModal — full-screen gate for adult content (design `sParental`):
 * back header, a large lock icon, title + contextual subtitle, then the
 * `ParentalPinPad` (dots + keypad). Three modes:
 *   'verify' — enter PIN to unlock content. Local SHA-256 compare, no network.
 *   'set'    — enter a new PIN (enter → confirm) → hash + store on device.
 *   'change' — verify current PIN, then enter + confirm a new one.
 *
 * The PIN is DEVICE-LEVEL client-only (ParentalSlice, MMKV-persisted). The raw
 * digits are never stored — `hashPin` produces a SHA-256 hex digest before
 * calling `setParentalConfig`. `verifyPin` hashes the candidate and compares.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon, IconButton } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { hashPin, verifyPin } from '@/utils/pin';
import { ChevronLeftIcon, LockIcon } from '@/assets/icons';

import ParentalPinPad from './ParentalPinPad';

export type ParentalPinModalProps = {
  visible: boolean;
  mode: 'verify' | 'set' | 'change';
  onSuccess: () => void;
  onDismiss: () => void;
};

// For 'change': verify-current → enter-new → confirm-new
type ChangeStep = 'verify-current' | 'enter-new' | 'confirm-new';

const ParentalPinModal: React.FC<ParentalPinModalProps> = ({
  visible,
  mode,
  onSuccess,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const recordFailedAttempt = useAppStore((s) => s.recordFailedAttempt);
  const resetAttempts = useAppStore((s) => s.resetAttempts);
  const parentalPin = useAppStore((s) => s.parentalPin);
  const setParentalConfig = useAppStore((s) => s.setParentalConfig);

  const [isWrong, setIsWrong] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  // 'set' mode: holds the first entry while waiting for the confirm entry
  const [pendingPin, setPendingPin] = useState<string | null>(null);
  // 'change' mode step tracker
  const [changeStep, setChangeStep] = useState<ChangeStep>('verify-current');
  const [error, setError] = useState('');

  const flash = (wrong: boolean) => {
    setIsWrong(wrong);
    setTimeout(() => setIsWrong(false), 600);
  };

  const settleVerify = (ok: boolean) => {
    if (ok) {
      resetAttempts();
      onSuccess();
    } else {
      recordFailedAttempt();
      flash(true);
    }
  };

  // ── verify ─────────────────────────────────────────────────────────────────

  const handleVerify = async (pin: string) => {
    if (!parentalPin) return;
    setIsBusy(true);
    try {
      const ok = await verifyPin(pin, parentalPin);
      settleVerify(ok);
    } finally {
      setIsBusy(false);
    }
  };

  // ── set ────────────────────────────────────────────────────────────────────

  const handleSet = async (pin: string) => {
    if (pendingPin === null) {
      setPendingPin(pin);
      setError('');
      return;
    }
    if (pin !== pendingPin) {
      setPendingPin(null);
      setError(t('parental.mismatch'));
      flash(true);
      return;
    }
    setIsBusy(true);
    try {
      const hash = await hashPin(pin);
      setParentalConfig({ enabled: true, pin: hash });
      setPendingPin(null);
      setError('');
      onSuccess();
    } finally {
      setIsBusy(false);
    }
  };

  // ── change ─────────────────────────────────────────────────────────────────

  const handleChange = async (pin: string) => {
    if (changeStep === 'verify-current') {
      if (!parentalPin) return;
      setIsBusy(true);
      try {
        const ok = await verifyPin(pin, parentalPin);
        if (ok) {
          resetAttempts();
          setChangeStep('enter-new');
          setError('');
        } else {
          recordFailedAttempt();
          flash(true);
        }
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (changeStep === 'enter-new') {
      setPendingPin(pin);
      setChangeStep('confirm-new');
      setError('');
      return;
    }

    // confirm-new
    if (pin !== pendingPin) {
      setPendingPin(null);
      setChangeStep('enter-new');
      setError(t('parental.mismatch'));
      flash(true);
      return;
    }
    setIsBusy(true);
    try {
      const hash = await hashPin(pin);
      setParentalConfig({ pin: hash });
      setPendingPin(null);
      setChangeStep('verify-current');
      setError('');
      onSuccess();
    } finally {
      setIsBusy(false);
    }
  };

  // ── subtitle ───────────────────────────────────────────────────────────────

  const subtitle = (() => {
    if (mode === 'verify') return t('parental.message');
    if (mode === 'set') return pendingPin === null ? t('parental.set_new') : t('parental.confirm');
    // change
    if (changeStep === 'verify-current') return t('parental.change_verify_current');
    if (changeStep === 'enter-new') return t('parental.set_new');
    return t('parental.confirm');
  })();

  const handler = mode === 'verify' ? handleVerify : mode === 'set' ? handleSet : handleChange;

  const handleDismiss = () => {
    setPendingPin(null);
    setChangeStep('verify-current');
    setError('');
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      transparent
    >
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconButton onPress={handleDismiss} testID="parental-modal-dismiss">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        </View>

        <View style={styles.body}>
          <View style={[styles.iconTile, { backgroundColor: colors.surfaceElevated }]}>
            <Icon as={LockIcon} size={34} color={colors.primary} />
          </View>

          <ReusableText variant="heading2" themeColor="text" textAlign="center" style={styles.title}>
            {t('parental.title')}
          </ReusableText>
          <ReusableText variant="body" themeColor="textMuted" textAlign="center" style={styles.subtitle}>
            {subtitle}
          </ReusableText>

          {error ? (
            <ReusableText fontSize={FONTSIZE.sm} themeColor="error" textAlign="center" style={styles.error}>
              {error}
            </ReusableText>
          ) : null}

          {isBusy ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : (
            <ParentalPinPad onComplete={handler} isWrong={isWrong} />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_12,
    height: 56,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.space_24,
  },
  iconTile: {
    width: 80,
    height: 80,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.space_20,
  },
  title: {
    marginBottom: SPACING.space_4,
  },
  subtitle: {
    maxWidth: 300,
    marginBottom: SPACING.space_12,
  },
  error: {
    marginBottom: SPACING.space_8,
  },
  spinner: {
    marginTop: SPACING.space_24,
  },
});

export default ParentalPinModal;