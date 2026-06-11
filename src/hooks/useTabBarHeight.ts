/**
 * Total height of the floating bottom tab bar, including the bottom safe-area
 * inset. The bar is `position: absolute`, so screens must pad their scroll
 * content by this amount to let content scroll UNDER the frosted bar instead of
 * hiding behind it. Single source of truth shared with `(tabs)/_layout.tsx`,
 * which sizes the bar from the same constant.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_BASE_HEIGHT } from '@/theme/tabBar';

export const useTabBarHeight = (): number => {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + insets.bottom;
};
