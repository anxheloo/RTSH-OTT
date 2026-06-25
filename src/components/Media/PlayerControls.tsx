/**
 * PlayerControls — auto-hide overlay chrome for VideoPlayer, styled to the
 * design's player (design `sPlayer`):
 *  - top bar: glass back (left) + glass options (right) buttons
 *  - centered title (channel/programme name) at the top
 *  - LIVE tag (bottom-left, YouTube-style — part of the chrome, hides with it)
 *  - bottom control row: play/pause + seek track (fill + knob) + fullscreen
 *
 * Quality / audio / cast / PIP live in the options sheet (opened via the top
 * options button → `onOpenOptions`), not in this chrome. Tap anywhere to reveal
 * the chrome; it hides after 3s. Controls are white over a glass/scrim so they
 * read on any frame. The player surface is always dark, so colors come from
 * `PLAYER_COLORS`, not the theme.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { VideoPlayer } from 'expo-video';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SPACING } from '@/theme/spacing';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import {
  ChevronLeftIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
  SettingsIcon,
} from '@/assets/icons';

const AUTO_HIDE_MS = 3000;

export type PlayerControlsProps = {
  player: VideoPlayer;
  isLive?: boolean;
  currentTime: number;
  duration: number;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onClose?: () => void;
  /** Opens the player options sheet (quality/audio/subtitles/cast/PIP) — 22.10. */
  onOpenOptions?: () => void;
  channelName?: string;
  programTitle?: string;
};

