/**
 * ContinueCard — a single "Vazhdo të shikosh" card (design `.hcard`): a 200-wide
 * scene thumbnail with a centered frosted play badge and a bottom progress bar,
 * then the program title + channel subtitle. Theme-tokened, portable.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';
import type { ContinueItem } from '@/types/domain';
import { PlayIcon } from '@/assets/icons';

export interface ContinueCardProps {
  item: ContinueItem;
  onPress: () => void;
}

export const CONTINUE_CARD_WIDTH = 200;
const THUMB_HEIGHT = 112;

const ContinueCard: React.FC<ContinueCardProps> = ({ item, onPress }) => {
  const colors = useAppStore((s) => s.colors);
  const pct = `${Math.round(Math.min(Math.max(item.progress, 0), 1) * 100)}%` as const;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      testID={`continue-card-${item.id}`}
    >
      <View style={styles.thumb}>
        <SceneBackground source={item.thumbnailUrl} />

        <View style={styles.playBadge}>
          <Icon as={PlayIcon} size={20} color="#FFFFFF" />
        </View>

        <View style={styles.pgTrack}>
          <View style={[styles.pgFill, { width: pct, backgroundColor: colors.primary }]} />
        </View>
      </View>

      <ReusableText
        fontSize={FONTSIZE.sm}
        fontWeight="semiBold"
        themeColor="text"
        numberOfLines={1}
        style={styles.title}
      >
        {item.title}
      </ReusableText>
      <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1}>
        {item.channelName}
      </ReusableText>
    </TouchableOpacity>
  );
};

export default ContinueCard;

const styles = StyleSheet.create({
  card: {
    width: CONTINUE_CARD_WIDTH,
  },
  thumb: {
    width: CONTINUE_CARD_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: BORDERRADIUS.radius_12,
    overflow: 'hidden',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 42,
    height: 42,
    marginTop: -21,
    marginLeft: -21,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pgTrack: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  pgFill: {
    height: '100%',
    borderRadius: 2,
  },
  title: {
    marginTop: SPACING.space_8,
  },
});
