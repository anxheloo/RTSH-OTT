/**
 * NOT CURRENTLY USED — parked utility, ported from the RTSH project (2026-06-12).
 *
 * Runs callbacks when the soft keyboard shows/hides. The `KeyboardEvent` is
 * passed through — `e.endCoordinates.height` is the value you almost always
 * need (inset lists, reposition a footer).
 *
 * Scope note: this hook is for discrete show/hide *side effects* only. For
 * anything animated or layout-synced (toolbars tracking the keyboard, smooth
 * avoidance), use `react-native-keyboard-controller` — it's already in the
 * stack and animates with the keyboard frame instead of jumping after the
 * `did*` events fire.
 *
 * Improvements over the RTSH original: named callbacks instead of
 * `action1/2/3`, the event passed through (the original discarded the keyboard
 * height), and a latest-ref instead of an `exhaustive-deps` suppression — so
 * inline callbacks neither re-subscribe nor go stale.
 */
import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

interface UseKeyboardOptions {
  onShow?: (e: KeyboardEvent) => void;
  onHide?: (e: KeyboardEvent) => void;
}

export function useKeyboard({ onShow, onHide }: UseKeyboardOptions) {
  // Latest-ref: callers can pass inline arrows without churning the listeners.
  const callbacksRef = useRef({ onShow, onHide });
  useEffect(() => {
    callbacksRef.current = { onShow, onHide };
  });

  useEffect(() => {
    const subs = [
      Keyboard.addListener('keyboardDidShow', (e) => callbacksRef.current.onShow?.(e)),
      Keyboard.addListener('keyboardDidHide', (e) => callbacksRef.current.onHide?.(e)),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
}