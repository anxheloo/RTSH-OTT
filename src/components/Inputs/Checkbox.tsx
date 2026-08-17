/**
 * Checkbox — square check (design `cbox`): brand red + white check when on, a
 * hairline surface box when off. Optional `label` (or `children` for rich labels
 * like an inline link). Controlled (`value` + `onValueChange`); accessible.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useHaptic } from '@/hooks/useHaptic';
import { Icon } from '@/components/Icons';
import { CheckIcon } from '@/assets/icons';
import { tvFocusHighlight, useTVFocus } from '@/tv';

import ReusableText from './ReusableText';

export interface CheckboxProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Plain text label. For rich labels (links) pass `children` instead. */
  label?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
  testID?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  value,
  onValueChange,
  label,
  children,
  isDisabled = false,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const haptics = useHaptic();
  const { focused, focusProps } = useTVFocus();

  return (
    <TouchableOpacity
      {...focusProps}
      activeOpacity={0.7}
      disabled={isDisabled}
      onPress={() => { haptics.selection(); onValueChange(!value); }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled: isDisabled }}
      // Ring last so it wins over the row style. `scale: false` — the row spans
      // the full form width (the label flexes), so a 1.05 pop would overflow.
      // Off-TV `tvFocusHighlight` returns undefined ⇒ output unchanged.
      // Without this the register terms checkbox is reachable but INVISIBLE on
      // TV, and it is a required field — device-verified 2026-08-17.
      style={[styles.row, isDisabled && styles.disabled, tvFocusHighlight(colors.focus, focused, { scale: false })]}
      testID={testID}
    >
      <View
        style={[
          styles.box,
          value
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        ]}
      >
        {value ? <Icon as={CheckIcon} size={15} color={colors.onPrimary} /> : null}
      </View>

      {children ??
        (label ? (
          <ReusableText variant="bodySmall" themeColor="text" style={styles.flex}>
            {label}
          </ReusableText>
        ) : null)}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_10,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: BORDERRADIUS.radius_8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Checkbox;
