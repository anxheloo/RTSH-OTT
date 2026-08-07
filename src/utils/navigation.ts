/**
 * Navigation helpers — the single source of truth for how a route is PRESENTED.
 *
 * Two families, and the split between them is load-bearing:
 *
 * - `getModalScreenOptions` — route-based sheets (decision 7 — native sheets,
 *   not `@gorhom`): a content-sized form sheet with a grabber and rounded top
 *   corners. Tune per sheet via `detents` / `cornerRadius`.
 * - `getPlayerScreenOptions` — the full-screen player routes, which LOOK modal
 *   but are deliberately card pushes. See its JSDoc for why that is not
 *   negotiable.
 *
 * THE RULE BEHIND BOTH: `presentation: 'modal' | 'formSheet' | 'fullScreenModal'`
 * makes a route a natively-presented view controller on iOS, and `ModalWrapper`
 * (app root) presents its RN `<Modal>` from that SAME root controller — the two
 * race. So a route may only take a native presentation if it never raises a
 * global modal. The sheets below qualify (they raise none); the players do not.
 */
import { BORDERRADIUS } from '@/theme/borders';

export interface ModalScreenOptionsConfig {
  /** Sheet detents — fractions of the screen, or 'fitToContents' (default). */
  detents?: number[] | 'fitToContents';
  /** Top corner radius (design sheets: 20–24). */
  cornerRadius?: number;
  /**
   * Sheet container background — pass `colors.surface`. REQUIRED in practice,
   * even though every sheet screen already paints its own root: the native sheet
   * container is taller than the measured content under `fitToContents`, and the
   * uncovered band at the bottom (over the home indicator) falls through to the
   * navigator's default background. That reads as a two-tone sheet with a
   * mismatched strip along the bottom edge. Painting the CONTAINER, not just the
   * content, is what closes it — no amount of `paddingBottom: insets.bottom` on
   * the screen fixes a band the screen does not own.
   */
  backgroundColor?: string;
}

export function getModalScreenOptions({
  detents = 'fitToContents',
  cornerRadius = BORDERRADIUS.radius_20,
  backgroundColor,
}: ModalScreenOptionsConfig = {}) {
  return {
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: cornerRadius,
    headerShown: false,
    ...(backgroundColor ? { contentStyle: { backgroundColor } } : null),
  } as const;
}

/**
 * The full-screen player routes (`channel/[id]`, `radio/[id]`).
 *
 * They read as modal — slide up from the bottom, swipe DOWN to dismiss — but
 * they are plain CARD pushes, and that is not a style choice:
 *
 * Both routes raise global modals. `useCellularGate` mounts on each, `noInternet`
 * fires on a mid-stream drop, and `apiError` on a failed playback fetch. Under
 * ANY native presentation (`fullScreenModal`, `modal`, `formSheet`) the route
 * becomes a second natively-presented view controller competing with
 * `ModalWrapper`'s RN `<Modal>` for the root controller — on iOS the loser is
 * orphaned: it flashes ~1s, then leaves an INVISIBLE full-screen modal window
 * swallowing every touch app-wide, surviving navigation because nothing clears
 * `currentModal`. This shipped once on `channel/[id]` via `fullScreenModal`.
 *
 * RETESTED 2026-08-07 on react-native-screens 4.26 / iOS 26.1 — STILL BROKEN, so
 * this is not stale legacy caution. `channel/[id]` was temporarily switched to
 * `formSheet` (`detents: [1]`) with a timer raising `noInternet` 3s after mount:
 * the sheet itself rendered fine, but the modal NEVER appeared, and returning via
 * the back button froze the app to touch. Re-probe with that same recipe at the
 * next SDK upgrade rather than assuming either outcome.
 *
 * The cost is the rounded top corners — those are a native-sheet affordance
 * (`sheetCornerRadius` on `formSheet`; UIKit's own radius on an iOS `modal`) and
 * cannot be had on a card push. Accepted trade: the gesture is the part users
 * actually feel. Lifting it means moving `ModalWrapper` off RN `<Modal>` first.
 *
 * The swipe-down comes from the gesture instead of the presentation:
 * `gestureDirection: 'vertical'` dismisses a card push downward, iOS-only.
 * `fullScreenGestureEnabled` is deliberately LEFT OFF (default `false`) so the
 * gesture only begins at the screen edge — a whole-screen vertical gesture would
 * fight the EPG `FlashList` scroll and the scrubber drag on `channel/[id]`.
 * Android keeps the hardware/gesture back, which is its idiom.
 */
export function getPlayerScreenOptions() {
  return {
    animation: 'slide_from_bottom',
    gestureEnabled: true,
    gestureDirection: 'vertical',
    headerShown: false,
  } as const;
}
