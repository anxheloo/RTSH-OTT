/**
 * ChannelSwipeArea — swipe left/right (touch) or press CH± (TV remote) to change
 * channel/station WITHOUT leaving the screen. It owns no playback: it only
 * reports the id to switch to via `onChange`, and the host swaps its local
 * `activeId` so the same player instance swaps its source in place.
 *
 * Why a gesture over ONE player rather than a horizontal pager: a pager keeps
 * neighbouring pages mounted, i.e. extra players, streams, realtime watch
 * segments and ad lookups for channels nobody is watching. Here only light
 * "zap cards" (logo + name) move with the finger; the real video never does.
 *
 * Sequence (touch): drag → the neighbour's card slides in from the edge →
 * release past 25% of the width (or a fast flick) → the card finishes covering
 * the box → `onChange` → a static landing card (same look, same place) mounts
 * and its `onLayout` resets the drag strip, so nothing flashes between the two →
 * the landing card fades out once the host has switched. A short or slow drag
 * springs back.
 *
 * TV: no gesture. Each CH± press moves a pending target and shows its card at
 * once; the switch commits only after ZAP_COMMIT_DELAY_MS without another press,
 * so mashing CH+ does not load every channel passed through.
 *
 * Gesture conflicts: `activeOffsetX` + `failOffsetY` hand vertical drags to the
 * player route's swipe-down dismiss and the EPG list; the catch-up scrubber is
 * an inner Pan that activates first, so it wins inside its own bar.
 *
 * Known iOS race (device-verified 2026-10-19): `gestureDirection: 'vertical'`
 * makes react-native-screens install a FULL-SCREEN dismiss pan that begins on
 * movement in any direction and cancels this one when it recognizes first. The
 * 10px thresholds make this pan win most horizontal swipes; a fast flick can
 * still lose. See ARCHITECTURE.md → Channel switching.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import ReusableText from '@/components/Inputs/ReusableText';
import ReusableImage from '@/components/Media/ReusableImage';
import { getAdjacentId } from '@/utils/channelOrder';
import { isTV, useTVChannelKeys } from '@/tv';

/** Fraction of the width a drag must cross to commit. */
const COMMIT_DISTANCE = 0.25;
/** px/s — a flick shorter than COMMIT_DISTANCE still commits above this. */
const COMMIT_VELOCITY = 800;
const SLIDE_OUT_MS = 180;
/** How long the landing card stays before fading, so the new stream can start behind it. */
const LANDING_HOLD_MS = 400;
/** TV: idle time after the last CH± press before the switch commits. */
const ZAP_COMMIT_DELAY_MS = 500;
const LOGO_W = 132;
const LOGO_H = 44;

