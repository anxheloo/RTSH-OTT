/**
 * Total height of the floating brand top bar, including the top safe-area inset.
 * `BrandHeader` is `position: absolute`, so screens must pad their scroll content
 * top by this amount to let content scroll UNDER the frosted bar instead of
 * hiding behind it. The top-edge mirror of `useTabBarHeight`.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND_HEADER_BASE_HEIGHT, BRAND_HEADER_CONTENT_GAP } from '@/theme/header';

export const useBrandHeaderHeight = (): number => {
  const insets = useSafeAreaInsets();
  return BRAND_HEADER_BASE_HEIGHT + insets.top + BRAND_HEADER_CONTENT_GAP;
};
