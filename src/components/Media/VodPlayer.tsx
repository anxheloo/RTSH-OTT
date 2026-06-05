/**
 * VodPlayer — catch-up / VOD player.
 * Wraps VideoPlayer + PlayerControls. Adds resume-position seek and
 * periodic position save (every 5s + on unmount).
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SPACING } from '@/theme/spacing';
import { useLockOrientationOnMount } from '@/hooks/useOrientation';
import ReusableText from '@/components/Inputs/ReusableText';
import { FullScreenLoader } from '@/components/Layout';

import PlayerControls from './PlayerControls';
import type { VideoStatus } from './VideoPlayer';
import VideoPlayer from './VideoPlayer';

export type VodPlayerProps = {
  programId: string;
  streamUrl: string;
  streamHeaders?: Record<string, string>;
  title: string;
  resumePosition?: number;
  onPositionSave?: (seconds: number) => void;
  onClose?: () => void;
};

const VodPlayer: React.FC<VodPlayerProps> = ({
  streamUrl,
  streamHeaders,
  title,
  resumePosition = 0,
  onPositionSave,
  onClose,
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasSeekedToResume, setHasSeekedToResume] = useState(false);
  const currentTimeRef = useRef(0);
  const playerSeekRef = useRef<((seconds: number) => void) | null>(null);

  useLockOrientationOnMount();

  useEffect(() => {
    if (!onPositionSave) return;
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0) onPositionSave(currentTimeRef.current);
    }, 5000);
    return () => {
      clearInterval(interval);
      if (onPositionSave && currentTimeRef.current > 0) {
        onPositionSave(currentTimeRef.current);
      }
    };
  }, [onPositionSave]);

  const handleStatusChange = (s: VideoStatus) => {
    if (s === 'error') setHasError(true);
    if (s === 'readyToPlay') {
      setHasError(false);
      setIsReady(true);
    }
  };

  const handleTimeUpdate = (ct: number) => {
    currentTimeRef.current = ct;
    if (!hasSeekedToResume && resumePosition > 0 && playerSeekRef.current) {
      playerSeekRef.current(resumePosition);
      setHasSeekedToResume(true);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setHasSeekedToResume(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoPlayer
        key={retryKey}
        source={streamUrl}
        headers={streamHeaders}
        autoPlay
        onStatusChange={handleStatusChange}
        onTimeUpdate={handleTimeUpdate}
        renderOverlay={({ player, currentTime, duration }) => {
          playerSeekRef.current = (seconds) => player.seekBy(seconds - currentTime);
          return (
            <PlayerControls
              player={player}
              isLive={false}
              currentTime={currentTime}
              duration={duration}
              onClose={onClose}
              programTitle={title}
            />
          );
        }}
      />

      {!isReady && !hasError && (
        <FullScreenLoader message={title} testID="vod-player-loader" />
      )}

      {hasError && (
        <View style={styles.errorOverlay}>
          <ReusableText variant="body" themeColor="textMuted" textAlign="center">
            {title}
          </ReusableText>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRetry}
            activeOpacity={0.8}
            testID="vod-player-retry"
          >
            <ReusableText fontSize={FONTSIZE.sm} themeColor="primary">
              Retry
            </ReusableText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PLAYER_COLORS.surface,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PLAYER_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.space_12,
  },
  retryBtn: {
    paddingHorizontal: SPACING.space_24,
    paddingVertical: SPACING.space_10,
    borderRadius: BORDERRADIUS.radius_8,
    borderWidth: 1,
    borderColor: PLAYER_COLORS.brand,
  },
});

export default VodPlayer;
