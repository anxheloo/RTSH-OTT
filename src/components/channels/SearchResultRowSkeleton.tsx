/**
 * SearchResultRowSkeleton — loading placeholder for `SearchResultRow`: landscape
 * thumb, name + meta lines, trailing chevron stub — same paddings and hairline
 * divider as the real row.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import Skeleton from '@/components/Layout/Skeleton';

const THUMB_WIDTH = 78;
const THUMB_HEIGHT = 46;

export interface SearchResultRowSkeletonProps {
  testID?: string;
}

const SearchResultRowSkeleton: React.FC<SearchResultRowSkeletonProps> = ({ testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]} testID={testID}>
      <Skeleton width={THUMB_WIDTH} height={THUMB_HEIGHT} borderRadius={BORDERRADIUS.radius_12} />
      <View style={styles.info}>
        <Skeleton width="50%" height={FONTSIZE.regular} />
        <Skeleton width="30%" height={FONTSIZE.sm} style={styles.meta} />
      </View>
      <Skeleton width={20} height={20} borderRadius={BORDERRADIUS.full} />
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
  info: {
    flex: 1,
  },
  meta: {
    marginTop: SPACING.space_2,
  },
});

export default SearchResultRowSkeleton;