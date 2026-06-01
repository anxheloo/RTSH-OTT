/**
 * Renders a thin "no internet" banner when the device is offline. Self-
 * managed: subscribes to `useNetworkReconnect` and renders nothing when
 * online. Pass `isOffline` to override with a controlled value (useful for
 * tests / storybook).
 *
 * Mount near the top of the screen tree below any status-bar safe-area
 * spacer. Doesn't reserve layout space when hidden.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import type { ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';
import { useNetworkReconnect } from '@/hooks/useNetworkReconnect';

import ReusableText from '../Inputs/ReusableText';

export type OfflineBannerProps = {
  /** Override the auto-detected offline state. */
  isOffline?: boolean;
  /** Banner text. Defaults to a generic English string until i18n lands. */
  message?: string;
  /** Theme background token. Defaults to `'warning'`. */
  backgroundColor?: keyof ThemeColors;
  /** Theme text color token. Defaults to `'onPrimary'` (white). */
  textColor?: keyof ThemeColors;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const DEFAULT_MESSAGE = 'No internet connection';

const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  message = DEFAULT_MESSAGE,
  backgroundColor = 'warning',
  textColor = 'onPrimary',
  style,
  testID,
}) => {
  const network = useNetworkReconnect();
  const colors = useAppStore((s) => s.colors);

  const resolvedIsOffline = isOffline ?? !network.isOnline;
  if (!resolvedIsOffline) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: colors[backgroundColor] }, style]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <ReusableText variant="caption" themeColor={textColor} textAlign="center">
        {message}
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
