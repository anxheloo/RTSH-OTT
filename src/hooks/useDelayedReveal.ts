/**
 * useDelayedReveal — returns `true` once `delayMs` has elapsed while `ready`
 * stays true. The timer is armed when `ready` flips true and cancelled if it
 * flips back to false before firing.
 *
 * Used to hold an ad overlay back a couple of seconds after the screen has
 * rendered, so the ad eases in over the visible page instead of snapping up
 * the instant it's available (app-open + channel-change prerolls).
 *
 * Contract: once revealed, it does NOT reset on `ready` going false — callers
 * must AND `ready` into their own render gate (both prerolls do). This keeps
 * the hook a single arm-timer with no synchronous setState in the effect body.
 * Fine because every caller's `ready` is monotonic (true once, then false
 * permanently on dismiss/complete), so a re-arm never happens in practice.
 */
import { useEffect, useState } from 'react';

export function useDelayedReveal(ready: boolean, delayMs = 2500): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setRevealed(true), delayMs);
    return () => clearTimeout(id);
  }, [ready, delayMs]);

  return revealed;
}
