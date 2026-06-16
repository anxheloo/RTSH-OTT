/**
 * StationRowSkeleton — loading placeholder for `StationRow`: scene tile, name +
 * genre lines, and a trailing chevron stub under the same row paddings and
 * hairline divider as the real row.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import Skeleton from '@/components/Layout/Skeleton';

/** Mirrors StationRow's tile size. */
const TILE = 50;

export interface StationRowSkeletonProps {
  testID?: string;
}

const StationRowSkeleton: React.FC<StationRowSkeletonProps> = ({ testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]} testID={testID}>
      <Skeleton width={TILE} height={TILE} borderRadius={BORDERRADIUS.radius_14} />
      <View style={styles.info}>
        <Skeleton width="55%" height={FONTSIZE.regular} />
        <Skeleton width="35%" height={FONTSIZE.sm} style={styles.genre} />
      </View>
      <Skeleton width={20} height={20} borderRadius={BORDERRADIUS.full} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_15,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
  },
  genre: {
    marginTop: SPACING.space_4,
  },
});

export default StationRowSkeleton;