export interface ZapTarget {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface ChannelSwipeAreaProps {
  /** Ordered list to step through (the cached list order Home shows). */
  items: readonly ZapTarget[];
  activeId: string;
  onChange: (id: string) => void;
  /** Off while something must not be switched away from (e.g. the PIN modal is up). */
  enabled?: boolean;
  /** Fired on touch-down / first remote press — the host warms the neighbours' data. */
  onIntent?: () => void;
  cardColor: string;
  textColor: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: React.ReactNode;
}

const ZapCard: React.FC<{ item: ZapTarget; cardColor: string; textColor: string }> = ({
  item,
  cardColor,
  textColor,
}) => (
  <View style={[styles.cardContent, { backgroundColor: cardColor }]}>
    {item.imageUrl ? (
      <ReusableImage
        source={item.imageUrl}
        width={LOGO_W}
        height={LOGO_H}
        contentFit="contain"
        cachePolicy="memory-disk"
        transitionDurationMs={0}
        containerStyle={styles.logo}
      />
    ) : null}
    <ReusableText
      fontSize={FONTSIZE.md}
      fontWeight="extraBold"
      numberOfLines={1}
      style={{ color: textColor }}
    >
      {item.name}
    </ReusableText>
  </View>
);

const ChannelSwipeArea: React.FC<ChannelSwipeAreaProps> = ({
  items,
  activeId,
  onChange,
  enabled = true,
  onIntent,
  cardColor,
  textColor,
  style,
  testID,
  children,
}) => {
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const prev = byId.get(getAdjacentId(ids, activeId, -1) ?? '');
  const next = byId.get(getAdjacentId(ids, activeId, 1) ?? '');

  const width = useSharedValue(1);
  const x = useSharedValue(0);

  // The card shown after a commit (touch) or while a TV zap is pending. Its id
  // matching `activeId` means the host has switched → start the fade.
  const [landing, setLanding] = useState<ZapTarget | null>(null);
  useEffect(() => {
    if (!landing || landing.id !== activeId) return;
    const id = setTimeout(() => setLanding(null), LANDING_HOLD_MS);
    return () => clearTimeout(id);
  }, [landing, activeId]);

  // ---- Touch ----
  // Plain functions: the React Compiler memoizes them, and `useTVChannelKeys`
  // reads its callback through a ref, so neither needs a stable identity.
  const commitSwipe = (dir: 1 | -1) => {
    const target = dir === 1 ? next : prev;
    if (!target) return;
    setLanding(target);
    onChange(target.id);
  };

  const hasPrev = !!prev;
  const hasNext = !!next;
  const pan = Gesture.Pan()
    .withTestId(`${testID ?? 'channel-swipe-area'}-pan`)
    .enabled(enabled && !isTV && (hasPrev || hasNext))
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      if (onIntent) scheduleOnRN(onIntent);
    })
    .onStart(() => {
      cancelAnimation(x);
    })
    .onUpdate((e) => {
      const blocked = (e.translationX < 0 && !hasNext) || (e.translationX > 0 && !hasPrev);
      // Rubber-band toward a side with nothing on it.
      x.value = blocked ? e.translationX / 4 : e.translationX;
    })
    .onEnd((e) => {
      const dir: 1 | -1 = e.translationX < 0 ? 1 : -1;
      const available = dir === 1 ? hasNext : hasPrev;
      const far =
        Math.abs(e.translationX) > width.value * COMMIT_DISTANCE ||
        Math.abs(e.velocityX) > COMMIT_VELOCITY;
      if (!available || !far) {
        x.value = withSpring(0);
        return;
      }
      x.value = withTiming(-dir * width.value, { duration: SLIDE_OUT_MS }, (finished) => {
        if (finished) scheduleOnRN(commitSwipe, dir);
      });
    });

  const prevStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - width.value }],
  }));
  const nextStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value + width.value }],
  }));

  // ---- TV remote ----
  const pendingIdRef = useRef<string | null>(null);
  const zapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (zapTimerRef.current) clearTimeout(zapTimerRef.current);
    },
    [],
  );
  const stepRemote = (dir: 1 | -1) => {
    const from = pendingIdRef.current ?? activeId;
    if (!pendingIdRef.current) onIntent?.();
    const targetId = getAdjacentId(ids, from, dir);
    const target = targetId ? byId.get(targetId) : undefined;
    if (!target) return;
    pendingIdRef.current = target.id;
    setLanding(target);
    if (zapTimerRef.current) clearTimeout(zapTimerRef.current);
    zapTimerRef.current = setTimeout(() => {
      pendingIdRef.current = null;
      onChange(target.id);
    }, ZAP_COMMIT_DELAY_MS);
  };
  useTVChannelKeys(stepRemote, enabled);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={[styles.container, style]}
        collapsable={false}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width || 1;
        }}
        testID={testID}
      >
        {children}
        {prev ? (
          <Animated.View style={[StyleSheet.absoluteFill, prevStyle]} pointerEvents="none">
            <ZapCard item={prev} cardColor={cardColor} textColor={textColor} />
          </Animated.View>
        ) : null}
        {next ? (
          <Animated.View style={[StyleSheet.absoluteFill, nextStyle]} pointerEvents="none">
            <ZapCard item={next} cardColor={cardColor} textColor={textColor} />
          </Animated.View>
        ) : null}
        {landing ? (
          <Animated.View
            key={landing.id}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            exiting={FadeOut.duration(200)}
            // Mounted natively → it now covers the box, so the drag strip can
            // snap home underneath it without a frame of the old channel.
            onLayout={() => {
              x.value = 0;
            }}
            testID="zap-landing-card"
          >
            <ZapCard item={landing} cardColor={cardColor} textColor={textColor} />
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  // Clips the neighbour cards parked off either edge.
  container: {
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.space_12,
    paddingHorizontal: SPACING.space_16,
  },
  logo: {
    backgroundColor: 'transparent',
  },
});

export default ChannelSwipeArea;
