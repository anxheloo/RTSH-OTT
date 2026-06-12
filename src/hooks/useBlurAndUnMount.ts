/**
 * NOT CURRENTLY USED — parked utility, ported from the RTSH project (2026-06-12).
 *
 * Runs callbacks on navigation-leave events for the current route:
 * - `onBeforeRemove` — the screen is about to be popped/removed. The event
 *   exposes `preventDefault()`, so this is the hook for *blocking* an exit
 *   (confirm-before-leave, unsaved-changes guards).
 * - `onBlur` — the screen lost focus (navigated away but possibly still
 *   mounted, e.g. behind a pushed screen or another tab).
 * - `onFocus` — the screen regained focus.
 *
 * Prefer `useFocusEffect` (expo-router) for plain focus/blur *side effects* —
 * its cleanup-on-blur shape covers most cases with less ceremony. Reach for
 * this hook only when you need `beforeRemove` (exit blocking) or want discrete
 * named callbacks. Note: the AdOverlay's "can't leave for N seconds" does NOT
 * need this — it's a `Modal`, which blocks navigation underneath natively.
 *
 * Improvements over the RTSH original: named callbacks instead of
 * `action1/2/3`, no `any`-typed navigation, listeners actually removed on
 * unmount (the original's `useFocusEffect` returned an empty cleanup), and a
 * latest-ref so inline callbacks don't re-subscribe every render.
 */
import { useEffect, useRef } from 'react';

import { useNavigation } from 'expo-router';

/** Structural mirror of React Navigation's `beforeRemove` event (keeps the hook portable). */
export interface BeforeRemoveEvent {
  /** Call to block the navigation that triggered the removal. */
  preventDefault: () => void;
  data: { action: unknown };
}

interface UseBlurAndUnMountOptions {
  onBeforeRemove?: (e: BeforeRemoveEvent) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

export function useBlurAndUnMount({ onBeforeRemove, onBlur, onFocus }: UseBlurAndUnMountOptions) {
  const navigation = useNavigation();

  // Latest-ref: callers can pass inline arrows without churning the listeners.
  const callbacksRef = useRef({ onBeforeRemove, onBlur, onFocus });
  useEffect(() => {
    callbacksRef.current = { onBeforeRemove, onBlur, onFocus };
  });

  useEffect(() => {
    const subs = [
      navigation.addListener('beforeRemove', (e) => callbacksRef.current.onBeforeRemove?.(e)),
      navigation.addListener('blur', () => callbacksRef.current.onBlur?.()),
      navigation.addListener('focus', () => callbacksRef.current.onFocus?.()),
    ];
    return () => subs.forEach((unsubscribe) => unsubscribe());
  }, [navigation]);
}
