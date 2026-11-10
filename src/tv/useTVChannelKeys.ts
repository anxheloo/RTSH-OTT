/**
 * Remote CH± (and media next/previous) → a channel step. react-native-tvos maps
 * `KEYCODE_CHANNEL_UP/DOWN` to `channelUp`/`channelDown` and
 * `KEYCODE_MEDIA_NEXT/PREVIOUS` to `next`/`previous`, and emits every key on BOTH
 * press and release — so only the release (`eventKeyAction` 1, Android
 * `ACTION_UP`) counts; holding a key steps once, not once per repeat.
 *
 * Google TV remotes have no CH± keys; there the guide drawer stays the way to
 * change channel. D-pad up/down is deliberately NOT mapped — it moves focus.
 *
 * Inert off-TV: no TV events are emitted on a phone, and the handler checks
 * `isTV` anyway. `useTVEventHandler` re-subscribes whenever its callback changes,
 * so the callback is stable and reads the latest `onStep` from a ref.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useTVEventHandler } from 'react-native';

import { isTV } from './constants';

// RN 0.87's strict API dropped the `HWEvent` export; the handler's own parameter type is the contract.
// It types `eventKeyAction` as a string, but Android sends the KeyEvent action as a number
// (ReactAndroidHWInputDeviceHelper.kt), hence the `Number()` at each comparison.
type TVRemoteEvent = Parameters<Parameters<typeof useTVEventHandler>[0]>[0];

const STEP_BY_EVENT: Record<string, 1 | -1> = {
  channelUp: 1,
  next: 1,
  channelDown: -1,
  previous: -1,
};

const ACTION_UP = 1;

export function useTVChannelKeys(onStep: (dir: 1 | -1) => void, enabled = true): void {
  const onStepRef = useRef(onStep);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    onStepRef.current = onStep;
    enabledRef.current = enabled;
  }, [onStep, enabled]);

  const handler = useCallback((evt: TVRemoteEvent) => {
    if (!isTV || !enabledRef.current) return;
    const dir = STEP_BY_EVENT[evt.eventType];
    if (dir && Number(evt.eventKeyAction) === ACTION_UP) onStepRef.current(dir);
  }, []);

  useTVEventHandler(handler);
}
