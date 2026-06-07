/**
 * RTSH brand mark — the red square logo with the knocked-out "RTSH" letters and
 * the offset corner bracket. Thin sizing wrapper over the raw `rtsh-logo.svg`
 * (react-native-svg-transformer). The square/letters/bracket stay brand red
 * (#EB122F); the letters are knocked out and back-filled with `currentColor`, so
 * `letterColor` keeps them readable on any surface (white default). Square — pass
 * `size`. For the full lockup (mark + wordmark) use `RtshLogoFull`.
 */
import React from 'react';

import RtshLogoSvg from './rtsh-logo.svg';

export interface RtshLogoProps {
  /** Width and height in px (square). Default 40. */
  size?: number;
  /** Fill behind the knocked-out letters. Default white. */
  letterColor?: string;
}

const RtshLogo: React.FC<RtshLogoProps> = ({ size = 40, letterColor = '#FFFFFF' }) => (
  <RtshLogoSvg width={size} height={size} color={letterColor} />
);

export default RtshLogo;
