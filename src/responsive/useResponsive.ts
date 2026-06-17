/**
 * Reactive responsive info for LAYOUT — re-renders on rotation and split-view
 * resize via `useWindowDimensions` (RN core; no `expo-screen-orientation`
 * dependency, keeping this module portable). Returns the live device class +
 * orientation; consumers derive columns/visibility from it.
 *
 * Pairs with the static `scaled()` token helper: layout reacts to the live
 * window, typography is fixed per session. See `scale.ts` for why.
 */
import { useWindowDimensions } from 'react-native';

import { type DeviceClass,getDeviceClass } from './deviceClass';

export interface ResponsiveInfo {
  deviceClass: DeviceClass;
  isLandscape: boolean;
  width: number;
  height: number;
}

export const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();
  return {
    deviceClass: getDeviceClass(width, height),
    isLandscape: width > height,
    width,
    height,
  };
};
