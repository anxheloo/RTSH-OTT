/**
 * `scaled()` — applies the device-class STEP multiplier (`UI_SCALE`) to a design
 * token, rounded to the nearest physical pixel so we never emit fractional sizes.
 *
 * Resolved ONCE at module load (static for the session), unlike the grid which
 * is reactive. This is deliberate: typography/spacing that jumps mid-session
 * (rotation, split-view resize) is jarring, and a device's class effectively
 * never changes while the app is open. Apply this at the TOKEN layer (FONTSIZE,
 * SPACING, primitive size tables) — never per-component — so the whole app
 * scales consistently from one source.
 *
 * On phones `UI_SCALE.phone === 1`, so `scaled(n) === n`: the phone UI is
 * unchanged. Only tablet/TV see the step.
 */
import { Dimensions, PixelRatio } from 'react-native';

import { UI_SCALE } from './breakpoints';
import { getDeviceClass } from './deviceClass';

const { width, height } = Dimensions.get('window');

/** The resolved per-session UI scale step for this device class. */
export const UI_SCALE_FACTOR = UI_SCALE[getDeviceClass(width, height)];

/** Scale a token value by the device-class step, snapped to a physical pixel. */
export const scaled = (size: number): number =>
  PixelRatio.roundToNearestPixel(size * UI_SCALE_FACTOR);
