/**
 * Types `import Glyph from './glyph.svg'` as a React component accepting
 * `react-native-svg` props (width / height / color / fill / stroke …), per the
 * react-native-svg-transformer setup in metro.config.js (Phase 22.3b).
 */
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
