/**
 * StationRow — single radio station row for the Radio list.
 * Shows a station dot, name + genre, and a live indicator when active.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import type { RadioStation } from '@/types/domain';

export interface StationRowProps {
  station: RadioStation;
  isActive: boolean;
  onPress: () => void;
}

const StationRow: React.FC<StationRowProps> = ({ station, isActive, onPress }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isActive ? colors.surfaceElevated : colors.surface,
          borderLeftColor: isActive ? colors.primary : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`station-row-${station.id}`}
    >
      <View
        style={[
          styles.stationDot,
          { backgroundColor: isActive ? colors.primary : colors.surfaceElevated },
        ]}
      >
        <ReusableText fontSize={FONTSIZE.xs} themeColor={isActive ? 'onPrimary' : 'textMuted'}>
          ♪
        </ReusableText>
      </View>
      <View style={styles.info}>
        <ReusableText fontSize={FONTSIZE.regular} themeColor="text" numberOfLines={1}>
          {station.name}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted">
          {station.genre}
        </ReusableText>
      </View>
      {isActive ? <View style={[styles.liveDot, { backgroundColor: colors.primary }]} /> : null}
    </TouchableOpacity>
  );
};

export default StationRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_12,
    borderLeftWidth: 3,
    gap: SPACING.space_12,
  },
  stationDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: SPACING.space_2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});
