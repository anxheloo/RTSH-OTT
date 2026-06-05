/**
 * LivePlayer — HLS live TV player.
 * Wraps VideoPlayer (render-prop) + PlayerControls. Locks to landscape on mount.
 * Passes streamHeaders through for AES-128 key auth attempt.
 *
 * TODO(anx 2026-06-02): Validate AES-128 key header forwarding on a real RTSH
 * stream. expo-video VideoSource.headers may not forward to key requests —
 * fallback: react-native-video.
 */
import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { BORDERRADIUS } from '@/theme/borders';
import { Fonts,FONTSIZE } from '@/theme/fonts';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SPACING } from '@/theme/spacing';
import { useLockOrientationOnMount } from '@/hooks/useOrientation';
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
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
};

const LivePlayer: React.FC<LivePlayerProps> = ({
  streamUrl,
  streamHeaders,
  channelName,
  currentProgramTitle,
  onClose,
  style,
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useLockOrientationOnMount();

  const handleStatusChange = (s: VideoStatus) => {
    if (s === 'error') setHasError(true);
    if (s === 'readyToPlay') setHasError(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <View style={[styles.container, style]} testID="live-player-container">
      <StatusBar hidden />

      <VideoPlayer
        key={retryKey}
        source={streamUrl}
        headers={streamHeaders}
        autoPlay
        allowsPictureInPicture
        startsPictureInPictureAutomatically
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
                isLive
                currentTime={currentTime}
                duration={duration}
                onToggleFullscreen={() => setIsFullscreen((f) => !f)}
                isFullscreen={isFullscreen}
                onClose={onClose}
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
