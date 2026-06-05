/**
 * PlayerControls — auto-hide overlay for VideoPlayer.
 * Tap anywhere to show; hides after 3s of inactivity.
 * Supports both live (LIVE badge, no seek bar) and VOD (time + seek bar).
 *
 * Controls are white on semi-transparent strips so they read on any content.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { VideoPlayer } from 'expo-video';

import { BORDERRADIUS } from '@/theme/borders';
import { Fonts, FONTSIZE } from '@/theme/fonts';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SPACING } from '@/theme/spacing';
import {
  BackwardIcon,
  ForwardIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
} from '@/components/Icons';
import { SEEK_STEP_S } from '@/constants/player';

const AUTO_HIDE_MS = 3000;

export type PlayerControlsProps = {
  player: VideoPlayer;
  isLive?: boolean;
  currentTime: number;
  duration: number;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onClose?: () => void;
  channelName?: string;
  programTitle?: string;
};

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const PlayerControls: React.FC<PlayerControlsProps> = ({
  player,
  isLive = false,
  currentTime,
  duration,
  onToggleFullscreen,
  isFullscreen = false,
  onClose,
  channelName,
  programTitle,
}) => {
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
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    show();
  };

  const handleSeekBack = () => {
    player.seekBy(-SEEK_STEP_S);
    show();
  };

  const handleSeekForward = () => {
    player.seekBy(SEEK_STEP_S);
    show();
  };

  const handleTapOverlay = () => {
    if (visible) return;
    show();
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={handleTapOverlay}
      testID="controls-tap-overlay"
    >
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents={visible ? 'box-none' : 'none'}>
        {/* Top strip */}
        <View style={styles.topStrip}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={styles.hitSlop}
            activeOpacity={0.8}
            testID="controls-close-btn"
          >
            <Text style={styles.iconText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            {channelName ? (
              <Text style={styles.channelName} numberOfLines={1}>
                {channelName}
              </Text>
            ) : null}
            {programTitle ? (
              <Text style={styles.programTitle} numberOfLines={1}>
                {programTitle}
              </Text>
            ) : null}
          </View>

          {isLive ? (
            <View style={styles.liveBadge} testID="controls-live-badge">
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={onToggleFullscreen}
            hitSlop={styles.hitSlop}
            activeOpacity={0.8}
            testID="controls-fullscreen-btn"
            accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <FullscreenIcon size={24} />
          </TouchableOpacity>
        </View>

        {/* Center controls */}
        <View style={styles.centerRow}>
          {!isLive ? (
            <TouchableOpacity
              onPress={handleSeekBack}
              hitSlop={styles.hitSlop}
              activeOpacity={0.8}
              testID="controls-seek-back-btn"
              accessibilityLabel={`Rewind ${SEEK_STEP_S} seconds`}
            >
              <BackwardIcon size={32} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleTogglePlay}
            style={styles.playButton}
            activeOpacity={0.8}
            testID="controls-play-pause-btn"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
          </TouchableOpacity>

          {!isLive ? (
            <TouchableOpacity
              onPress={handleSeekForward}
              hitSlop={styles.hitSlop}
              activeOpacity={0.8}
              testID="controls-seek-forward-btn"
              accessibilityLabel={`Forward ${SEEK_STEP_S} seconds`}
            >
              <ForwardIcon size={32} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Bottom strip */}
        <View style={styles.bottomStrip}>
          {!isLive ? (
            <>
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
              {/* Simple seek bar — touch only. Reanimated pan gesture lives in VodPlayer */}
              <View
                style={styles.seekBarTrack}
                testID="controls-seek-bar"
                onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width || 1)}
                onTouchStart={(e) => {
                  const ratio = e.nativeEvent.locationX / seekBarWidth;
                  if (duration > 0 && isFinite(ratio)) {
                    player.seekBy(ratio * duration - currentTime);
                  }
                }}
              >
                <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
              </View>
            </>
          ) : null}

          <View style={styles.bottomActions}>
            {/* Cast stub — spec mandated button, no functionality in v1 */}
            <TouchableOpacity
              disabled
              activeOpacity={0.8}
              accessibilityLabel="Cast (unavailable)"
              testID="controls-cast-btn"
            >
              <Text style={[styles.iconText, styles.disabledIcon]}>⊡</Text>
            </TouchableOpacity>

            {/* Quality picker stub */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                // TODO(anx 2026-06-02): wire quality picker sheet (Phase 10)
              }}
              testID="controls-quality-btn"
            >
              <Text style={styles.qualityText}>AUTO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_12,
    backgroundColor: PLAYER_COLORS.scrim,
    gap: SPACING.space_12,
  },
  titleContainer: {
    flex: 1,
  },
  channelName: {
    color: PLAYER_COLORS.onSurface,
    fontFamily: Fonts.display,
    fontSize: FONTSIZE.xl,
  },
  programTitle: {
    color: PLAYER_COLORS.onSurfaceDim,
    fontFamily: Fonts.regular,
    fontSize: FONTSIZE.sm,
    marginTop: SPACING.space_2,
  },
  liveBadge: {
    backgroundColor: PLAYER_COLORS.brand,
    paddingHorizontal: SPACING.space_8,
    paddingVertical: SPACING.space_4,
    borderRadius: BORDERRADIUS.radius_8,
  },
  liveBadgeText: {
    color: PLAYER_COLORS.onSurface,
    fontFamily: Fonts.bold,
    fontSize: FONTSIZE.xs,
    letterSpacing: 1,
  },
  iconText: {
    color: PLAYER_COLORS.onSurface,
    fontSize: FONTSIZE.xl,
  },
  centerRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.space_40,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: BORDERRADIUS.full,
    backgroundColor: PLAYER_COLORS.controlBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.space_16,
    paddingVertical: SPACING.space_12,
    backgroundColor: PLAYER_COLORS.scrim,
    gap: SPACING.space_8,
  },
  timeText: {
    color: PLAYER_COLORS.onSurfaceMuted,
    fontFamily: Fonts.regular,
    fontSize: FONTSIZE.xs,
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: PLAYER_COLORS.track,
    borderRadius: BORDERRADIUS.full,
    overflow: 'hidden',
  },
  seekBarFill: {
    height: '100%',
    backgroundColor: PLAYER_COLORS.brand,
    borderRadius: BORDERRADIUS.full,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.space_16,
  },
  disabledIcon: {
    opacity: 0.4,
  },
  qualityText: {
    color: PLAYER_COLORS.onSurface,
    fontFamily: Fonts.medium,
    fontSize: FONTSIZE.xs,
    letterSpacing: 0.5,
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
});

export default PlayerControls;
