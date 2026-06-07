/**
 * Icon — dynamic wrapper for the raw `.svg` glyphs in `@/assets/icons` (loaded
 * as components via `react-native-svg-transformer`). Pass the imported glyph as
 * `as` and size/recolor it freely:
 *
 *   <Icon as={HomeIcon} size={24} color={colors.text} />        // square
 *   <Icon as={HomeIcon} width={28} height={20} color="#fff" />  // custom w/h
 *
 * The glyphs ship with only a `viewBox` (no baked dimensions) and use
 * `currentColor`, so `width` / `height` / `color` are fully dynamic. `size` is a
 * shorthand for equal width+height; explicit `width`/`height` win.
 */
import React from 'react';
import { SvgProps } from 'react-native-svg';

export interface IconProps extends Omit<SvgProps, 'width' | 'height' | 'color'> {
  /** The imported SVG glyph component. */
  as: React.FC<SvgProps>;
  /** Shorthand for equal width + height. Default 24. */
  size?: number;
  /** Explicit width (overrides `size`). */
  width?: number | string;
  /** Explicit height (overrides `size`). */
  height?: number | string;
  /** Recolors the glyph (maps to `currentColor`). Default white. */
  color?: string;
}

const Icon: React.FC<IconProps> = ({
  as: Glyph,
  size = 24,
  width,
  height,
  color = '#FFFFFF',
  ...rest
}) => <Glyph width={width ?? size} height={height ?? size} color={color} {...rest} />;

export default Icon;
