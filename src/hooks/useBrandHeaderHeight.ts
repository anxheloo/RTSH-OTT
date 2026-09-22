/**
 * Total height of the floating brand top bar, including the top safe-area inset.
 * `BrandHeader` is `position: absolute`, so screens must pad their scroll content
 * top by this amount to let content scroll UNDER the frosted bar instead of
 * hiding behind it. The top-edge mirror of `useTabBarHeight`.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BRAND_HEADER_BASE_HEIGHT,
  BRAND_HEADER_CONTENT_GAP,
  STORE_UPDATE_BANNER_HEIGHT,
} from '@/theme/header';
import { STORE_UPDATE_MODE } from '@/constants/appUpdate';

// The store-update strip sits under the header, so it is part of what content must clear.
const bannerHeight = STORE_UPDATE_MODE === 'notice' ? STORE_UPDATE_BANNER_HEIGHT : 0;

export const useBrandHeaderHeight = (): number => {
  const insets = useSafeAreaInsets();
  return BRAND_HEADER_BASE_HEIGHT + insets.top + bannerHeight + BRAND_HEADER_CONTENT_GAP;
};
