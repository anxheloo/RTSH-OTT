/**
 * App-wide image primitive. Wraps `expo-image` with sensible defaults
 * (disk cache, async decode, blurhash placeholder, theme-tone background
 * while loading), plus self-documenting props for shape (`isCircle`,
 * `aspectRatio`) and presentation.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Image, type ImageContentFit, type ImageProps, type ImageSource } from 'expo-image';

import { useAppStore } from '@/store/useAppStore';

export type ImageCachePolicy = 'none' | 'memory' | 'disk' | 'memory-disk';
export type ImagePriority = 'low' | 'normal' | 'high';

export type ReusableImageProps = Omit<ImageProps, 'source' | 'style' | 'contentFit' | 'placeholder'> & {
  /** Remote URL string, local require(), or any `expo-image` `ImageSource`. */
  source: string | number | ImageSource;
  /** Fallback rendered when `source` fails to load. Same accepted types as `source`. */
  fallbackSource?: string | number | ImageSource;
  /** Blurhash string rendered as the placeholder while loading. */
  blurhash?: string;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  /** Sets aspect ratio (e.g. `16 / 9` for video thumbs). Use instead of `height` when only width is known. */
  aspectRatio?: number;
  borderRadius?: number;
  /** Shortcut for circular avatars — sets `borderRadius` to half of the resolved width. */
  isCircle?: boolean;
  contentFit?: ImageContentFit;
  cachePolicy?: ImageCachePolicy;
  priority?: ImagePriority;
  /** Transition duration in ms when the image loads. Defaults to 200ms. */
  transitionDurationMs?: number;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

const ReusableImage: React.FC<ReusableImageProps> = ({
  source,
  fallbackSource,
  blurhash,
  width,
  height,
  aspectRatio,
  borderRadius,
  isCircle = false,
  contentFit = 'cover',
  cachePolicy = 'disk',
  priority = 'normal',
  transitionDurationMs = 200,
  testID,
  containerStyle,
  ...rest
}) => {
  const colors = useAppStore((s) => s.colors);

  const resolvedBorderRadius = isCircle && typeof width === 'number'
    ? width / 2
    : borderRadius;

  return (
    <View
      style={[
        {
          width,
          height,
          aspectRatio,
          borderRadius: resolvedBorderRadius,
          backgroundColor: colors.videoPlaceholderBg,
          overflow: 'hidden',
        },
        containerStyle,
      ]}
      testID={testID}
    >
      <Image
        {...rest}
        source={source}
        placeholder={blurhash ? { blurhash } : undefined}
        recyclingKey={typeof source === 'string' ? source : undefined}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
        priority={priority}
        transition={transitionDurationMs}
        onError={(e) => {
          rest.onError?.(e);
        }}
        style={styles.image}
      />
      {fallbackSource ? (
        <Image
          source={fallbackSource}
          contentFit={contentFit}
          style={[styles.image, styles.fallback]}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
});

export default ReusableImage;
