/**
 * Catchup tab — catch-up TV / VOD content.
 * Fetches items from the mock/API via useCatchupQuery.
 * Duration in seconds formatted to "X min"; airDate formatted relative to today.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { router } from 'expo-router';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useCatchupQuery } from '@/api/queries';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import { EmptyCatchupState } from '@/components/empty';
import ReusableText from '@/components/Inputs/ReusableText';
import { FullScreenLoader } from '@/components/Layout';
import TabHeader from '@/components/Layout/TabHeader';
import ReusableImage from '@/components/Media/ReusableImage';
import type { CatchupItem } from '@/types/domain';

function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

function formatAirDate(iso: string): string {
  const today = new Date();
  const air = new Date(iso);
  const todayStr = today.toISOString().split('T')[0];
  const airStr = air.toISOString().split('T')[0];

  if (airStr === todayStr) return 'Sot';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (airStr === yesterday.toISOString().split('T')[0]) return 'Dje';

  const diffMs = today.getTime() - air.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays} ditë më parë`;
}

const CatchupCard: React.FC<{ item: CatchupItem }> = ({ item }) => {
  const colors = useAppStore((s) => s.colors);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/(app)/program/${item.id}`)}
      activeOpacity={0.8}
      testID={`catchup-card-${item.id}`}
    >
      <View style={[styles.thumbnail, { backgroundColor: colors.videoPlaceholderBg }]}>
        {item.thumbnail ? (
          <ReusableImage source={item.thumbnail} width={112} height={72} />
        ) : null}
        <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <ReusableText fontSize={FONTSIZE.xs} themeColor="text">
            {formatDuration(item.duration)}
          </ReusableText>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" numberOfLines={1}>
          {item.channelName} · {formatAirDate(item.airDate)}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="text" numberOfLines={2}>
          {item.title}
        </ReusableText>
      </View>
    </TouchableOpacity>
  );
};

const CatchupScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const { items, isLoading } = useCatchupQuery();

  if (isLoading && items.length === 0) {
    return <FullScreenLoader />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabHeader title="Catchup" />
      <AnimatedFlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CatchupCard item={item} />}
        emptyComponent={<EmptyCatchupState />}
        separatorHeight={SPACING.space_10}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

export default CatchupScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
  },
  card: {
    flexDirection: 'row',
    borderRadius: BORDERRADIUS.radius_8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 112,
    height: 72,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_10,
    justifyContent: 'center',
    gap: 4,
  },
});
