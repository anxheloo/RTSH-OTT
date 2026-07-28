import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

import * as ScreenOrientation from 'expo-screen-orientation';

import { getDeviceClass } from '@/responsive';

/**
 * Orientation policy, by device class:
 *
 *   - PHONE  — portrait-only. Only the video player rotates to landscape, and
 *              only when the user taps the fullscreen (expand) control; there is
 *              NO sensor-driven auto-rotation (product decision).
 *   - TABLET — free rotation (2026-07-28). A big screen has room for both
 *              orientations, and Android 16 ignores orientation locks on any
 *              display ≥ sw600dp anyway (`setRequestedOrientation()` is a no-op
 *              there for targetSdk 36+), so locking a tablet was already fiction
 *              on current Android. Making it explicit keeps iOS consistent with
 *              what Android does regardless.
 *   - TV     — exempt: landscape natively, no portrait concept. Every call here
 *              is a no-op on `Platform.isTV`.
 *
 * `app.config.ts` deliberately keeps `orientation: 'default'` so iOS still
 * declares the landscape interface orientations the player needs to rotate into;
 * the per-class policy is applied at runtime by `useLockPortrait` (mounted at the
 * app root), not by the manifest. Locks are last-writer-wins, so the phone
 * player's landscape lock overrides the root portrait lock, and `exitFullscreen`
 * restores it.
 */

/**
 * Phone-vs-larger check for ORIENTATION decisions only.
 *
 * Reads `Dimensions.get('screen')` — the physical screen — not `'window'`, which
 * is what `useResponsive()` uses for layout. Orientation is a device-level
 * concern: an iPad in a narrow split-view window is still a tablet and must stay
 * free to rotate, even though its window classifies as `phone` for layout.
 */
const isPhone = (): boolean => {
  const { width, height } = Dimensions.get('screen');
  return getDeviceClass(width, height) === 'phone';
};

const lockLandscape = (): void => {
  if (!isPhone()) return;
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
};

/**
 * Restores the device's default orientation policy: portrait-locked on a phone,
 * free rotation on a tablet, untouched on TV.
 */
const lockPortrait = (): void => {
  if (Platform.isTV) return;
  if (!isPhone()) {
    // Tablet: hand rotation back to the sensor. `unlockAsync` reverts to what the
    // manifest/Info.plist declares (`orientation: 'default'` = all orientations).
    ScreenOrientation.unlockAsync().catch(() => {});
    return;
  }
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
};

/**
 * Applies the device's default orientation policy at runtime. Mount once at the
 * app root. On a PHONE this locks portrait — the thing that disables whole-app
 * auto-rotation while leaving the player free to lock landscape on demand. On a
 * TABLET it unlocks, so the app rotates with the device. No-op on TV.
 *
 * Name kept for the phone case (the only class it actually locks); see the
 * module JSDoc for the full per-class policy.
 */
export function useLockPortrait(): void {
  useEffect(() => {
    lockPortrait();
  }, []);
}

export interface FullscreenOrientation {
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
}

/**
 * Button-driven fullscreen for the player.
 *
 * PHONE: tapping expand locks the device to landscape; collapsing (or unmounting
 * while still fullscreen) restores portrait. State-driven, NOT sensor-driven —
 * physically rotating the phone does nothing, because the rest of the app stays
 * portrait.
 *
 * TABLET: the orientation calls are no-ops — the device already rotates freely,
 * so fullscreen only flips the UI and the video fills whichever orientation the
 * user is holding. Forcing landscape here would fight a rotation the user just
 * chose. Same on TV (no portrait concept).
 */
export function useFullscreenOrientation(): FullscreenOrientation {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Restore portrait if the player unmounts while still fullscreen (e.g. the user
  // navigates back via a route change rather than the collapse button).
  useEffect(() => () => lockPortrait(), []);

  const enterFullscreen = (): void => {
    lockLandscape();
    setIsFullscreen(true);
  };

  const exitFullscreen = (): void => {
    lockPortrait();
    setIsFullscreen(false);
  };

  const toggleFullscreen = (): void => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  };

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
