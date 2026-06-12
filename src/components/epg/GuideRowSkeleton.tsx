/**
 * GuideRowSkeleton — loading placeholder for `GuideRow`: scene tile, now/next
 * text lines, progress track, and the trailing badge stub under the same row
 * paddings and hairline divider as the real row.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import Skeleton from '@/components/Layout/Skeleton';

/** Mirrors GuideRow's scene-tile size. */
const TILE = 46;

export interface GuideRowSkeletonProps {
  testID?: string;
}

const GuideRowSkeleton: React.FC<GuideRowSkeletonProps> = ({ testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]} testID={testID}>
      <Skeleton width={TILE} height={TILE} borderRadius={BORDERRADIUS.radius_12} />
      <View style={styles.meta}>
        <Skeleton width="65%" height={FONTSIZE.regular} />
        <Skeleton width="50%" height={FONTSIZE.sm} style={styles.next} />
        <Skeleton width="100%" height={3} style={styles.track} />
      </View>
      <Skeleton width={36} height={FONTSIZE.sm} />
    </View>
  );
};

export default GuideRowSkeleton;

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
  next: {
    marginTop: SPACING.space_4,
  },
  track: {
    marginTop: SPACING.space_8,
  },
});
