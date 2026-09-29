/**
 * Skeleton — the app's single pulsing placeholder primitive (loading-state
 * strategy, STYLE_GUIDE → Loading States). Screens render their chrome
 * immediately and swap each data-driven region for a Skeleton while its query
 * is in flight — never a blocking full-screen loader. Compose this block into
 * per-feature `XSkeleton` siblings; don't hand-roll shimmer effects.
 *
 * Purely decorative: a theme-tokened block pulsing opacity on the UI thread.
 * Static on TV: react-native-tvos does a binder IPC on every View props update,
 * so an endless pulse costs one system call per block per frame — enough to
 * ANR a low-end TV box during Home's loading grid (REACT-NATIVE-RTSH-OTT-1K).
 */
import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BORDERRADIUS } from '@/theme/borders';
import { useAppStore } from '@/store/useAppStore';
import { isTV } from '@/tv';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Defaults to `radius_8`; pass `BORDERRADIUS.none` for full-bleed blocks. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const PULSE_MS = 700;
const MIN_OPACITY = 0.45;

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = BORDERRADIUS.radius_8,
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (isTV) return;
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value * (1 - MIN_OPACITY),
  }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.skeleton }, animatedStyle, style]}
      testID={testID}
    />
  );
};

export default Skeleton;
