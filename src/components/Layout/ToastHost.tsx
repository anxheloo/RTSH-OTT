/**
 * ToastHost — renders the active `ToastSlice` toast (design `.toast`): a
 * high-contrast pill with a check glyph that fades up, holds ~1.9s, then fades
 * out and clears itself. Mounted once at the root (next to `ModalWrapper`) so it
 * floats above every route — including the player and its sheets.
 *
 * The pill inverts the theme (background = `text`, text = `background`) so it
 * reads on both dark and light surfaces, matching the design's white-on-dark.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { CheckIcon } from '@/assets/icons';

const VISIBLE_MS = 1900;
const FADE_MS = 220;

const ToastHost: React.FC = () => {
  const toast = useAppStore((s) => s.toast);
  const hideToast = useAppStore((s) => s.hideToast);
  const colors = useAppStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!toast) return;
    progress.value = withTiming(1, { duration: 200 });
    const outTimer = setTimeout(() => {
      progress.value = withTiming(0, { duration: FADE_MS });
    }, VISIBLE_MS);
    const clearTimer = setTimeout(hideToast, VISIBLE_MS + FADE_MS + 40);
    return () => {
      clearTimeout(outTimer);
      clearTimeout(clearTimer);
    };
    // Restart on each new toast id; shared values + setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + SPACING.space_64 }, animatedStyle]}
    >
      <View style={[styles.pill, { backgroundColor: colors.text }]}>
        <Icon as={CheckIcon} size={16} color={colors.primary} />
        <ReusableText fontSize={FONTSIZE.sm} fontWeight="bold" themeColor="background">
          {toast.message}
        </ReusableText>
      </View>
    </Animated.View>
  );
};

export default ToastHost;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
    paddingHorizontal: SPACING.space_18,
    paddingVertical: SPACING.space_12,
    borderRadius: BORDERRADIUS.pill_input,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
});
