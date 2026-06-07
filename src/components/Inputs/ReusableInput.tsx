/**
 * App-wide text input primitive. Wraps RN `TextInput` with focus-ring border,
 * optional label / helper / error text, optional icon slots, and an
 * `isPassword` mode that adds a Show/Hide toggle.
 *
 * Size defaults are placeholders (44/52/60 px) — pass explicit `height` /
 * `fontSize` / `borderRadius` overrides until design lands.
 */
import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { useAppStore } from '@/store/useAppStore';

import ReusableText from './ReusableText';

export type InputSize = 'small' | 'medium' | 'large';

interface SizeSpec {
  height: number;
  paddingHorizontal: number;
  fontSize: number;
  borderRadius: number;
  iconGap: number;
}

// Design (2026-06-06): fields are h52 / radius 14 / 15px text. `medium` is the
// default and matches the design; small/large are scale variants.
const SIZES: Record<InputSize, SizeSpec> = {
  small: { height: 44, paddingHorizontal: 12, fontSize: 14, borderRadius: 12, iconGap: 8 },
  medium: { height: 52, paddingHorizontal: 16, fontSize: 15, borderRadius: 14, iconGap: 10 },
  large: { height: 56, paddingHorizontal: 16, fontSize: 16, borderRadius: 14, iconGap: 12 },
};

export type ReusableInputProps = Omit<TextInputProps, 'style' | 'editable' | 'secureTextEntry'> & {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Text rendered above the input. */
  label?: string;
  /** Text rendered below the input. Hidden when `errorText` is set. */
  helperText?: string;
  /** Error text — replaces helper text and switches the border to the error color. */
  errorText?: string;
  leftIcon?: React.ReactNode;
  /** Right-side icon. With `isPassword`, the Show/Hide toggle renders after this. */
  rightIcon?: React.ReactNode;
  /** Renders a `secureTextEntry` field with a Show/Hide toggle on the right. */
  isPassword?: boolean;
  isDisabled?: boolean;
  size?: InputSize;
  /** Explicit pixel height. Overrides the size default. */
  height?: number;
  /** Explicit pixel font size for the input text. Overrides the size default. */
  fontSize?: number;
  /** Explicit pixel border radius. Overrides the size default. */
  borderRadius?: number;
  /** Explicit horizontal padding. Overrides the size default. */
  paddingHorizontal?: number;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

const ReusableInput: React.FC<ReusableInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  helperText,
  errorText,
  leftIcon,
  rightIcon,
  isPassword = false,
  isDisabled = false,
  size = 'medium',
  height,
  fontSize,
  borderRadius,
  paddingHorizontal,
  testID,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}) => {
  const colors = useAppStore((s) => s.colors);
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const sizeSpec = SIZES[size];

  const resolvedHeight = height ?? sizeSpec.height;
  const resolvedFontSize = fontSize ?? sizeSpec.fontSize;
  const resolvedBorderRadius = borderRadius ?? sizeSpec.borderRadius;
  const resolvedPaddingHorizontal = paddingHorizontal ?? sizeSpec.paddingHorizontal;

  const hasError = Boolean(errorText);
  const borderColor = hasError
    ? colors.error
    : isFocused
      ? colors.primary
      : colors.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <ReusableText variant="label" themeColor="textMuted" style={styles.label}>
          {label}
        </ReusableText>
      ) : null}

      <View
        style={[
          styles.field,
          {
            height: resolvedHeight,
            paddingHorizontal: resolvedPaddingHorizontal,
            borderRadius: resolvedBorderRadius,
            backgroundColor: colors.inputBackground,
            borderColor,
            opacity: isDisabled ? 0.5 : 1,
            gap: sizeSpec.iconGap,
          },
        ]}
      >
        {leftIcon ? <View>{leftIcon}</View> : null}

        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!isDisabled}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          testID={testID}
          style={[
            styles.input,
            {
              fontSize: resolvedFontSize,
              color: colors.text,
            },
          ]}
        />

        {rightIcon ? <View>{rightIcon}</View> : null}

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            testID={testID ? `${testID}-password-toggle` : undefined}
          >
            <ReusableText variant="label" themeColor="primary">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </ReusableText>
          </TouchableOpacity>
        ) : null}
      </View>

      {hasError ? (
        <ReusableText variant="caption" themeColor="error" style={styles.subtext}>
          {errorText}
        </ReusableText>
      ) : helperText ? (
        <ReusableText variant="caption" themeColor="textMuted" style={styles.subtext}>
          {helperText}
        </ReusableText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    padding: 0,
  },
  subtext: {
    marginTop: 6,
  },
});

export default ReusableInput;
