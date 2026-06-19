/**
 * ChannelCard — 2-column grid card (design `.card`): a 16/10 scene thumbnail
 * with a frosted `clogo` badge (top-left), a state `tagchip` (top-right:
 * LIVE / 18+ lock / GEO), and the channel name over a bottom scrim.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { scaled } from '@/responsive';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableImage from '@/components/Media/ReusableImage';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';
import { GlobeIcon, LockIcon } from '@/assets/icons';

const DEFAULT_BLURHASH =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

// 3:1 logo badge — scaled once at launch via the responsive token step (phone 1×, tablet 1.15×, TV 1.3×).
const LOGO_W = scaled(54);
const LOGO_H = scaled(18);

export interface ChannelCardProps {
  channelId: string;
  name: string;
  /** Channel logo — 3:1 aspect ratio. Undefined/error shows a blurhash placeholder. */
  logoUrl?: string;
  /** Scene / last-frame thumbnail. Undefined shows the placeholder bg. */
  thumbnailUri?: string;
  isLive?: boolean;
  /** Adult/locked channel → 18+ tag (PIN gate handled by the open flow). */
  isAdult?: boolean;
  /** Geo-restricted channel → GEO tag. */
  geoBlocked?: boolean;
  onPress: () => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channelId,
  name,
  logoUrl,
  thumbnailUri,
  isLive = true,
  isAdult = false,
  geoBlocked = false,
  onPress,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.videoPlaceholderBg }]}
      onPress={onPress}
      activeOpacity={0.9}
      testID={`channel-card-${channelId}`}
    >
      <SceneBackground source={thumbnailUri} blurhash={DEFAULT_BLURHASH} scrim scrimFrom="45%" scrimOpacity={0.28} />

      {/* clogo — frosted badge with channel logo (3:1), top-left */}
      <View style={styles.clogo}>
        <ReusableImage
          source={logoUrl ?? ''}
          blurhash={DEFAULT_BLURHASH}
          width={LOGO_W}
          height={LOGO_H}
          contentFit="contain"
          cachePolicy="disk"
          priority="high"
          transitionDurationMs={150}
        />
      </View>

      {/* tagchip — top-right state badge */}
      {isAdult ? (
        <View style={styles.tagchip}>
          <Icon as={LockIcon} size={11} color="#FFFFFF" />
          <ReusableText fontSize={FONTSIZE.xs} fontWeight="bold" themeColor="onPrimary">
            18+
          </ReusableText>
        </View>
      ) : geoBlocked ? (
        <View style={styles.tagchip}>
          <Icon as={GlobeIcon} size={11} color="#FFFFFF" />
          <ReusableText fontSize={FONTSIZE.xs} fontWeight="bold" themeColor="onPrimary">
            GEO
          </ReusableText>
        </View>
      ) : isLive ? (
        <View style={[styles.tagchip, { backgroundColor: colors.primary }]}>
          <View style={styles.liveDot} />
          <ReusableText fontSize={FONTSIZE.xs} fontWeight="bold" themeColor="onPrimary">
            LIVE
          </ReusableText>
        </View>
      ) : null}

      {/* name */}
      <ReusableText
        fontSize={FONTSIZE.regular}
        fontWeight="bold"
        themeColor="onPrimary"
        numberOfLines={1}
        style={styles.name}
      >
        {name}
      </ReusableText>
    </TouchableOpacity>
  );
};

const BADGE_BG = 'rgba(0,0,0,0.5)';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 16 / 10,
    borderRadius: BORDERRADIUS.radius_14,
    overflow: 'hidden',
  },
  clogo: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: BADGE_BG,
    borderRadius: BORDERRADIUS.radius_8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagchip: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BADGE_BG,
    borderRadius: BORDERRADIUS.radius_8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  name: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 11,
  },
});

export default ChannelCard;
