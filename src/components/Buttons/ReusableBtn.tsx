/**
 * App-wide button primitive. Variants map to theme tokens (background + text
 * + border); sizes map to height + padding + label font size. Loading state
 * swaps the label for a spinner and disables press. Disabled state lowers
 * opacity and disables press.
 *
 * Like `ReusableText`, sizes are placeholders until design lands — pass
 * explicit `height` / `paddingHorizontal` / `labelFontSize` overrides at call
 * sites until the design system locks tokens.
 */
import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';

import type { ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';

import ReusableText, { FontWeight } from '../Inputs/ReusableText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';

interface VariantSpec {
  backgroundColor: keyof ThemeColors | 'transparent';
  textColor: keyof ThemeColors;
  borderColor?: keyof ThemeColors;
}

const VARIANTS: Record<ButtonVariant, VariantSpec> = {
  primary: { backgroundColor: 'primary', textColor: 'onPrimary' },
  secondary: { backgroundColor: 'surface', textColor: 'text', borderColor: 'border' },
  ghost: { backgroundColor: 'transparent', textColor: 'text' },
  destructive: { backgroundColor: 'error', textColor: 'onPrimary' },
};

interface SizeSpec {
  height: number;
  paddingHorizontal: number;
  labelFontSize: number;
  labelFontWeight: FontWeight;
  gap: number;
  spinnerSize: 'small' | 'large';
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  small: { height: 36, paddingHorizontal: 12, labelFontSize: 14, labelFontWeight: 'medium', gap: 6, spinnerSize: 'small' },
  medium: { height: 44, paddingHorizontal: 16, labelFontSize: 16, labelFontWeight: 'semiBold', gap: 8, spinnerSize: 'small' },
  large: { height: 52, paddingHorizontal: 20, labelFontSize: 18, labelFontWeight: 'semiBold', gap: 10, spinnerSize: 'small' },
};

export type ReusableBtnProps = Omit<TouchableOpacityProps, 'style' | 'disabled'> & {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Explicit pixel height. Overrides the size default. */
  height?: number;
  /** Explicit horizontal padding. Overrides the size default. */
  paddingHorizontal?: number;
  /** Explicit label font size. Overrides the size default. */
  labelFontSize?: number;
  /** Explicit label font weight. Overrides the size default. */
  labelFontWeight?: FontWeight;
  /** Explicit corner radius. Defaults to half of the resolved height (pill). */
  borderRadius?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ReusableBtn: React.FC<ReusableBtnProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  isDisabled = false,
  isFullWidth = false,
  leftIcon,
  rightIcon,
  height,
  paddingHorizontal,
  labelFontSize,
  labelFontWeight,
  borderRadius,
  testID,
  style,
  ...rest
}) => {
  const colors = useAppStore((s) => s.colors);
  const variantSpec = VARIANTS[variant];
  const sizeSpec = SIZES[size];

  const resolvedHeight = height ?? sizeSpec.height;
  const resolvedPaddingHorizontal = paddingHorizontal ?? sizeSpec.paddingHorizontal;
  const resolvedLabelFontSize = labelFontSize ?? sizeSpec.labelFontSize;
  const resolvedLabelFontWeight = labelFontWeight ?? sizeSpec.labelFontWeight;
  const resolvedBorderRadius = borderRadius ?? resolvedHeight / 2;

  const backgroundColor =
    variantSpec.backgroundColor === 'transparent'
      ? 'transparent'
      : colors[variantSpec.backgroundColor];
  const borderColor = variantSpec.borderColor ? colors[variantSpec.borderColor] : undefined;
  const textColor = colors[variantSpec.textColor];

  const isPressDisabled = isLoading || isDisabled;

  return (
    <TouchableOpacity
      {...rest}
      activeOpacity={0.8}
      onPress={isPressDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isPressDisabled, busy: isLoading }}
      testID={testID}
      style={[
        styles.base,
        {
          height: resolvedHeight,
          paddingHorizontal: resolvedPaddingHorizontal,
          borderRadius: resolvedBorderRadius,
          backgroundColor,
          opacity: isDisabled ? 0.5 : 1,
          width: isFullWidth ? '100%' : undefined,
          borderWidth: borderColor ? 1 : 0,
          borderColor,
          gap: sizeSpec.gap,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size={sizeSpec.spinnerSize} color={textColor} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <ReusableText
            fontSize={resolvedLabelFontSize}
            fontWeight={resolvedLabelFontWeight}
            style={{ color: textColor }}
          >
            {label}
          </ReusableText>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReusableBtn;
