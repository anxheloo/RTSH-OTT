/**
 * AnimatedView — reusable Reanimated wrapper for enter/exit layout animations.
 * Wrap any subtree to give it entering/exiting motion without re-deriving the
 * boilerplate. Defaults to FadeIn/FadeOut @ 500ms; override `entering`/`exiting`
 * per use, or just bump `duration` to retime the defaults.
 *
 * Note: Reanimated `exiting` does not fire reliably inside React Native's
 * `Modal` (the native view tears down before the animation can play) — let the
 * Modal's own `animationType` own the exit there, and use this for the enter.
 */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

type AnimatedViewProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  entering?: React.ComponentProps<typeof Animated.View>['entering'];
  exiting?: React.ComponentProps<typeof Animated.View>['exiting'];
};

const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  style,
  duration = 500,
  entering,
  exiting,
}) => (
  <Animated.View
    style={style}
    entering={entering ?? FadeIn.duration(duration)}
    exiting={exiting ?? FadeOut.duration(duration)}
  >
    {children}
  </Animated.View>
);

export default AnimatedView;