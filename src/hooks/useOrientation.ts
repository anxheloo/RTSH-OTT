import { useEffect, useRef, useSyncExternalStore } from 'react';

import * as ScreenOrientation from 'expo-screen-orientation';

export type Orientation = 'portrait' | 'landscape' | 'unknown';

const toOrientation = (o: ScreenOrientation.Orientation): Orientation => {
  switch (o) {
    case ScreenOrientation.Orientation.PORTRAIT_UP:
    case ScreenOrientation.Orientation.PORTRAIT_DOWN:
      return 'portrait';
    case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
    case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
      return 'landscape';
    default:
      return 'unknown';
  }
};

let cached: Orientation = 'unknown';
const subscribers = new Set<() => void>();

const set = (o: Orientation): void => {
  // Ignore a late `unknown` (device laid flat) once a real orientation is known
  // — keeps the last portrait/landscape so consumers (e.g. fullscreen players)
  // don't flip when the phone goes flat. The only `unknown` ever surfaced is the
  // initial value before `getOrientationAsync` resolves.
  if (o === 'unknown' && cached !== 'unknown') return;
  if (o === cached) return;
  cached = o;
  subscribers.forEach((fn) => fn());
};

let initialized = false;
const initialize = (): void => {
  if (initialized) return;
  initialized = true;

  ScreenOrientation.getOrientationAsync().then((o) => set(toOrientation(o)));
  ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) =>
    set(toOrientation(orientationInfo.orientation)),
  );
};

const subscribe = (cb: () => void): (() => void) => {
  initialize();
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
};

const getSnapshot = (): Orientation => cached;

/**
 * Subscribe to device orientation. Returns coarse `portrait | landscape | unknown`.
 * Single shared subscription across mounts.
 */
export function useOrientation(): Orientation {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Locks orientation to the given mode on mount, restores default on unmount.
 * Use in fullscreen player / landscape-only screens.
 *
 * Errors are swallowed — orientation lock is unsupported on iPad split-view
 * and some Android OEMs, where failures are expected and harmless.
 */
export function useLockOrientationOnMount(
  lock: ScreenOrientation.OrientationLock = ScreenOrientation.OrientationLock.LANDSCAPE,
): void {
  useEffect(() => {
    ScreenOrientation.lockAsync(lock).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [lock]);
}

/** After a manual exit, how long to hold forced-portrait before re-arming the
 * sensor — long enough for the user to lower the phone so auto-rotate doesn't
 * instantly re-enter fullscreen. */
const REARM_DELAY_MS = 1500;

export interface FullscreenOrientation {
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
}

/**
 * Drives a player's fullscreen state from the device orientation: rotating to
 * landscape enters fullscreen, rotating back to portrait exits (YouTube/Netflix
 * pattern). Built on `useOrientation`, so it shares the single orientation
 * subscription rather than adding its own listener.
 *
 * - `'unknown'` (phone lying flat) is ignored, so laying the device down
 *   mid-watch never drops fullscreen.
 * - `toggleFullscreen` / `enterFullscreen` FORCE an orientation via a lock —
 *   for users who want fullscreen without physically rotating. The orientation
 *   then flows back through `useOrientation`, so the manual and sensor paths
 *   converge on one source of truth (`isFullscreen`).
 * - `exitFullscreen` forces portrait, then re-arms the sensor after a short
 *   delay so a later physical rotation can re-enter fullscreen.
 * - The lock is released on unmount so sibling screens aren't stranded landscape.
 */
export function useFullscreenOrientation(): FullscreenOrientation {
  const orientation = useOrientation();
  const reArmRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pure derive — `useOrientation` is sticky (it never reports `unknown` once a
  // real orientation is known, see `set`), so landscape ⇔ fullscreen with no
  // state or effect, and laying the phone flat won't drop fullscreen.
  const isFullscreen = orientation === 'landscape';

  useEffect(
    () => () => {
      if (reArmRef.current) clearTimeout(reArmRef.current);
      ScreenOrientation.unlockAsync().catch(() => {});
    },
    [],
  );

  const enterFullscreen = (): void => {
    if (reArmRef.current) {
      clearTimeout(reArmRef.current);
      reArmRef.current = null;
    }
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  };

  const exitFullscreen = (): void => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      .then(() => {
        if (reArmRef.current) clearTimeout(reArmRef.current);
        reArmRef.current = setTimeout(() => {
          ScreenOrientation.unlockAsync().catch(() => {});
        }, REARM_DELAY_MS);
      })
      .catch(() => {});
  };

  const toggleFullscreen = (): void => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  };

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
