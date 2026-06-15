/**
 * ParentalPinModal — full-screen gate for adult content (design `sParental`):
 * back header, a large lock icon, title + contextual subtitle, then the
 * `ParentalPinPad` (dots + keypad). Two modes:
 *   'verify' — enter PIN to unlock content (local compare against `user.parentalPin.pin`).
 *   'set'    — enter a new PIN (confirm on second entry) → `POST /parental`.
 *
 * Content gating, not a credential (2026-06-15): the PIN rides on the user
 * object (backend + persisted MMKV), so verify is local — no network per check.
 */
import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useSetupParentalMutation } from '@/api/mutations';
import { Icon, IconButton } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { ChevronLeftIcon, LockIcon } from '@/assets/icons';

import ParentalPinPad from './ParentalPinPad';

export type ParentalPinModalProps = {
  visible: boolean;
  mode: 'verify' | 'set';
  onSuccess: () => void;
  onDismiss: () => void;
};

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
  const user = useAppStore((s) => s.user);
  const { mutate: setupPin } = useSetupParentalMutation();
  const [isWrong, setIsWrong] = useState(false);
  const [confirmPin, setConfirmPin] = useState<string | null>(null);
  const [error, setError] = useState('');

  const settleVerify = (ok: boolean) => {
    if (ok) {
      resetAttempts();
      setIsWrong(false);
      onSuccess();
    } else {
      setIsWrong(true);
      recordFailedAttempt();
      setTimeout(() => setIsWrong(false), 600);
    }
  };

  // Verify is a local compare — the PIN rides on the user object, so live
  // re-checks (every programme boundary) never hit the network.
  const handleVerify = (pin: string) => settleVerify(pin === user?.parentalPin?.pin);

  const handleSet = (pin: string) => {
    if (confirmPin === null) {
      setConfirmPin(pin);
      setError('');
      return;
    }
    if (pin !== confirmPin) {
      setConfirmPin(null);
      setError(t('parental.mismatch'));
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 600);
      return;
    }
    // The mutation persists (`POST /parental`) and mirrors `{ enabled, pin }`
    // onto the user object in its `onSuccess` (single source of truth), so the
    // gate is active immediately and survives reload (MMKV-persisted user).
    setupPin(pin, {
      onSuccess: () => {
        setConfirmPin(null);
        setError('');
        onSuccess();
      },
      onError: () => {
        setConfirmPin(null);
        setError(t('parental.error'));
      },
    });
  };

  const subtitle =
    mode === 'set'
      ? confirmPin === null
        ? t('parental.set_new')
        : t('parental.confirm')
      : t('parental.message');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      transparent
    >
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconButton onPress={onDismiss} testID="parental-modal-dismiss">
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

          <ParentalPinPad onComplete={mode === 'verify' ? handleVerify : handleSet} isWrong={isWrong} />
        </View>
      </View>
    </Modal>
  );
};

export default ParentalPinModal;

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
});
