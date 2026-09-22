/**
 * RTSH lowercase "rtsh" mark — red "rt" + a red disc with the "sh" knocked out.
 * Thin sizing wrapper over the raw `rtsh-wordmark.svg` (react-native-svg-transformer).
 * Single colour (#EE1332) with no theming prop: the "sh" is transparent, so it
 * takes whatever surface sits underneath (black on dark, white on light). Pass
 * `height`; width is derived from the source aspect ratio.
 */
import React from 'react';

import RtshWordmarkSvg from './rtsh-wordmark.svg';

/** Source viewBox width : height (458 / 300). */
const ASPECT = 1.527;

export interface RtshWordmarkProps {
  /** Rendered height in px; width is derived from the aspect ratio. Default 28. */
  height?: number;
}

const RtshWordmark: React.FC<RtshWordmarkProps> = ({ height = 28 }) => (
  <RtshWordmarkSvg height={height} width={Math.round(height * ASPECT)} />
);

export default RtshWordmark;
