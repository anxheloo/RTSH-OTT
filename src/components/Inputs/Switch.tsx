/**
 * Switch — themed pill toggle (design `tg`): 46×27 track, 21px knob, animated
 * slide + track-color cross-fade. Brand red when on, raised surface when off.
 * Controlled (`value` + `onValueChange`); accessible (`role="switch"`).
 */
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BORDERRADIUS } from '@/theme/borders';
import { useAppStore } from '@/store/useAppStore';

const TRACK_W = 46;
const TRACK_H = 27;
const KNOB = 21;
const PAD = 3;
const TRAVEL = TRACK_W - KNOB - PAD * 2;
const DURATION = 160;

export interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  isDisabled?: boolean;
  testID?: string;
}

const Switch: React.FC<SwitchProps> = ({ value, onValueChange, isDisabled = false, testID }) => {
  const colors = useAppStore((s) => s.colors);
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: DURATION });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surfaceHigh, colors.primary]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: isDisabled }}
      testID={testID}
      style={isDisabled && styles.disabled}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default Switch;

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: BORDERRADIUS.full,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: BORDERRADIUS.full,
    backgroundColor: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
});
