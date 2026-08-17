/**
 * Single-modal renderer for the `ModalSlice` (`currentModal` + `modalData`).
 * Generic alert sheet — title + description + up to three buttons — covering the
 * alert-style modal types. Structural modals (e.g. a future language/quality
 * picker) can be added with a `switch (currentModal)` branch here.
 *
 * Owns the default i18n copy per type so triggers (e.g. the network listener)
 * can fire `updateModalSlice({ currentModal: 'noInternet' })` with no text.
 */
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BORDERRADIUS, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { openStoreListing } from '@/utils/device';
import { isTV } from '@/tv';

import ReusableBtn from './Buttons/ReusableBtn';
import ReusableText from './Inputs/ReusableText';

const ModalWrapper: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const currentModal = useAppStore((s) => s.currentModal);
  const modalData = useAppStore((s) => s.modalData);
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);

  if (!currentModal) return null;

  const close = () => updateModalSlice({ currentModal: null });
  // Force a choice on confirmation/notify; alerts dismiss on backdrop tap.
  const dismissable = currentModal === 'apiError' || currentModal === 'noInternet';
  // 426 force-update is the one modal the user can never leave — the CTA opens
  // the store listing and the modal stays up until the app is updated.
  const blocking = currentModal === 'forceUpdate';

  const title =
    modalData.title ||
    (currentModal === 'apiError'
      ? t('common.error')
      : currentModal === 'noInternet'
        ? t('offline.title')
        : currentModal === 'forceUpdate'
          ? t('update.title')
          : '');

  const description =
    modalData.description ||
    (currentModal === 'apiError'
      ? t('errors.api_default')
      : currentModal === 'noInternet'
        ? t('offline.message')
        : currentModal === 'forceUpdate'
          ? t('update.message')
          : '');

  const run = (action?: () => void | Promise<void>) => async () => {
    await action?.();
    if (!blocking) close();
  };

  // Buttons stack vertically, full-width — a label (Albanian copy runs ~30%
  // longer) always gets the room it needs and never wraps inside a narrow capsule.
  type Btn = { label: string; action?: () => void | Promise<void> };
  const secondaries: Btn[] = [];
  if (modalData.button2) secondaries.push({ label: modalData.button2, action: modalData.action2 });
  if (modalData.button3) secondaries.push({ label: modalData.button3, action: modalData.action3 });

  const primaryLabel = modalData.button ?? (blocking ? t('update.cta') : t('common.ok'));
  const primaryAction = modalData.action ?? (blocking ? openStoreListing : undefined);
  const showIconStrip = currentModal === 'apiError' || currentModal === 'noInternet';

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={blocking ? () => {} : close}
      statusBarTranslucent
    >
      {/*
        `focusable={!isTV}`: these two wrappers exist only to catch backdrop taps
        and to swallow taps on the sheet. On TV they are focusable ancestors of
        the buttons, which traps the D-pad on the wrapper and leaves every action
        unreachable — the app-wide failure device-verified 2026-08-17 (logout,
        delete account, retry, and the force-update CTA could all be SEEN but
        never pressed). Same trap and same fix already documented in
        STYLE_GUIDE.md → "Nested focusables trap the D-pad" and applied to
        RadioMiniPlayer / PlayerControls; this component was missed.
        Touch is unaffected — `focusable` is Android-focus only and both keep
        their onPress.
      */}
      <TouchableOpacity
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        activeOpacity={1}
        focusable={isTV ? false : undefined}
        onPress={dismissable ? close : undefined}
        accessibilityRole={dismissable ? 'button' : undefined}
        accessibilityLabel={dismissable ? t('common.close') : undefined}
      >
        <TouchableOpacity
          activeOpacity={1}
          focusable={isTV ? false : undefined}
          style={[styles.sheet, { backgroundColor: colors.surface }]}
        >
          {showIconStrip && <View style={[styles.iconStrip, { backgroundColor: colors.error }]} />}

          <View style={styles.body}>
            {!!title && (
              <ReusableText variant="heading3" themeColor="text" textAlign="center" style={styles.title}>
                {title}
              </ReusableText>
            )}

            {!!description && (
              <ReusableText variant="body" themeColor="textMuted" textAlign="center" style={styles.message}>
                {description}
              </ReusableText>
            )}

            <View style={styles.actions}>
              <ReusableBtn
                label={primaryLabel}
                variant={currentModal === 'confirmation' ? 'destructive' : 'primary'}
                size="medium"
                isFullWidth
                // The modal is a separate RN <Modal> window: unfocusing the
                // wrappers above is necessary but not sufficient — without an
                // explicit initial target nothing inside is focused at all and
                // the D-pad has no entry point. Gated so no focus is requested
                // on touch builds.
                hasTVPreferredFocus={isTV ? true : undefined}
                onPress={run(primaryAction)}
              />
              {secondaries.map((b) => (
                <ReusableBtn
                  key={b.label}
                  label={b.label}
                  variant="ghost"
                  size="medium"
                  isFullWidth
                  onPress={run(b.action)}
                />
              ))}
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
    gap: SPACING.space_12,
  },
});

export default ModalWrapper;
