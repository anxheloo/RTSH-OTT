/**
 * IconButton — circular touchable wrapper for an icon.
 * Theme-aware port of the RTSH `IconWrapper`: translucent surface by default,
 * configurable size, accessible. Pass an icon component as `children`.
 */
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';

export interface IconButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Diameter of the circular hit area. Defaults to 40. */
  size?: number;
  backgroundColor?: string;
  isDisabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_SIZE = 40;
const DEFAULT_BG = 'rgba(255,255,255,0.1)';

const IconButton: React.FC<IconButtonProps> = ({
  children,
  onPress,
  size = DEFAULT_SIZE,
  backgroundColor = DEFAULT_BG,
  isDisabled = false,
  accessibilityLabel,
  style,
  testID,
}) => {
  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: BORDERRADIUS.full, backgroundColor },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default IconButton;
