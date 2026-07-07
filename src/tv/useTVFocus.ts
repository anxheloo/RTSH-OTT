/**
 * Tracks D-pad focus for a single focusable control on TV.
 *
 * `react-native-tvos` fires `onFocus`/`onBlur` on `Pressable`/`Touchable` when
 * the focus engine lands on / leaves a control. We track that in local state so
 * a component can render a focus ring (see `tvFocusHighlight`). The fork DOES
 * expose a `focused` flag on the Pressable style/children callback, but it is
 * NOT in the TS types (`PressableStateCallbackType` only declares `pressed`),
 * so we drive styling off these typed `onFocus`/`onBlur` props instead.
 *
 * Inert off-TV: on phone/tablet those handlers never fire, so `focused` stays
 * `false` and consumers render exactly as before.
 *
 * Spread `focusProps` onto the control and use `focused` for the ring:
 *   const { focused, focusProps } = useTVFocus();
 *   <TouchableOpacity {...focusProps} style={[s.row, tvFocusHighlight(colors.focus, focused)]} />
 */
import { useState } from 'react';

export interface TVFocusState {
  focused: boolean;
  focusProps: { onFocus: () => void; onBlur: () => void };
}

export const useTVFocus = (): TVFocusState => {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    focusProps: {
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
};
