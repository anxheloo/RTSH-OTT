/**
 * HeroCarousel — paged featured promos on Home (design `.hero` + `.dots`).
 * Each page is a 178-tall scene card with a red kicker badge, title, and meta
 * over a bottom scrim; a dot strip below tracks the active page (active dot is a
 * wide red pill). Horizontal paging via a snap ScrollView. Theme-tokened.
 */
import React, { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';
import type { HeroItem } from '@/types/domain';

export interface HeroCarouselProps {
  items: HeroItem[];
  onPressItem: (channelId: string) => void;
  testID?: string;
}

const H_MARGIN = SPACING.space_18;
const HERO_HEIGHT = 178;

const HeroCarousel: React.FC<HeroCarouselProps> = ({ items, onPressItem, testID }) => {
  const colors = useAppStore((s) => s.colors);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const pageWidth = width; // full-bleed pages; inner card is inset by H_MARGIN
  const cardWidth = width - H_MARGIN * 2;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  if (items.length === 0) return null;

  return (
    <View testID={testID}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        {items.map((item) => (
          <View key={item.id} style={{ width: pageWidth, paddingHorizontal: H_MARGIN }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPressItem(item.channelId)}
              style={[styles.card, { width: cardWidth, backgroundColor: colors.videoPlaceholderBg }]}
              testID={testID ? `${testID}-${item.id}` : undefined}
            >
              <SceneBackground source={item.imageUrl} scrim scrimFrom="35%" scrimOpacity={0.45} />

              <View style={styles.cap}>
                <View style={[styles.kicker, { backgroundColor: colors.primary }]}>
                  <ReusableText fontSize={FONTSIZE.xs} fontWeight="extraBold" themeColor="onPrimary">
                    {item.kicker}
                  </ReusableText>
                </View>
                <ReusableText
                  fontSize={FONTSIZE.xl}
                  fontWeight="extraBold"
                  themeColor="onPrimary"
                  numberOfLines={2}
                >
                  {item.title}
                </ReusableText>
                <ReusableText fontSize={FONTSIZE.sm} themeColor="onPrimary" style={styles.meta}>
                  {item.meta}
                </ReusableText>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, i) => {
            const active = i === index;
            return (
              <View
                key={item.id}
                style={[
                  styles.dot,
                  active
                    ? { width: 18, backgroundColor: colors.primary }
                    : { width: 6, backgroundColor: colors.surfaceHigh },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

export default HeroCarousel;

const styles = StyleSheet.create({
  card: {
    height: HERO_HEIGHT,
    borderRadius: BORDERRADIUS.radius_20,
    overflow: 'hidden',
  },
  cap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 5,
  },
  kicker: {
    alignSelf: 'flex-start',
    borderRadius: BORDERRADIUS.radius_8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 3,
  },
  meta: {
    opacity: 0.85,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: SPACING.space_12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
