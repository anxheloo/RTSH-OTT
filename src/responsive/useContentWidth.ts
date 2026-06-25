/**
 * Centered content-column style for large screens. Returns a `ViewStyle` that
 * caps a single column to `CONTENT_MAX_WIDTH[variant]` and centers it on
 * tablet / TV, and is a NO-OP on phones (empty object) so the phone UI stays
 * byte-for-byte unchanged.
 *
 * Reactive (via `useResponsive`) so it follows split-view resize and rotation —
 * an iPad in a narrow split-view window classifies as `phone` and goes
 * full-bleed, just like a real phone.
 *
 * Apply it to a single-column container so it doesn't stretch edge-to-edge:
 *   - a `ScrollView` / `FlashList` `contentContainerStyle`, or
 *   - a wrapping `<View>` around a form / list / player column, or
 *   - a `FlashList` `renderItem` row wrapper (centers each full-width row).
 *
 * Do NOT use it on a responsive GRID (Home) — a grid is meant to fill the wider
 * screen with more columns (`useResponsiveGrid`), not to be capped.
 */
import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';

import { CONTENT_MAX_WIDTH } from './breakpoints';
import { useResponsive } from './useResponsive';

/** Stable empty style for the phone path — avoids a new object each render. */
const PHONE: ViewStyle = {};

export const useContentWidth = (
  variant: keyof typeof CONTENT_MAX_WIDTH = 'content',
): ViewStyle => {
  const { deviceClass } = useResponsive();
  // Memoize so consumers that key off the returned style (useCallback deps,
  // memoized rows) get a stable reference instead of a fresh object each render.
  return useMemo<ViewStyle>(() => {
    if (deviceClass === 'phone') return PHONE;
    return { width: '100%', maxWidth: CONTENT_MAX_WIDTH[variant], alignSelf: 'center' };
  }, [deviceClass, variant]);
};
