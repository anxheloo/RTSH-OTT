/**
 * Renders a thin "no internet" banner when the device is offline. Self-
 * managed: reads `isOnline` from the store (kept current by `useNetworkMonitor`)
 * and renders nothing when online. Pass `isOffline` to override with a
 * controlled value (useful for tests / storybook).
 *
 * Mount near the top of the screen tree below any status-bar safe-area
 * spacer. Doesn't reserve layout space when hidden.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';

import ReusableText from '../Inputs/ReusableText';

export type OfflineBannerProps = {
  /** Override the auto-detected offline state. */
  isOffline?: boolean;
  /** Override the banner text. Defaults to `t('offline.banner')`. */
  message?: string;
  /** Theme background token. Defaults to `'warning'`. */
  backgroundColor?: keyof ThemeColors;
  /** Theme text color token. Defaults to `'onPrimary'` (white). */
  textColor?: keyof ThemeColors;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  message,
  backgroundColor = 'warning',
  textColor = 'onPrimary',
  style,
  testID,
}) => {
  const isOnline = useAppStore((s) => s.isOnline);
  const colors = useAppStore((s) => s.colors);
  const { t } = useTranslation();
  const resolvedMessage = message ?? t('offline.banner');

  const resolvedIsOffline = isOffline ?? !isOnline;
  if (!resolvedIsOffline) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: colors[backgroundColor] }, style]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <ReusableText variant="caption" themeColor={textColor} textAlign="center">
        {resolvedMessage}
      </ReusableText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});

export default OfflineBanner;
