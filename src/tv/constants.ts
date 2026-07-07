/**
 * TV runtime flag — true only on an Android TV / STB (leanback) build, i.e. an
 * `EXPO_TV=1` binary running on a TV device. Stays `false` on every phone/tablet
 * build, so anything gated on it is a guaranteed no-op for mobile/tablet.
 *
 * This is the *runtime* TV check (focus rings, D-pad handlers, 10-foot tweaks),
 * distinct from `@/responsive`'s window-size `deviceClass` and from
 * `utils/device.ts → getDeviceType()` (the backend device registry).
 */
import { Platform } from 'react-native';

export const isTV = Platform.isTV;
