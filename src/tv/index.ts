/**
 * TV (Android TV / STB) support module — portable, self-contained
 * (`react` + `react-native` only). Everything here is a no-op off-TV, so
 * importing/using it never changes the phone/tablet UI.
 *
 * - `isTV`             — runtime leanback-build flag (`Platform.isTV`).
 * - `useTVFocus`       — track D-pad focus (onFocus/onBlur) for one control.
 * - `tvFocusHighlight` — focus highlight style (scale + ring; undefined off-TV / unfocused).
 * - `TVFocusZone`      — region focus coordinator (autoFocus + focus trapping).
 *
 * Distinct from `@/responsive` (window-size layout) and `utils/device.ts`
 * (backend device registry).
 */
export { isTV } from './constants';
export { TV_FOCUS_BORDER_WIDTH, TV_FOCUS_SCALE, tvFocusHighlight } from './focusRing';
export { default as TVFocusZone } from './TVFocusZone';
export { type TVFocusState, useTVFocus } from './useTVFocus';
