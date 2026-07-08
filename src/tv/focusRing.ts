/**
 * Focus highlight for a focusable control on TV.
 *
 * Applied ONLY when focused AND on TV (returns `undefined` otherwise — so an
 * unfocused control, and EVERY control off-TV, is byte-for-byte unchanged and
 * its own border/background is never clobbered). The highlight is a slight
 * scale-up + a brand focus ring + elevation: the `scale` makes the item "pop"
 * without reflowing siblings (transforms don't affect layout), `zIndex`/
 * `elevation` lift it above neighbours, and the 2px ring is the colour cue that
 * reads from across the room (10-foot UI).
 *
 * Apply it LAST in the control's style array so the ring wins while focused:
 *   style={[styles.card, tvFocusHighlight(colors.focus, focused)]}
 *
 * The `scale` bump is right for compact controls (cards, icon buttons) — it
 * makes them "pop". For **full-width** elements (a search bar, list rows) the
 * 1.05 scale pushes them past the screen edge → horizontal overflow, so pass
 * `{ scale: false }` there for a border-only ring (no size change).
 */
import type { ViewStyle } from 'react-native';

import { isTV } from './constants';

export const TV_FOCUS_SCALE = 1.05;
export const TV_FOCUS_BORDER_WIDTH = 2;

export interface TVFocusHighlightOptions {
  /** Apply the scale-up pop. Default true; set false for full-width elements. */
  scale?: boolean;
}

export const tvFocusHighlight = (
  color: string,
  focused: boolean,
  opts?: TVFocusHighlightOptions,
): ViewStyle | undefined => {
  if (!isTV || !focused) return undefined;
  return {
    ...(opts?.scale === false ? {} : { transform: [{ scale: TV_FOCUS_SCALE }] }),
    borderWidth: TV_FOCUS_BORDER_WIDTH,
    borderColor: color,
    elevation: 8,
    zIndex: 1,
  };
};
