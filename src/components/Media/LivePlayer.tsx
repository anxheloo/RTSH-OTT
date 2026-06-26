/**
 * LivePlayer — HLS player rendered **inline** (16:9) inside the channel screen.
 * Plays **both** live and recorded (catch-up) sources from the same component:
 * the parent swaps `streamUrl` to the recorded URL and flips `isLive={false}`,
 * which drops the LIVE badge and lets the seek bar become draggable from 0 (the
 * recorded VOD reports a finite duration, so `PlayerControls` makes it seekable
 * automatically). Wraps VideoPlayer (render-prop) + PlayerControls. Fullscreen +
 * orientation are owned by the parent screen (controlled via `isFullscreen` /
 * `onToggleFullscreen`) so the player composes with the day-strip + EPG list
 * below it. Passes streamHeaders through for AES-128 key auth attempt.
 *
 * TODO(anx 2026-06-02): Validate AES-128 key header forwarding on a real RTSH
 * stream. expo-video VideoSource.headers may not forward to key requests —
 * fallback: react-native-video.
 */
import React, { useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { BORDERRADIUS } from '@/theme/borders';
import { Fonts,FONTSIZE } from '@/theme/fonts';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SPACING } from '@/theme/spacing';
import { FullScreenLoader } from '@/components/Layout';

import PlayerControls from './PlayerControls';
import VideoPlayer, { VideoStatus } from './VideoPlayer';

export type LivePlayerProps = {
  channelId: string;
  streamUrl: string;
  streamHeaders?: Record<string, string>;
  channelName: string;
  channelLogoUrl?: string;
  currentProgramTitle?: string;
  currentProgramEnd?: Date;
  /** `false` for recorded/catch-up playback — drops the LIVE badge, seekable bar. */
  isLive?: boolean;
  /** Fired once when playback enters an error state (analytics `stream_error`). */
  // Analytics disabled for now — re-enable when telemetry is wanted.
  // onError?: (errorType: string) => void;
  onClose?: () => void;
  /** Controlled fullscreen state (orientation owned by the parent screen). */
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Opens the player options sheet (22.10 sub-step 3). */
  onOpenOptions?: () => void;
  style?: StyleProp<ViewStyle>;
};

const LivePlayer: React.FC<LivePlayerProps> = ({
  streamUrl,
  streamHeaders,
  channelName,
  channelLogoUrl,
  currentProgramTitle,
  isLive = true,
  // onError, // Analytics disabled for now — re-enable when telemetry is wanted.
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenOptions,
  style,
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Lock-screen / now-playing metadata. Memoized so its identity is stable —
  // the inner player only re-applies it when the values actually change.
  const metadata = useMemo(
    () => ({ title: channelName, artist: currentProgramTitle, artwork: channelLogoUrl }),
    [channelName, currentProgramTitle, channelLogoUrl],
  );

  const handleStatusChange = (s: VideoStatus) => {
    if (s === 'error') {
      setHasError(true);
      // Analytics disabled for now — re-enable when telemetry is wanted.
      // onError?.('playback'); // expo-video exposes no stable error code here
    }
    if (s === 'readyToPlay') setHasError(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <View style={[styles.container, style]} testID="live-player-container">
      <StatusBar hidden={isFullscreen} />

      <VideoPlayer
        key={retryKey}
        source={streamUrl}
        headers={streamHeaders}
        autoPlay
        allowsPictureInPicture
        startsPictureInPictureAutomatically
        backgroundPlayback
        metadata={metadata}
        onStatusChange={handleStatusChange}
        style={StyleSheet.absoluteFill}
        renderOverlay={({ player, status, currentTime, duration }) => (
          <>
            {status === 'loading' && !hasError ? (
              <FullScreenLoader backgroundColor="background" />
            ) : null}

            {hasError ? (
              <View style={styles.errorContainer} testID="live-player-error">
                <Text style={styles.errorText}>Stream unavailable</Text>
                <TouchableOpacity
                  onPress={handleRetry}
                  style={styles.retryButton}
                  activeOpacity={0.8}
                  testID="live-player-retry-btn"
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!hasError ? (
              <PlayerControls
                player={player}
                isLive={isLive}
                currentTime={currentTime}
                duration={duration}
                onToggleFullscreen={onToggleFullscreen}
                isFullscreen={isFullscreen}
                onClose={onClose}
                onOpenOptions={onOpenOptions}
                channelName={channelName}
                programTitle={currentProgramTitle}
              />
            ) : null}
          </>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PLAYER_COLORS.surface,
  },
  errorContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PLAYER_COLORS.scrimStrong,
    gap: SPACING.space_16,
  },
  errorText: {
    color: PLAYER_COLORS.onSurface,
    fontFamily: Fonts.regular,
    fontSize: FONTSIZE.md,
  },
  retryButton: {
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_12,
    backgroundColor: PLAYER_COLORS.brand,
    borderRadius: BORDERRADIUS.radius_8,
  },
  retryText: {
    color: PLAYER_COLORS.onSurface,
    fontFamily: Fonts.bold,
    fontSize: FONTSIZE.regular,
  },
});

export default LivePlayer;
