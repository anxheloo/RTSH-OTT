/**
 * Equalizer — the animated bar cluster shown while radio is playing (design
 * `.eq`). Five (configurable) bars pulse on staggered loops via Reanimated.
 * When `active` is false the bars rest flat — used both on the radio player and,
 * smaller, in the mini-player dock to signal live audio.
 *
 * Purely decorative: it animates UI-thread only and reads no playback data.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BORDERRADIUS } from '@/theme/borders';
import { useAppStore } from '@/store/useAppStore';

export interface EqualizerProps {
  /** Animate the bars. When false they sit at the minimum height. Default true. */
  active?: boolean;
  /** Number of bars. Default 5 (matches design). */
  barCount?: number;
  /** Max bar height in px. Default 28 (design); pass ~14 for the mini-player. */
  height?: number;
  /** Bar width in px. Default 5. */
  barWidth?: number;
  /** Bar colour. Defaults to the brand red. */
  color?: string;
  testID?: string;
}

/** Per-bar animation offsets (design: nth-child delays .2 .4 .1 .3). */
const DELAYS = [0, 200, 400, 100, 300];
const PERIOD_MS = 1000;

const Bar: React.FC<{ active: boolean; delay: number; height: number; width: number; color: string }> = ({
  active,
  delay,
  height,
  width,
  color,
}) => {
  const minH = Math.max(4, Math.round(height * 0.25));
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (active) {
      progress.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: PERIOD_MS / 2 }), -1, true),
      );
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [active, delay, progress]);

  const style = useAnimatedStyle(() => ({
    height: minH + progress.value * (height - minH),
  }));

  return <Animated.View style={[{ width, backgroundColor: color, borderRadius: 2 }, style]} />;
};

const Equalizer: React.FC<EqualizerProps> = ({
  active = true,
  barCount = 5,
  height = 28,
  barWidth = 5,
  color,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const barColor = color ?? colors.primary;

  return (
    <View style={[styles.row, { height }]} testID={testID}>
      {Array.from({ length: barCount }).map((_, i) => (
        <Bar
          key={i}
          active={active}
          delay={DELAYS[i % DELAYS.length]}
          height={height}
          width={barWidth}
          color={barColor}
        />
      ))}
    </View>
  );
};

export default Equalizer;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderRadius: BORDERRADIUS.none,
  },
});