const PlayerControls: React.FC<PlayerControlsProps> = ({
  player,
  isLive = false,
  currentTime,
  duration,
  onToggleFullscreen,
  onClose,
  onOpenOptions,
  channelName,
  programTitle,
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(player.playing);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useSharedValue(1);

  // Seek-bar scrub state, all on the UI thread so the drag tracks the finger at
  // 60fps with no JS round-trip per frame. `trackWidth` is measured via onLayout;
  // `scrubX` is the finger x while dragging; `isScrubbing` gates the visual onto
  // the finger; `progressSv` mirrors the JS playback progress for the idle bar.
  // Each SharedValue has a single mutation owner: the react-hooks/immutability
  // rule freezes any SV the effect touches, so an effect-written SV can never be
  // written from a worklet (or vice-versa). `progressSv` is effect-owned (read
  // only in the derived value); `heldRatioSv` is worklet-owned.
  const trackWidth = useSharedValue(1);
  const scrubRatioSv = useSharedValue(0); // finger position as a 0..1 ratio
  const isScrubbing = useSharedValue(false);
  const progressSv = useSharedValue(0); // effect-owned mirror of JS progress
  // After releasing a scrub, hold the bar at the released position until the
  // player catches up — otherwise the fill snaps back for the frame between
  // release and the next `timeUpdate`. `heldRatioSv` is the held ratio while
  // >= 0, and -1 once released; worklet-owned (set in onFinalize, cleared in
  // displayProgress when the mirror catches up — a one-shot so it never re-freezes).
  const heldRatioSv = useSharedValue(-1); // -1 = no active hold

  // SharedValue is stable — no useCallback needed; plain functions avoid the
  // react-hooks/immutability rule that fires when a SharedValue is in deps.
  const hide = () => {
    opacity.value = withTiming(0, { duration: 300 });
    setVisible(false);
  };

  const show = () => {
    opacity.value = withTiming(1, { duration: 200 });
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(hide, AUTO_HIDE_MS);
  };

  // Controls start visible; schedule the initial auto-hide without calling show()
  // (which would trigger setState synchronously in an effect body).
  useEffect(() => {
    timerRef.current = setTimeout(hide, AUTO_HIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying: playing }) => {
      setIsPlaying(playing);
    });
    return () => sub.remove();
  }, [player]);

  const handleTogglePlay = () => {
    if (player.playing) player.pause();
    else player.play();
    show();
  };

  const handleTapOverlay = () => {
    if (visible) return;
    show();
  };

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Live with no measured duration sits at the live edge (full bar, no scrub).
  const isSeekable = duration > 0;
  const progress = isSeekable ? Math.min(Math.max(currentTime / duration, 0), 1) : isLive ? 1 : 0;

  // Mirror the JS playback progress onto the UI thread for the idle bar.
  useEffect(() => {
    progressSv.value = progress;
    // `progressSv` is a stable ref and intentionally omitted from deps — listing
    // it would mark it immutable (react-hooks/immutability).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Move the player to the seeked time (JS thread). Kept free of SharedValue
  // writes and refs so it's safe to schedule from the gesture worklet — both
  // would otherwise trip the react-hooks immutability/refs rules. Reads the
  // player's live `currentTime` (not the prop) so the relative `seekBy` is exact
  // regardless of how stale the last `timeUpdate` prop is; `seekBy` rather than
  // the `currentTime` setter, since assigning a player prop trips immutability.
  const commitSeek = (target: number) => {
    player.seekBy(target - player.currentTime);
  };

  // Tap-to-jump + drag-to-scrub in one Pan gesture: onBegin seeds the position
  // (so a tap without movement still seeks), onUpdate follows the finger, and
  // onFinalize commits — firing whether or not the pan crossed its activation
  // threshold. The SharedValue writes happen here on the UI thread; only the
  // player move is scheduled to JS. Disabled when not seekable (live edge).
  const seekGesture = Gesture.Pan()
    .enabled(isSeekable)
    .onBegin((e) => {
      isScrubbing.value = true;
      scrubRatioSv.value =
        trackWidth.value > 0 ? Math.min(Math.max(e.x / trackWidth.value, 0), 1) : 0;
    })
    .onUpdate((e) => {
      scrubRatioSv.value =
        trackWidth.value > 0 ? Math.min(Math.max(e.x / trackWidth.value, 0), 1) : 0;
    })
    .onFinalize(() => {
      const clamped = scrubRatioSv.value;
      heldRatioSv.value = clamped; // hold here until the mirror catches up (see displayProgress)
      isScrubbing.value = false;
      scheduleOnRN(commitSeek, clamped * duration);
    });

  // Bar position (0..1): the finger while scrubbing; the held release point until
  // the mirror reaches it after a seek; otherwise the live playback progress.
  // `trackWidth` is read only in the gesture worklets and the animated styles
  // below (never here) — reading a JS-written SV in useDerivedValue freezes it.
  const displayProgress = useDerivedValue(() => {
    if (isScrubbing.value) return scrubRatioSv.value;
    if (heldRatioSv.value >= 0) {
      // Hold the released position until playback reaches it, then release for
      // good (one-shot — clearing avoids re-freezing as progress moves past).
      if (Math.abs(progressSv.value - heldRatioSv.value) < 0.01) heldRatioSv.value = -1;
      else return heldRatioSv.value;
    }
    return progressSv.value;
  });
  const fillStyle = useAnimatedStyle(() => ({ width: trackWidth.value * displayProgress.value }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackWidth.value * displayProgress.value }],
  }));

  const title = channelName ?? programTitle;

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={handleTapOverlay}
      testID="controls-tap-overlay"
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, overlayStyle]}
        pointerEvents={visible ? 'box-none' : 'none'}
      >
        {/* LIVE tag — bottom-left, YouTube-style; part of the chrome. */}
        {isLive ? (
          <View style={styles.liveTag} testID="controls-live-badge">
            <View style={styles.liveDot} />
            <ReusableText fontSize={FONTSIZE.xxs} fontWeight="extraBold" style={styles.liveText}>
              {t('player.live')}
            </ReusableText>
          </View>
        ) : null}

        {/* Top bar: glass back + glass options. Back renders only when the host
            wires onClose — the channel screen owns a single screen-level back
            (consistent across portrait/fullscreen), so it passes none. */}
        <View style={styles.topBar}>
          {onClose ? (
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityLabel="Back"
              testID="controls-close-btn"
            >
              <Icon as={ChevronLeftIcon} size={22} color={PLAYER_COLORS.onSurface} />
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}

          {onOpenOptions ? (
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={onOpenOptions}
              activeOpacity={0.8}
              accessibilityLabel="Player options"
              testID="controls-options-btn"
            >
              <Icon as={SettingsIcon} size={20} color={PLAYER_COLORS.onSurface} />
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        {/* Centered title */}
        {title ? (
          <ReusableText
            fontSize={FONTSIZE.md}
            fontWeight="extraBold"
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </ReusableText>
        ) : null}

        {/* Bottom controls: play/pause + track + fullscreen */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={handleTogglePlay}
            hitSlop={styles.hitSlop}
            activeOpacity={0.8}
            testID="controls-play-pause-btn"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Icon as={isPlaying ? PauseIcon : PlayIcon} size={22} color={PLAYER_COLORS.onSurface} />
          </TouchableOpacity>

          <GestureDetector gesture={seekGesture}>
            <View
              style={styles.trackHitArea}
              testID="controls-seek-bar"
              onLayout={(e) => {
                trackWidth.value = e.nativeEvent.layout.width || 1;
              }}
            >
              <View style={styles.track}>
                <Animated.View style={[styles.fill, fillStyle]} />
                <Animated.View style={[styles.knob, knobStyle]} />
              </View>
            </View>
          </GestureDetector>

          {onToggleFullscreen ? (
            <TouchableOpacity
              onPress={onToggleFullscreen}
              hitSlop={styles.hitSlop}
              activeOpacity={0.8}
              testID="controls-fullscreen-btn"
              accessibilityLabel="Toggle fullscreen"
            >
              <Icon as={FullscreenIcon} size={22} color={PLAYER_COLORS.onSurface} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const GLASS_BTN = 40;
const KNOB = 13;

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: SPACING.space_10,
    left: SPACING.space_10,
    right: SPACING.space_10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassBtn: {
    width: GLASS_BTN,
    height: GLASS_BTN,
    borderRadius: BORDERRADIUS.full,
    backgroundColor: PLAYER_COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: GLASS_BTN,
  },
  title: {
    position: 'absolute',
    top: SPACING.space_16,
    left: GLASS_BTN + SPACING.space_16,
    right: GLASS_BTN + SPACING.space_16,
    textAlign: 'center',
    color: PLAYER_COLORS.onSurface,
    letterSpacing: 0.5,
  },
  liveTag: {
    position: 'absolute',
    bottom: SPACING.space_12 + GLASS_BTN,
    left: SPACING.space_15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_4,
    backgroundColor: PLAYER_COLORS.brand,
    paddingHorizontal: SPACING.space_8,
    paddingVertical: 3,
    borderRadius: BORDERRADIUS.radius_8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PLAYER_COLORS.onSurface,
  },
  liveText: {
    color: PLAYER_COLORS.onSurface,
    letterSpacing: 0.5,
  },
  controlRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SPACING.space_12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_12,
    paddingHorizontal: SPACING.space_15,
  },
  // Enlarged touch target around the thin visual bar so the scrubber is easy to
  // grab; only vertical padding so its width equals the track width (gesture x
  // and the fill/knob percentages share one coordinate space).
  trackHitArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.space_12,
  },
  track: {
    width: '100%',
    height: 4,
    borderRadius: 3,
    backgroundColor: PLAYER_COLORS.track,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: PLAYER_COLORS.brand,
    borderRadius: 3,
  },
  knob: {
    position: 'absolute',
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    marginLeft: -KNOB / 2,
    backgroundColor: PLAYER_COLORS.brand,
    borderWidth: 3,
    borderColor: PLAYER_COLORS.knobGlow,
  },
  hitSlop: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
});

export default PlayerControls;
