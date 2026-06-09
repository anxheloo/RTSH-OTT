/**
 * MosaicTile — compact channel tile for the Mosaic grid (design `.mos`): a
 * 16/10 last-frame scene with a small red LIVE badge (top-right) and the
 * channel name over a bottom scrim (bottom-left). Tighter than `ChannelCard`
 * (no frosted logo, no package tag) — it is a dense "wall of channels".
 * Memoized because it renders inside a FlashList grid.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';

export interface MosaicTileProps {
  channelId: string;
  name: string;
  /** Last-frame scene thumbnail. Undefined shows the placeholder bg. */
  thumbnailUri?: string;
  isLive?: boolean;
  onPress: () => void;
}

const MosaicTile: React.FC<MosaicTileProps> = ({
  channelId,
  name,
  thumbnailUri,
  isLive = false,
  onPress,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: colors.videoPlaceholderBg }]}
      onPress={onPress}
      activeOpacity={0.9}
      testID={`mosaic-tile-${channelId}`}
    >
      <SceneBackground source={thumbnailUri} scrim scrimFrom="50%" scrimOpacity={0.3} />

      {isLive ? (
        <ReusableText
          fontSize={FONTSIZE.xxs}
          fontWeight="black"
          themeColor="onPrimary"
          style={[styles.live, { backgroundColor: colors.primary }]}
        >
          LIVE
        </ReusableText>
      ) : null}

      <ReusableText
        fontSize={FONTSIZE.xs}
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

const MemoizedMosaicTile = React.memo(MosaicTile);
MemoizedMosaicTile.displayName = 'MosaicTile';

export default MemoizedMosaicTile;

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 16 / 10,
    borderRadius: BORDERRADIUS.radius_12,
    overflow: 'hidden',
  },
  live: {
    position: 'absolute',
    top: 7,
    right: 7,
    borderRadius: BORDERRADIUS.radius_8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  name: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 7,
  },
});
