/**
 * App-wide text primitive. Wraps RN `Text` with variant + weight + color tokens
 * pulled from the theme. Use this instead of raw `<Text>` so a future design
 * change can re-skin the whole app by editing tokens, not call sites.
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import type { ThemeColors } from '@/theme/colors';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import { scaled } from '@/responsive';

export type TextVariant =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label';

export type FontWeight = keyof typeof Fonts;
export type TextAlign = 'auto' | 'left' | 'center' | 'right' | 'justify';

interface VariantSpec {
  fontSize: number;
  fontWeight: FontWeight;
  lineHeight: number;
}

// Type ramp from the designer HTML (Phase 22.2): headings 800, section/title 700,
// labels/links 600, body 400/500. This table is the canonical text scale.
// fontSize/lineHeight pass through `scaled()` so the ramp steps up on tablet/TV
// (phone factor is 1 → unchanged). See `responsive/scale.ts`.
const VARIANTS: Record<TextVariant, VariantSpec> = {
  heading1: { fontSize: scaled(25), fontWeight: 'extraBold', lineHeight: scaled(30) }, // welcome / large h2
  heading2: { fontSize: scaled(22), fontWeight: 'extraBold', lineHeight: scaled(28) },
  heading3: { fontSize: scaled(17), fontWeight: 'bold', lineHeight: scaled(22) }, // header / section title
  body: { fontSize: scaled(15), fontWeight: 'regular', lineHeight: scaled(21) },
  bodySmall: { fontSize: scaled(13), fontWeight: 'regular', lineHeight: scaled(18) },
  caption: { fontSize: scaled(12), fontWeight: 'regular', lineHeight: scaled(16) },
  label: { fontSize: scaled(14), fontWeight: 'semiBold', lineHeight: scaled(18) }, // labels / links / buttons
};

export type ReusableTextProps = Omit<TextProps, 'style'> & {
  children: React.ReactNode;
  /** Semantic shortcut. Sets defaults for `fontSize` / `lineHeight` / `fontWeight`. Defaults to `'body'`. */
  variant?: TextVariant;
  /** Explicit pixel size. Overrides the variant default. */
  fontSize?: number;
  /** Explicit line height in px. Overrides the variant default. */
  lineHeight?: number;
  /** Font family weight key. Overrides the variant default. */
  fontWeight?: FontWeight;
  /** Theme color token. Defaults to `'text'`. For raw hex, use `style={{ color }}`. */
  themeColor?: keyof ThemeColors;
  textAlign?: TextAlign;
  style?: StyleProp<TextStyle>;
};

const ReusableText: React.FC<ReusableTextProps> = ({
  children,
  variant = 'body',
  fontSize,
  lineHeight,
  fontWeight,
  themeColor = 'text',
  textAlign,
  style,
  ...rest
}) => {
  const colors = useAppStore((s) => s.colors);
  const spec = VARIANTS[variant];

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        {
          fontSize: fontSize ?? spec.fontSize,
          lineHeight: lineHeight ?? spec.lineHeight,
          fontFamily: Fonts[fontWeight ?? spec.fontWeight],
          color: colors[themeColor],
          textAlign,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

export default ReusableText;
