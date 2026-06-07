/**
 * RTSH full logo lockup — red mark + "RADIO TELEVIZIONI SHQIPTAR" wordmark.
 * Thin sizing wrapper over the raw `rtsh-logo-full.svg` (react-native-svg-transformer):
 * the mark stays brand red (#EB122F); the wordmark uses `currentColor`, so
 * `taglineColor` recolors it (white on dark, dark on light). Pass `height`;
 * width is derived from the source aspect ratio. For the compact square mark use
 * `RtshLogo`.
 */
import React from 'react';

import RtshLogoFullSvg from './rtsh-logo-full.svg';

/** Source viewBox width : height (496.791 / 217.07). */
const ASPECT = 2.2886;

export interface RtshLogoFullProps {
  /** Rendered height in px; width is derived from the aspect ratio. Default 28. */
  height?: number;
  /** Wordmark color (mark stays brand red). Default white. */
  taglineColor?: string;
}

const RtshLogoFull: React.FC<RtshLogoFullProps> = ({ height = 28, taglineColor = '#FFFFFF' }) => (
  <RtshLogoFullSvg height={height} width={Math.round(height * ASPECT)} color={taglineColor} />
);

export default RtshLogoFull;
