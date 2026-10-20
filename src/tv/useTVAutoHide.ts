/**
 * Auto-hide for on-screen chrome on TV (the player controls). Visible while
 * `active` is false; once active, it hides after `timeoutMs` without a remote
 * key, and any key shows it again and restarts the countdown — the model (and
 * the 5s default) of Media3's `PlayerView`.
 *
 * Only key RELEASES count. react-native-tvos emits every key on press AND
 * release, plus `focus`/`blur` events with no key action: revealing on the
 * press would mount the controls while the key is still down, and the focus
 * move that hiding itself causes would reveal them again at once.
 *
 * The countdown lives in a ref, so a key press never re-renders the caller —
 * only the visible ↔ hidden flip does. A timeout that lands while inactive is
 * kept: if playback stops and resumes with no key in between (an ad break),
 * the chrome comes back hidden.
 *
 * Inert off-TV: always visible.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { type HWEvent, useTVEventHandler } from 'react-native';

import { isTV } from './constants';

export const TV_AUTO_HIDE_MS = 5000;

const ACTION_UP = 1;

export function useTVAutoHide(active: boolean, timeoutMs = TV_AUTO_HIDE_MS): boolean {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const restart = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs);
  }, [timeoutMs]);

  // Becoming active starts the countdown (playback starting, the guide closing).
  useEffect(() => {
    if (isTV && active) restart();
    return () => clearTimeout(timerRef.current);
  }, [active, restart]);

  const handler = useCallback(
    (evt: HWEvent) => {
      if (!isTV || evt.eventKeyAction !== ACTION_UP) return;
      setIdle(false);
      restart();
    },
    [restart],
  );
  useTVEventHandler(handler);

  return !(isTV && active && idle);
}
