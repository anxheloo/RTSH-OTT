/**
 * ListRow — settings/profile row (design `list-item`): a rounded leading icon
 * tile, title + optional subtitle, and a trailing slot. The trailing slot
 * defaults to a chevron when the row is pressable; pass `right` for a `Switch`,
 * a value label, etc. Bottom hairline divider. Theme-tokened, portable.
 */
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import type { ThemeColors } from '@/theme/colors';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import { ChevronRightIcon } from '@/assets/icons';

import ReusableText from '../Inputs/ReusableText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Leading glyph (already an element, e.g. `<Icon as={ShieldIcon} .../>`). */
  leading?: React.ReactNode;
  /** Trailing element (Switch, value text…). Defaults to a chevron when `onPress` is set. */
  right?: React.ReactNode;
  onPress?: () => void;
  /** Title color token (e.g. `'error'` for destructive rows like logout). Default `'text'`. */
  titleColor?: keyof ThemeColors;
  /** Show the bottom hairline. Default true. */
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  leading,
  right,
  onPress,
  titleColor = 'text',
  showDivider = true,
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  const trailing =
    right ?? (onPress ? <Icon as={ChevronRightIcon} size={18} color={colors.mutedDim} /> : null);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      testID={testID}
      style={[
        styles.row,
        showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        style,
      ]}
    >
      {leading ? (
        <View style={[styles.iconTile, { backgroundColor: colors.surfaceElevated }]}>{leading}</View>
      ) : null}

      <View style={styles.text}>
        <ReusableText variant="body" themeColor={titleColor}>
          {title}
        </ReusableText>
        {subtitle ? (
          <ReusableText variant="caption" themeColor="textMuted" style={styles.subtitle}>
            {subtitle}
          </ReusableText>
        ) : null}
      </View>

      {trailing}
    </TouchableOpacity>
  );
};

export default ListRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_12,
    paddingVertical: SPACING.space_15,
    paddingHorizontal: SPACING.space_18,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: BORDERRADIUS.radius_12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
});
