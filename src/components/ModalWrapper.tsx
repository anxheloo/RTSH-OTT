import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';

import ReusableBtn from './Buttons/ReusableBtn';
import ReusableText from './Inputs/ReusableText';

const ModalWrapper: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const modals = useAppStore((s) => s.modals);
  const closeModal = useAppStore((s) => s.closeModal);
  const closeAllModals = useAppStore((s) => s.closeAllModals);

  if (modals.length === 0) return null;

  const top = modals[modals.length - 1];
  const { id, type, payload } = top;

  const title =
    payload?.title ??
    (type === 'apiError'
      ? 'Something went wrong'
      : type === 'noInternet'
        ? 'No connection'
        : type === 'confirmation'
          ? 'Are you sure?'
          : 'Notice');

  const message =
    payload?.message ??
    (type === 'apiError'
      ? 'An error occurred. Please try again.'
      : type === 'noInternet'
        ? 'Check your internet connection and retry.'
        : undefined);

  const hasTwoActions = type === 'confirmation';

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => closeModal(id)}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => closeModal(id)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.surface }]}
        >
          {/* icon strip for known types */}
          {(type === 'apiError' || type === 'noInternet') && (
            <View style={[styles.iconStrip, { backgroundColor: colors.error }]} />
          )}

          <View style={styles.body}>
            <ReusableText
              variant="heading3"
              themeColor="text"
              textAlign="center"
              style={styles.title}
            >
              {title}
            </ReusableText>

            {!!message && (
              <ReusableText
                variant="body"
                themeColor="textMuted"
                textAlign="center"
                style={styles.message}
              >
                {message}
              </ReusableText>
            )}

            <View style={[styles.actions, hasTwoActions && styles.actionRow]}>
              {hasTwoActions && (
                <ReusableBtn
                  label={payload?.cancelLabel ?? 'Cancel'}
                  variant="ghost"
                  size="medium"
                  isFullWidth={false}
                  style={styles.actionBtn}
                  onPress={() => {
                    payload?.onCancel?.();
                    closeModal(id);
                  }}
                />
              )}
              <ReusableBtn
                label={payload?.confirmLabel ?? (hasTwoActions ? 'Confirm' : 'OK')}
                variant={type === 'confirmation' ? 'destructive' : 'primary'}
                size="medium"
                isFullWidth={!hasTwoActions}
                style={hasTwoActions ? styles.actionBtn : undefined}
                onPress={() => {
                  payload?.onConfirm?.();
                  if (hasTwoActions) closeModal(id);
                  else closeAllModals();
                }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.space_24,
  },
  sheet: {
    width: '100%',
    borderRadius: BORDERRADIUS.radius_14,
    overflow: 'hidden',
  },
  iconStrip: {
    height: 4,
    width: '100%',
  },
  body: {
    padding: SPACING.space_24,
    gap: SPACING.space_12,
  },
  title: {
    marginBottom: SPACING.space_4,
  },
  message: {
    marginBottom: SPACING.space_8,
  },
  actions: {
    marginTop: SPACING.space_8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.space_12,
  },
  actionBtn: {
    flex: 1,
  },
});

export default ModalWrapper;
