/**
 * Branded loading screen shown during bootstrap, between the native (instant)
 * splash and the first app frame. Matches the Figma "Loading Screen": the RTSH
 * mark centered on brand-black with a red progress bar beneath it.
 *
 * Brand-black is hard-coded (not theme-driven) because the theme store may not
 * be rehydrated yet at this point, and the Figma loading screen is always dark.
 *
 * The bar is intentionally indeterminate — it eases toward ~90% to read as
 * "working" without faking a precise progress value (bootstrap is offline-first
 * and usually near-instant).
 */
import React, { useEffect } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BORDERRADIUS } from '@/theme/borders';
import { SPACING } from '@/theme/spacing';
import { RtshLogoFull } from '@/assets/icons/Brand';

const BRAND_BLACK = '#000000';
const BRAND_RED = '#EB122F';
const TRACK_COLOR = 'rgba(255,255,255,0.14)';

const BAR_WIDTH = 220;
const LOGO_HEIGHT = 52;

export interface BrandedSplashProps {
  /** Fired on first layout — lets the root hide the native splash without a flash. */
  onLayout?: (e: LayoutChangeEvent) => void;
}

const BrandedSplash: React.FC<BrandedSplashProps> = ({ onLayout }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(0.9, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress]);

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

export default BrandedSplash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: BAR_WIDTH,
    height: 4,
    marginTop: SPACING.space_32,
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
