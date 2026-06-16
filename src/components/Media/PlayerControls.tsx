/**
 * PlayerControls — auto-hide overlay chrome for VideoPlayer, styled to the
 * design's player (design `sPlayer`):
 *  - top bar: glass back (left) + glass options (right) buttons
 *  - centered title (channel/programme name) at the top
 *  - persistent LIVE tag (top-left, stays visible when chrome auto-hides)
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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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
  const [seekBarWidth, setSeekBarWidth] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useSharedValue(1);

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
  const title = channelName ?? programTitle;

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={handleTapOverlay}
      testID="controls-tap-overlay"
    >
      {/* Persistent LIVE tag — stays put when the chrome auto-hides. */}
      {isLive ? (
        <View style={styles.liveTag} testID="controls-live-badge">
          <View style={styles.liveDot} />
          <ReusableText fontSize={FONTSIZE.xxs} fontWeight="extraBold" style={styles.liveText}>
            {t('player.live')}
          </ReusableText>
        </View>
      ) : null}

      <Animated.View
        style={[StyleSheet.absoluteFill, overlayStyle]}
        pointerEvents={visible ? 'box-none' : 'none'}
      >
        {/* Top bar: glass back + glass options */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Back"
            testID="controls-close-btn"
          >
            <Icon as={ChevronLeftIcon} size={22} color={PLAYER_COLORS.onSurface} />
          </TouchableOpacity>

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

          <View
            style={styles.track}
            testID="controls-seek-bar"
            onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width || 1)}
            onTouchStart={(e) => {
              if (!isSeekable) return;
              const ratio = e.nativeEvent.locationX / seekBarWidth;
              if (isFinite(ratio)) player.seekBy(ratio * duration - currentTime);
            }}
          >
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            <View style={[styles.knob, { left: `${progress * 100}%` }]} />
          </View>

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
    top: SPACING.space_16 + GLASS_BTN + SPACING.space_8,
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
  track: {
    flex: 1,
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
