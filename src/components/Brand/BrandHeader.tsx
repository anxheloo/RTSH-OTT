/**
 * Branded top bar — RTSH mark on the left, profile icon on the right.
 * The one shared header across every tab route (Kreu / Guida / Kërko / Profili)
 * so the top of the app reads identically everywhere.
 *
 * By default renders a profile icon button that navigates to the Profile tab.
 * Pass `rightSlot={null}` to suppress it (Profile screen itself does this).
 * Pass any ReactNode to override with a custom right action.
 *
 * Handles its own top safe-area inset. Background follows the theme
 * (`headerBackground`). Pass `onLogoPress` to make the mark tappable
 * (tabs other than Home use it to jump back to Kreu).
 */
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import type { ThemeColors } from '@/theme/colors';
import { SCREEN_PADDING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { ProfileIcon } from '@/assets/icons';
import { RtshLogoFull } from '@/assets/icons/Brand';
import { Icon, IconButton } from '@/components/Icons';

export interface BrandHeaderProps {
  /**
   * Override the right slot. Pass `null` to render nothing (e.g. Profile tab).
   * Omit to get the default profile icon button.
   */
  rightSlot?: React.ReactNode;
  /** Makes the RTSH mark tappable (e.g. navigate back to Home). */
  onLogoPress?: () => void;
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
  onLogoPress,
  logoHeight = 26,
  backgroundColor = 'headerBackground',
  height = 78,
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  const logo = <RtshLogoFull height={logoHeight} taglineColor={colors.text} />;

  const defaultRight = (
    <IconButton
      size={40}
      backgroundColor={colors.surface}
      onPress={() => router.push('/(app)/(tabs)/profile')}
      accessibilityLabel="Profili"
      testID={testID ? `${testID}-profile-btn` : 'header-profile-btn'}
    >
      <Icon as={ProfileIcon} size={20} color={colors.text} />
    </IconButton>
  );

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
      {rightSlot === undefined ? defaultRight : rightSlot}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
  },
});

export default BrandHeader;
