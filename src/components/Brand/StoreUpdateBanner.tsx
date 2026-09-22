/**
 * Store-update strip — rendered by `BrandHeader` directly under the brand row
 * while `STORE_UPDATE_MODE === 'notice'`. Deliberately not closable: it stays
 * until the user installs the newer store version, whose embedded bundle ships
 * with the switch 'off'. `useBrandHeaderHeight` adds `STORE_UPDATE_BANNER_HEIGHT`
 * in the same condition, so every screen already padded for the header clears it.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { STORE_UPDATE_BANNER_HEIGHT } from '@/theme/header';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import { openStoreListing } from '@/utils/device';
import { STORE_UPDATE_MODE } from '@/constants/appUpdate';
import { tvFocusHighlight, useTVFocus } from '@/tv';

const StoreUpdateBanner: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const { focused, focusProps } = useTVFocus();

  if (STORE_UPDATE_MODE !== 'notice') return null;

  // `market://` rejects on a device without the Play Store (some Android TV / STB).
  const handlePress = () => {
    openStoreListing().catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[
        styles.strip,
        { backgroundColor: colors.primary },
        tvFocusHighlight(colors.focus, focused, { scale: false }),
      ]}
      activeOpacity={0.8}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${t('update.notice_message')} ${t('update.cta')}`}
      testID="store-update-banner"
      {...focusProps}
    >
      <ReusableText
        fontSize={FONTSIZE.sm}
        themeColor="onPrimary"
        numberOfLines={1}
        style={styles.message}
      >
        {t('update.notice_message')}
      </ReusableText>
      <View style={[styles.cta, { backgroundColor: colors.onPrimary }]}>
        <ReusableText fontSize={FONTSIZE.sm} fontWeight="bold" themeColor="primary">
          {t('update.cta')}
        </ReusableText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  strip: {
    height: STORE_UPDATE_BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_12,
    paddingHorizontal: SCREEN_PADDING,
  },
  message: {
    flex: 1,
  },
  cta: {
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_14,
  },
});

export default StoreUpdateBanner;
