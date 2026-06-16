/**
 * ChannelCardSkeleton — loading placeholder for `ChannelCard`: the same 16/10
 * rounded footprint, so the 2-column grid keeps its layout while channels load.
 */
import React from 'react';
import { StyleSheet } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import Skeleton from '@/components/Layout/Skeleton';

export interface ChannelCardSkeletonProps {
  testID?: string;
}

const ChannelCardSkeleton: React.FC<ChannelCardSkeletonProps> = ({ testID }) => (
  <Skeleton borderRadius={BORDERRADIUS.radius_14} style={styles.card} testID={testID} />
);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
});

export default ChannelCardSkeleton;
