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

const VARIANTS: Record<TextVariant, VariantSpec> = {
  heading1: { fontSize: 26, fontWeight: 'bold', lineHeight: 32 },
  heading2: { fontSize: 22, fontWeight: 'semiBold', lineHeight: 28 },
  heading3: { fontSize: 20, fontWeight: 'semiBold', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: 'regular', lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: 'regular', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: 'regular', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: 'medium', lineHeight: 16 },
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
