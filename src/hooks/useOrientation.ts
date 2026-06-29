import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Orientation policy: the app is portrait-only. Only the video player rotates to
 * landscape, and only when the user taps the fullscreen (expand) control — there
 * is NO sensor-driven auto-rotation anywhere in the app (product decision).
 *
 * TV is exempt: it runs landscape natively and has no portrait concept, so every
 * lock here is a no-op on `Platform.isTV` (tablet/TV layout untouched).
 *
 * `app.config.ts` deliberately keeps `orientation: 'default'` so iOS still
 * declares the landscape interface orientations the player needs to rotate into;
 * the portrait default is enforced at runtime by `useLockPortrait` (mounted at
 * the app root), not by the manifest. Locks are last-writer-wins, so the player's
 * landscape lock overrides the root portrait lock, and `exitFullscreen` restores it.
 */

const lockLandscape = (): void => {
  if (Platform.isTV) return;
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
};

const lockPortrait = (): void => {
  if (Platform.isTV) return;
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
};

/**
 * Locks the app to portrait at runtime (non-TV). Mount once at the app root —
 * this is what disables whole-app auto-rotation while leaving the player free to
 * lock landscape on demand.
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
 * Button-driven fullscreen for the player. Tapping expand locks the device to
 * landscape; collapsing (or unmounting while still fullscreen) restores portrait.
 * State-driven, NOT sensor-driven — physically rotating the phone does nothing,
 * because the rest of the app stays portrait. On TV the orientation locks are
 * no-ops, so the toggle only flips the fullscreen UI.
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
