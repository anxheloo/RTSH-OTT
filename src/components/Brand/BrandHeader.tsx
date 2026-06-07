/**
 * Branded top bar — RTSH mark on the left, optional action slot on the right.
 * Matches the Figma home/login header (logo top-left, avatar top-right) and
 * replaces the hand-rolled header that Live and Auth screens each duplicated.
 *
 * Handles its own top safe-area inset. Background follows the theme
 * (`headerBackground`).
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { RtshLogoFull } from '@/assets/icons/Brand';

export interface BrandHeaderProps {
  /** Element rendered on the right (e.g. profile avatar). */
  rightSlot?: React.ReactNode;
  /** Logo lockup height in px. Default 26 (design header). */
  logoHeight?: number;
  /** Theme background token. Default `'headerBackground'`. */
  backgroundColor?: keyof ThemeColors;
  /** Content height below the safe-area inset. Default 78. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BrandHeader: React.FC<BrandHeaderProps> = ({
  rightSlot,
  logoHeight = 26,
  backgroundColor = 'headerBackground',
  height = 78,
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          height: height + insets.top,
          paddingTop: insets.top,
          backgroundColor: colors[backgroundColor],
        },
        style,
      ]}
      testID={testID}
    >
      <RtshLogoFull height={logoHeight} taglineColor={colors.text} />
      {rightSlot}
    </View>
  );
};

export default BrandHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.space_15,
  },
});
