/**
 * ProgramRowSkeleton — loading placeholder for `ProgramRow`: play-glyph slot,
 * title + meta lines, and a trailing time stub under the same row paddings and
 * hairline divider, so the programme list doesn't jump when data lands.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import Skeleton from '@/components/Layout/Skeleton';

/** Mirrors ProgramRow's play-glyph slot width. */
const PLAY_SLOT = 24;

export interface ProgramRowSkeletonProps {
  testID?: string;
}

const ProgramRowSkeleton: React.FC<ProgramRowSkeletonProps> = ({ testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]} testID={testID}>
      <Skeleton width={PLAY_SLOT} height={PLAY_SLOT} borderRadius={BORDERRADIUS.full} />
      <View style={styles.meta}>
        <Skeleton width="70%" height={FONTSIZE.regular} />
        <Skeleton width="45%" height={FONTSIZE.sm} style={styles.sub} />
      </View>
      <Skeleton width={34} height={FONTSIZE.sm} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_12,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    flex: 1,
  },
  sub: {
    marginTop: SPACING.space_4,
  },
});

export default ProgramRowSkeleton;
