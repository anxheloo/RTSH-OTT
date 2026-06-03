/**
 * ParentalPinPad — 4-digit PIN entry pad.
 * Shows 4 dot indicators, a 3×4 digit grid, and a backspace key.
 * Shakes the dots on a wrong attempt via Reanimated.
 * Displays a countdown when the gate is locked after 5 wrong tries.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';

const PIN_LENGTH = 4;
const SHAKE_DISTANCE = 10;
const SHAKE_DURATION = 60;

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export type ParentalPinPadProps = {
  onComplete: (pin: string) => void;
  isWrong?: boolean;
  title?: string;
};

const ParentalPinPad: React.FC<ParentalPinPadProps> = ({
  onComplete,
  isWrong = false,
  title = 'Vendos PIN-in',
}) => {
  const colors = useAppStore((s) => s.colors);
  const isLocked = useAppStore((s) => s.isLocked);
  const lockoutSecondsRemaining = useAppStore((s) => s.lockoutSecondsRemaining);
  const [pin, setPin] = useState('');
  const [countdown, setCountdown] = useState(0);
  const shakeX = useSharedValue(0);
  const prevWrong = useRef(false);

  // Update countdown every second while locked
  useEffect(() => {
    const tick = () => setCountdown(lockoutSecondsRemaining());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutSecondsRemaining]);

  // Shake on wrong attempt
  useEffect(() => {
    if (isWrong && !prevWrong.current) {
      setPin('');
      shakeX.value = withRepeat(
        withSequence(
          withTiming(SHAKE_DISTANCE, { duration: SHAKE_DURATION }),
          withTiming(-SHAKE_DISTANCE, { duration: SHAKE_DURATION }),
          withTiming(0, { duration: SHAKE_DURATION }),
        ),
        2,
      );
    }
    prevWrong.current = isWrong;
  }, [isWrong, shakeX]);

  const dotsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const handleKey = (key: string) => {
    if (isLocked()) return;
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!key) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      onComplete(next);
      setPin('');
    }
  };

  const locked = isLocked();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ReusableText variant="heading3" themeColor="text" textAlign="center" style={styles.title}>
        {title}
      </ReusableText>

      {locked ? (
        <ReusableText fontSize={FONTSIZE.sm} themeColor="error" textAlign="center" style={styles.lockMsg}>
          Shumë përpjekje. Provo pas {countdown}s.
        </ReusableText>
      ) : (
        <Animated.View style={[styles.dots, dotsStyle]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < pin.length ? colors.primary : 'transparent',
                  borderColor: i < pin.length ? colors.primary : colors.border,
                },
              ]}
              testID={`pin-dot-${i}`}
            />
          ))}
        </Animated.View>
      )}

      <View style={styles.grid} pointerEvents={locked ? 'none' : 'auto'}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => (
              <TouchableOpacity
                key={ki}
                style={[
                  styles.key,
                  {
                    backgroundColor: key ? colors.surfaceElevated : 'transparent',
                    opacity: locked ? 0.3 : 1,
                  },
                ]}
                onPress={() => handleKey(key)}
                activeOpacity={0.7}
                disabled={!key || locked}
                testID={key ? `pin-key-${key}` : undefined}
              >
                <ReusableText fontSize={FONTSIZE.xl} themeColor="text" textAlign="center">
                  {key}
                </ReusableText>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

export default ParentalPinPad;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_24,
  },
  title: {
    marginBottom: SPACING.space_24,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACING.space_24,
    marginBottom: SPACING.space_24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  lockMsg: {
    marginBottom: SPACING.space_24,
  },
  grid: {
    gap: SPACING.space_12,
    width: '100%',
    maxWidth: 280,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.space_12,
  },
  key: {
    flex: 1,
    height: 64,
    borderRadius: BORDERRADIUS.radius_12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
