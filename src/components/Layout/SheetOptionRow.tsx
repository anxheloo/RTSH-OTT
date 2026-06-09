/**
 * SheetOptionRow — one row inside a settings/options sheet (design `.opt-row`):
 * a label with an optional value/description line, and a trailing affordance —
 * a chevron (drills into a sub-sheet) or a radio (single-select, `selected`
 * paints the brand-filled dot). Presentational; the parent owns the action.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { ChevronRightIcon } from '@/assets/icons';

export interface SheetOptionRowProps {
  label: string;
  /** Secondary line — a current value or a description. */
  description?: string;
  /** Trailing affordance. `chevron` drills in; `radio` single-selects. */
  trailing?: 'chevron' | 'radio';
  /** Radio fill state (only meaningful when `trailing === 'radio'`). */
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}

const SheetOptionRow: React.FC<SheetOptionRowProps> = ({
  label,
  description,
  trailing = 'chevron',
  selected = false,
  onPress,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={trailing === 'radio' ? { selected } : undefined}
      testID={testID}
    >
      <View style={styles.text}>
        <ReusableText fontSize={FONTSIZE.md} fontWeight="semiBold" themeColor="text">
          {label}
        </ReusableText>
        {description ? (
          <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" style={styles.description}>
            {description}
          </ReusableText>
        ) : null}
      </View>

      {trailing === 'radio' ? (
        <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
        </View>
      ) : (
        <Icon as={ChevronRightIcon} size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
};

export default SheetOptionRow;

const RADIO = 22;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.space_12,
    paddingHorizontal: SPACING.space_20,
    paddingVertical: SPACING.space_15,
  },
  text: {
    flex: 1,
  },
  description: {
    marginTop: SPACING.space_2,
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: BORDERRADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: BORDERRADIUS.full,
  },
});
