/**
 * Branded loading screen shown during bootstrap, between the native (instant)
 * splash and the first app frame. Matches the Figma "Loading Screen": the RTSH
 * mark centered on brand-black with a red progress bar beneath it.
 *
 * Brand-black is hard-coded (not theme-driven) because the theme store may not
 * be rehydrated yet at this point, and the Figma loading screen is always dark.
 *
 * The bar is indeterminate while booting — it eases toward ~90% to read as
 * "working" without faking a precise progress value (bootstrap is offline-first
 * and usually near-instant). When `isComplete` flips true it fills to 100% and
 * fires `onComplete`, so the root can hold the splash until the fill lands.
 */
import React, { useEffect } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { RtshLogoFull } from '@/assets/icons/Brand';

const BRAND_BLACK = '#000000';
const BRAND_RED = '#EB122F';
const TRACK_COLOR = 'rgba(255,255,255,0.14)';

const BAR_WIDTH = 220;
// Must mirror the native splash (app.config.ts): iOS shows the same lockup at
// `imageWidth: 160`, so the JS logo is dead-centered at the same size
// (height 70 → width 160 via the lockup aspect) and the bar is absolutely
// positioned so it never shifts the logo — invisible handoff. Android's native
// phase shows the square mark (Android 12+ circle constraint), so its handoff
// is a deliberate mark → lockup swap.
const LOGO_HEIGHT = 70;

export interface BrandedSplashProps {
  /** Fired on first layout — lets the root hide the native splash without a flash. */
  onLayout?: (e: LayoutChangeEvent) => void;
  /** Flip true when bootstrap is done — fills the bar to 100%. */
  isComplete?: boolean;
  /** Fired once the 100% fill animation lands. */
  onComplete?: () => void;
}

const BrandedSplash: React.FC<BrandedSplashProps> = ({ onLayout, isComplete, onComplete }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isComplete) {
      progress.value = withTiming(
        1,
        { duration: 250, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished && onComplete) scheduleOnRN(onComplete);
        },
      );
    } else {
      progress.value = withTiming(0.9, { duration: 900, easing: Easing.out(Easing.cubic) });
    }
  }, [isComplete, onComplete, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container} onLayout={onLayout} testID="branded-splash">
      <RtshLogoFull height={LOGO_HEIGHT} />
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.space_48,
  },
  track: {
    width: BAR_WIDTH,
    height: 4,
    borderRadius: BORDERRADIUS.full,
    backgroundColor: TRACK_COLOR,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BORDERRADIUS.full,
    backgroundColor: BRAND_RED,
  },
});

export default BrandedSplash;
