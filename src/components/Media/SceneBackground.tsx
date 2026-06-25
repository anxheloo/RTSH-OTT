/**
 * SceneBackground — the shared "last-frame scene" fill used by every card that
 * layers content over a channel/program image (ChannelCard, HeroCarousel,
 * GuideRow / SearchResultRow tiles). Absolutely fills its parent with a cover image
 * plus an optional bottom scrim for text legibility. The parent owns the rounded
 * clipping container (`overflow: 'hidden'`) and any overlay children.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import ReusableImage, { type ImageCachePolicy, type ImagePriority } from '@/components/Media/ReusableImage';

export interface SceneBackgroundProps {
  /** Scene image URL. Undefined → renders blurhash placeholder (+ optional scrim). */
  source?: string;
  /** Blurhash string shown while loading or when source is absent. */
  blurhash?: string;
  /** Add a bottom-up dark scrim for overlaid text. Default false. */
  scrim?: boolean;
  /** Vertical start of the scrim as a top offset. Default '40%'. */
  scrimFrom?: `${number}%`;
  /** Scrim darkness 0–1. Default 0.32. */
  scrimOpacity?: number;
  priority?: ImagePriority;
  /**
   * Cache strategy for the scene image. Defaults to `'disk'`. Pass `'none'` for
   * live channel snapshots served at a stable URL with mutable content (Home /
   * Guide), so a regenerated frame shows on every mount / pull-to-refresh
   * instead of the disk-cached stale one.
   */
  cachePolicy?: ImageCachePolicy;
}

const SceneBackground: React.FC<SceneBackgroundProps> = ({
  source,
  blurhash,
  scrim = false,
  scrimFrom = '40%',
  scrimOpacity = 0.32,
  priority = 'low',
  cachePolicy,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.fill, { backgroundColor: colors.videoPlaceholderBg }]} pointerEvents="none">
      {source || blurhash ? (
        <ReusableImage
          source={source ?? ''}
          blurhash={blurhash}
          width="100%"
          height="100%"
          contentFit="cover"
          priority={priority}
          cachePolicy={cachePolicy}
          containerStyle={styles.fill}
        />
      ) : null}
      {scrim ? (
        <View
          style={[styles.scrim, { top: scrimFrom, backgroundColor: `rgba(0,0,0,${scrimOpacity})` }]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default SceneBackground;
