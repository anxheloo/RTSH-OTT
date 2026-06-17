/**
 * Device-class classifier — the single source of "phone vs tablet vs TV" for
 * LAYOUT decisions. Pure function (no React) so both the reactive hook and the
 * static `scaled()` token helper consume the same logic.
 *
 * Classification is by SHORTEST side (`Math.min(width, height)`), not raw width:
 * the shortest side is the same in both orientations, so a rotated phone can't
 * masquerade as a tablet. See `TABLET_MIN_SHORTEST_SIDE`.
 *
 * NOTE: this reads the WINDOW, not the physical device — so an iPad in
 * split-view (narrow window) correctly classifies as `phone` for layout. That's
 * deliberate and correct for layout. Backend device-type reporting (physical
 * form factor, for the device registry) is a separate concern and lives in
 * `utils/device.ts` — do not unify the two.
 */
import { Platform } from 'react-native';

import { TABLET_MIN_SHORTEST_SIDE } from './breakpoints';

export type DeviceClass = 'phone' | 'tablet' | 'tv';

export const getDeviceClass = (width: number, height: number): DeviceClass => {
  if (Platform.isTV) return 'tv';
  const shortestSide = Math.min(width, height);
  return shortestSide >= TABLET_MIN_SHORTEST_SIDE ? 'tablet' : 'phone';
};
