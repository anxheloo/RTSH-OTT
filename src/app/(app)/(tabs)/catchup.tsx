/**
 * Catchup tab — catch-up TV / VOD content.
 * Placeholder data until 5.X.1 (domain types) + 5.X.3 (query hooks) land.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { router } from 'expo-router';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import { EmptyCatchupState } from '@/components/empty';
import ReusableText from '@/components/Inputs/ReusableText';
import TabHeader from '@/components/Layout/TabHeader';
import ReusableImage from '@/components/Media/ReusableImage';

type CatchupItem = {
  id: string;
  title: string;
  channelName: string;
  date: string;
  duration: string;
  thumbnailUri?: string;
};

const PLACEHOLDER_CATCHUP: CatchupItem[] = [
  { id: 'c1', title: 'Lajmet e Orës 18:00', channelName: 'RTSH 1 HD', date: 'Sot', duration: '30 min' },
  { id: 'c2', title: 'Debat Politik', channelName: 'RTSH 1 HD', date: 'Sot', duration: '60 min' },
  { id: 'c3', title: 'Dokumentar i Natyrës', channelName: 'RTSH 2', date: 'Dje', duration: '45 min' },
  { id: 'c4', title: 'Kronikë Ekonomike', channelName: 'RTSH 24', date: 'Dje', duration: '20 min' },
  { id: 'c5', title: 'Kampionati i Futbollit', channelName: 'RTSH Sport HD', date: '2 ditë më parë', duration: '90 min' },
  { id: 'c6', title: 'Koncert Muzike Popullore', channelName: 'RTSH Muzikë', date: '2 ditë më parë', duration: '120 min' },
];

const CatchupCard: React.FC<{ item: CatchupItem }> = ({ item }) => {
  const colors = useAppStore((s) => s.colors);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/(app)/player/${item.id}`)}
      activeOpacity={0.8}
      testID={`catchup-card-${item.id}`}
    >
      <View style={[styles.thumbnail, { backgroundColor: colors.videoPlaceholderBg }]}>
        {item.thumbnailUri ? (
          <ReusableImage source={item.thumbnailUri} width={112} height={72} />
        ) : null}
        <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <ReusableText fontSize={FONTSIZE.xs} themeColor="text">
            {item.duration}
          </ReusableText>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" numberOfLines={1}>
          {item.channelName} · {item.date}
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabHeader title="Catchup" />
      <AnimatedFlashList
        data={PLACEHOLDER_CATCHUP}
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
