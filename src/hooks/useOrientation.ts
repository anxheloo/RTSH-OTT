import { useEffect, useSyncExternalStore } from 'react';

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
