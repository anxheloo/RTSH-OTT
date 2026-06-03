/**
 * CatchupCard — single catch-up / VOD item for the Catchup list.
 * Thumbnail with duration badge + channel name, relative air date, and title.
 * Tapping opens the catch-up player at program/[id].
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { router } from 'expo-router';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import ReusableImage from '@/components/Media/ReusableImage';
import { formatDurationMinutes, formatRelativeDay } from '@/utils/formatters';
import type { CatchupItem } from '@/types/domain';

export interface CatchupCardProps {
  item: CatchupItem;
}

const THUMBNAIL_WIDTH = 112;
const THUMBNAIL_HEIGHT = 72;

const CatchupCard: React.FC<CatchupCardProps> = ({ item }) => {
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
          <ReusableImage source={item.thumbnail} width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} />
        ) : null}
        <View style={[styles.durationBadge, { backgroundColor: colors.overlay }]}>
          <ReusableText fontSize={FONTSIZE.xs} themeColor="text">
            {formatDurationMinutes(item.duration)}
          </ReusableText>
        </View>
      </View>
      <View style={styles.info}>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" numberOfLines={1}>
          {item.channelName} · {formatRelativeDay(item.airDate)}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="text" numberOfLines={2}>
          {item.title}
        </ReusableText>
      </View>
    </TouchableOpacity>
  );
};

export default CatchupCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BORDERRADIUS.radius_8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
  },
  durationBadge: {
    position: 'absolute',
    bottom: SPACING.space_4,
    right: SPACING.space_4,
    paddingHorizontal: SPACING.space_4,
    paddingVertical: SPACING.space_2,
    borderRadius: BORDERRADIUS.radius_8,
  },
  info: {
    flex: 1,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_10,
    justifyContent: 'center',
    gap: SPACING.space_4,
  },
});
