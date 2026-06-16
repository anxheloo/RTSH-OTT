/**
 * EpgRow — single programme row for the EPG list.
 * Time badge (start + end, HH:MM) + channel name + programme title.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useDateTime } from '@/hooks/useDateTime';
import ReusableText from '@/components/Inputs/ReusableText';
import type { EpgItem } from '@/types/domain';

export interface EpgRowProps {
  item: EpgItem;
}

const EpgRow: React.FC<EpgRowProps> = ({ item }) => {
  const colors = useAppStore((s) => s.colors);
  const { formatTime } = useDateTime();

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={[styles.timeBadge, { backgroundColor: colors.surfaceElevated }]}>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" textAlign="center">
          {formatTime(item.startTime)}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" textAlign="center">
          {formatTime(item.endTime)}
        </ReusableText>
      </View>
      <View style={styles.info}>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1}>
          {item.channelName}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.regular} themeColor="text" numberOfLines={2}>
          {item.title}
        </ReusableText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: BORDERRADIUS.radius_8,
    overflow: 'hidden',
    minHeight: 64,
  },
  timeBadge: {
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.space_10,
  },
  info: {
    flex: 1,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_10,
    justifyContent: 'center',
    gap: SPACING.space_4,
  },
});

export default EpgRow;
