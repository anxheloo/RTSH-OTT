/**
 * Bottom tab-bar config — static, color-agnostic (SOLITAR `theme/tabBar.ts`
 * pattern). Dynamic colors (background, hairline, active/inactive tints) are
 * injected at `(tabs)/_layout.tsx` from the theme store; the translucent frosted
 * background is an `expo-blur` `BlurView`. Keeping the layout/typography here
 * makes the bar configurable from one place.
 */
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { Fonts, FONTSIZE } from './fonts';

type TabBarConfig = {
  tabBarStyle: ViewStyle;
  tabBarLabelStyle: TextStyle;
  tabBarItemStyle: ViewStyle;
  /** Tab glyph size in px. */
  iconSize: number;
};

/**
 * Tab-bar content height (above the bottom safe-area inset). The final bar
 * height is `TAB_BAR_BASE_HEIGHT + insets.bottom`, injected at the layout so the
 * floating bar clears the home indicator. Screens add the same total as bottom
 * content padding (via `useTabBarHeight`) so list content scrolls UNDER the bar.
 */
export const TAB_BAR_BASE_HEIGHT = 64;

export const TabBar: TabBarConfig = {
  tabBarStyle: {
    // Floating: content scrolls beneath the frosted bar. Height + paddingBottom
    // are injected at the layout from the safe-area inset.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Transparent so the BlurView background shows through; color injected per theme.
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBarLabelStyle: {
    fontFamily: Fonts.semiBold,
    fontSize: FONTSIZE.xs,
    marginTop: 2,
  },
  tabBarItemStyle: {
    paddingVertical: 4,
  },
  iconSize: 24,
};
