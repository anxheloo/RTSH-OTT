/**
 * App-wide button primitive. Variants map to theme tokens (background + text
 * + border); sizes map to height + padding + label typography. Loading keeps
 * the button's width (content goes invisible, spinner overlays) and disables
 * press. Disabled lowers opacity and disables press.
 *
 * Anything beyond variant/size goes through `style` (height, radius, width) —
 * it is applied last so it wins. Margins and positioning belong to the parent,
 * never here. The only project coupling is the `useAppStore` colors read.
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
import { useHaptic } from '@/hooks/useHaptic';

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
}

// Design (2026-06-06): primary CTA is a h54 capsule, bold label. `large` matches;
// borderRadius defaults to height/2 (capsule). small/medium are scale variants.
const SIZES: Record<ButtonSize, SizeSpec> = {
  small: { height: 40, paddingHorizontal: 14, labelFontSize: 14, labelFontWeight: 'semiBold', gap: 6 },
  medium: { height: 48, paddingHorizontal: 16, labelFontSize: 15, labelFontWeight: 'semiBold', gap: 8 },
  large: { height: 54, paddingHorizontal: 20, labelFontSize: 16, labelFontWeight: 'bold', gap: 8 },
};

export type ReusableBtnProps = Omit<TouchableOpacityProps, 'style' | 'disabled'> & {
  /** Plain string or a rendered element (e.g. a Trans node). */
  label: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  testID?: string;
  /**
   * Haptic intensity on press. Defaults to 'none' — opt-in only.
   * Use 'medium' for consequential CTAs (confirm, submit, destructive).
   * Use 'light' for low-stakes actions that still benefit from feedback.
   */
  haptic?: 'light' | 'medium' | 'none';
  /** Escape hatch for one-off layout (height, borderRadius, width). Applied last. */
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
  testID,
  haptic = 'none',
  style,
  ...rest
}) => {
  const colors = useAppStore((s) => s.colors);
  const haptics = useHaptic();
  const variantSpec = VARIANTS[variant];
  const sizeSpec = SIZES[size];

  const handlePress = () => {
    if (haptic === 'light') haptics.light();
    else if (haptic === 'medium') haptics.medium();
    onPress();
  };

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
      disabled={isPressDisabled}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isPressDisabled, busy: isLoading }}
      accessibilityLabel={typeof label === 'string' ? label : undefined}
      testID={testID}
      style={[
        styles.base,
        {
          height: sizeSpec.height,
          paddingHorizontal: sizeSpec.paddingHorizontal,
          borderRadius: sizeSpec.height / 2,
          gap: sizeSpec.gap,
          backgroundColor,
          borderWidth: borderColor ? 1 : 0,
          borderColor,
          opacity: isDisabled ? 0.5 : 1,
          width: isFullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {/* Content stays mounted (invisible) during loading so the button keeps
          its intrinsic width — no layout jump when the spinner swaps in. */}
      <View style={[styles.content, { gap: sizeSpec.gap }, isLoading && styles.contentHidden]}>
        {leftIcon}
        <ReusableText
          fontSize={sizeSpec.labelFontSize}
          fontWeight={sizeSpec.labelFontWeight}
          style={{ color: textColor }}
        >
          {label}
        </ReusableText>
        {rightIcon}
      </View>
      {isLoading ? (
        <View style={[StyleSheet.absoluteFill, styles.spinnerWrap]} pointerEvents="none">
          <ActivityIndicator size="small" color={textColor} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentHidden: {
    opacity: 0,
  },
  spinnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReusableBtn;
