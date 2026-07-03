/**
 * Branded top bar — RTSH mark on the left, optional action on the right.
 * The one shared header across every tab route (Kreu / Guida / Kërko / Profili)
 * so the top of the app reads identically everywhere.
 *
 * Floating + frosted, the top-edge mirror of the bottom tab bar: it's
 * `position: absolute` with an `expo-blur` background (iOS blurs; Android gets a
 * near-opaque solid, since a live blur needs a `blurTarget` we can't wire here),
 * so content scrolls UNDER it. Screens MUST pad their scroll content top by
 * `useBrandHeaderHeight()` — the exact counterpart of `useTabBarHeight()` at the
 * bottom — or the first item hides behind the bar. A bottom hairline (theme
 * `border`) marks the edge, matching `TabHeader`.
 *
 * Renders nothing on the right by default. Pass any ReactNode to `rightSlot`
 * to add a custom right action. Handles its own top safe-area inset. Pass
 * `onLogoPress` to make the mark tappable (tabs other than Home use it to jump
 * back to Kreu).
 */
import React from 'react';
import { Platform, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurView } from 'expo-blur';

import { BRAND_HEADER_BASE_HEIGHT } from '@/theme/header';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { RtshLogoFull } from '@/assets/icons/Brand';

export interface BrandHeaderProps {
  /** Optional right-side action. Omitted = nothing on the right. */
  rightSlot?: React.ReactNode;
  /** Makes the RTSH mark tappable (e.g. navigate back to Home). */
  onLogoPress?: () => void;
  /** Logo lockup height in px. Default 32 (design header). */
  logoHeight?: number;
  /** Content height below the safe-area inset. Default `BRAND_HEADER_BASE_HEIGHT`. */
  height?: number;
  /** Shows the bottom hairline border. Default: true. */
  showBottomBorder?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BrandHeader: React.FC<BrandHeaderProps> = ({
  rightSlot,
  onLogoPress,
  logoHeight = 32,
  height = BRAND_HEADER_BASE_HEIGHT,
  showBottomBorder = true,
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const mode = useAppStore((s) => s.mode);
  const insets = useSafeAreaInsets();

  const logo = <RtshLogoFull height={logoHeight} taglineColor={colors.text} />;

  return (
    <View
      style={[
        styles.container,
        {
          height: height + insets.top,
          paddingTop: insets.top,
          borderBottomWidth: showBottomBorder ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      {/* Frosted background — same glass as the bottom tab bar. iOS blurs the
          content behind; Android falls back to a near-opaque solid (a live blur
          needs a blurTarget ref we can't provide from here). */}
      {Platform.OS === 'ios' ? (
        <BlurView
          tint={mode === 'light' ? 'light' : 'dark'}
          intensity={40}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarSolid }]} />
      )}

      {onLogoPress ? (
        <TouchableOpacity
          onPress={onLogoPress}
          activeOpacity={0.7}
          accessibilityLabel="RTSH"
          testID={testID ? `${testID}-logo` : undefined}
        >
          {logo}
        </TouchableOpacity>
      ) : (
        logo
      )}
      {rightSlot}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SPACING.space_8,
  },
});

export default BrandHeader;
