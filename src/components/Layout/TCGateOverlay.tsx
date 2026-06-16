/**
 * Full-screen, non-dismissable T&C acceptance overlay.
 * Renders on top of all app content whenever the user is authenticated but
 * has not yet accepted the Terms of Service (`tcAcceptedAt === null`).
 *
 * Mounted once at root (alongside ModalWrapper) so it covers every screen.
 */
import React from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import * as WebBrowser from 'expo-web-browser';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { LINKS } from '@/config/links';

const TCGateOverlay: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const tcAcceptedAt = useAppStore((s) => s.tcAcceptedAt);
  const acceptTC = useAppStore((s) => s.acceptTC);
  const colors = useAppStore((s) => s.colors);

  const visible = isAuthenticated && tcAcceptedAt === null;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ReusableText variant="heading3" themeColor="text" textAlign="center" style={styles.title}>
            {t('tc.title')}
          </ReusableText>

          <ReusableText variant="body" themeColor="textMuted" textAlign="center" style={styles.summary}>
            {t('tc.summary')}
          </ReusableText>

          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(LINKS.TERMS)}
            activeOpacity={0.7}
            testID="tc-read-full"
            style={styles.linkRow}
          >
            <ReusableText fontSize={FONTSIZE.sm} themeColor="link">
              {t('tc.read_full')}
            </ReusableText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={acceptTC}
            activeOpacity={0.8}
            testID="tc-accept-btn"
          >
            <ReusableText fontSize={FONTSIZE.regular} themeColor="onPrimary" textAlign="center">
              {t('tc.accept')}
            </ReusableText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_24,
  },
  card: {
    width: '100%',
    borderRadius: BORDERRADIUS.radius_14,
    padding: SPACING.space_24,
    gap: SPACING.space_16,
  },
  title: {
    marginBottom: SPACING.space_4,
  },
  summary: {
    lineHeight: 22,
  },
  linkRow: {
    alignItems: 'center',
  },
  acceptBtn: {
    borderRadius: BORDERRADIUS.pill,
    paddingVertical: SPACING.space_15,
    marginTop: SPACING.space_8,
  },
});

export default TCGateOverlay;
