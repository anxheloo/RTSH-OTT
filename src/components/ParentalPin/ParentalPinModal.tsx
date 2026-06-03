/**
 * ParentalPinModal — full-screen gate for adult content.
 * Handles two modes:
 *   'verify' — user enters PIN to unlock content.
 *   'set'    — user enters a new 4-digit PIN (confirm on second entry).
 *
 * Call `useParentalGate()` at call sites; this component is the renderer.
 */
import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { hashPin, verifyPin } from '@/utils/crypto';
import { PARENTAL_PIN_KEY } from '@/config/auth';
import { getFromKeychain, storeOnKeychain } from '@/services/keychain';

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
  const colors = useAppStore((s) => s.colors);
  const recordFailedAttempt = useAppStore((s) => s.recordFailedAttempt);
  const resetAttempts = useAppStore((s) => s.resetAttempts);
  const setIsPinSet = useAppStore((s) => s.setIsPinSet);
  const [isWrong, setIsWrong] = useState(false);
  const [confirmPin, setConfirmPin] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async (pin: string) => {
    const stored = await getFromKeychain(PARENTAL_PIN_KEY);
    if (!stored) {
      setError('PIN nuk u gjet. Vendos PIN-in nga cilësimet.');
      return;
    }
    const { hash, salt } = JSON.parse(stored) as { hash: string; salt: string };
    const ok = await verifyPin(pin, hash, salt);
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

  const handleSet = async (pin: string) => {
    if (confirmPin === null) {
      setConfirmPin(pin);
      setError('');
      return;
    }
    if (pin !== confirmPin) {
      setConfirmPin(null);
      setError('PIN-et nuk përputhen. Provo sërish.');
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 600);
      return;
    }
    const { hash, salt } = await hashPin(pin);
    await storeOnKeychain(PARENTAL_PIN_KEY, JSON.stringify({ hash, salt }));
    setIsPinSet(true);
    setConfirmPin(null);
    setError('');
    onSuccess();
  };

  const padTitle =
    mode === 'set'
      ? confirmPin === null
        ? 'Vendos PIN-in e ri'
        : 'Konfirmo PIN-in'
      : 'Vendos PIN-in';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            activeOpacity={0.7}
            testID="parental-modal-dismiss"
          >
            <ReusableText fontSize={FONTSIZE.md} themeColor="textMuted">✕</ReusableText>
          </TouchableOpacity>

          {error ? (
            <ReusableText
              fontSize={FONTSIZE.sm}
              themeColor="error"
              textAlign="center"
              style={styles.error}
            >
              {error}
            </ReusableText>
          ) : null}

          <ParentalPinPad
            onComplete={mode === 'verify' ? handleVerify : handleSet}
            isWrong={isWrong}
            title={padTitle}
          />
        </View>
      </View>
    </Modal>
  );
};

export default ParentalPinModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: SPACING.space_24,
    paddingTop: SPACING.space_15,
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_10,
  },
  error: {
    paddingHorizontal: SPACING.space_24,
    marginBottom: SPACING.space_10,
  },
});
