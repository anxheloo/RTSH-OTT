/**
 * ProgramRow — a programme list row with a play affordance (design `.prog`): a
 * play glyph, a bold title, and a muted meta line ("RTSH Sport HD · 21:30").
 * Used by Search results today; reusable for the player's EPG list later.
 * Presentational — the parent composes `meta` and supplies `onPress`.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { PlayIcon } from '@/assets/icons';

export interface ProgramRowProps {
  title: string;
  /** Pre-composed secondary line, e.g. "RTSH Sport HD · 21:30". */
  meta: string;
  onPress: () => void;
  testID?: string;
}

const ProgramRow: React.FC<ProgramRowProps> = ({ title, meta, onPress, testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <Icon as={PlayIcon} size={24} color={colors.primary} style={styles.play} />
      <View style={styles.meta}>
        <ReusableText fontSize={FONTSIZE.regular} fontWeight="bold" themeColor="text" numberOfLines={1}>
          {title}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1} style={styles.sub}>
          {meta}
        </ReusableText>
      </View>
    </TouchableOpacity>
  );
};

export default ProgramRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.space_12,
    paddingHorizontal: SPACING.space_18,
    paddingVertical: SPACING.space_12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  play: {
    marginTop: 1,
  },
  meta: {
    flex: 1,
  },
  sub: {
    marginTop: 2,
  },
});
