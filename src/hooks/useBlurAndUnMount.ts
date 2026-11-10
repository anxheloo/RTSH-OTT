/**
 * NOT CURRENTLY USED — parked utility, ported from the RTSH project (2026-06-12).
 *
 * Runs callbacks on navigation-leave events for the current route:
 * - `onBlur` — the screen lost focus (navigated away but possibly still
 *   mounted, e.g. behind a pushed screen or another tab).
 * - `onFocus` — the screen regained focus.
 *
 * Prefer `useFocusEffect` (expo-router) for plain focus/blur *side effects* —
 * its cleanup-on-blur shape covers most cases with less ceremony. Reach for
 * this hook only when you want discrete named callbacks. To BLOCK an exit
 * (confirm-before-leave, unsaved-changes guards) use expo-router's
 * `usePreventRemove`: SDK 58's router dropped the `beforeRemove` event this hook
 * used to forward. Note: the AdOverlay's "can't leave for N seconds" does NOT
 * need this — it's a `Modal`, which blocks navigation underneath natively.
 *
 * Improvements over the RTSH original: named callbacks instead of
 * `action1/2/3`, no `any`-typed navigation, listeners actually removed on
 * unmount (the original's `useFocusEffect` returned an empty cleanup), and a
 * latest-ref so inline callbacks don't re-subscribe every render.
 */
import { useEffect, useRef } from 'react';

import { useNavigation } from 'expo-router';

interface UseBlurAndUnMountOptions {
  onBlur?: () => void;
  onFocus?: () => void;
}

export function useBlurAndUnMount({ onBlur, onFocus }: UseBlurAndUnMountOptions) {
  const navigation = useNavigation();

  // Latest-ref: callers can pass inline arrows without churning the listeners.
  const callbacksRef = useRef({ onBlur, onFocus });
  useEffect(() => {
    callbacksRef.current = { onBlur, onFocus };
  });

  useEffect(() => {
    const subs = [
      navigation.addListener('blur', () => callbacksRef.current.onBlur?.()),
      navigation.addListener('focus', () => callbacksRef.current.onFocus?.()),
    ];
    return () => subs.forEach((unsubscribe) => unsubscribe());
  }, [navigation]);
}
