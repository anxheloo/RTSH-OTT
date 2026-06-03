/**
 * RadioPlayer — full-screen expo-audio radio player.
 * Sets background audio mode on mount, writes to PlayerSlice so the
 * RadioMiniPlayer strip stays in sync across tabs.
 *
 * TODO(anx 2026-06-02): Lock-screen metadata (now-playing artwork / title)
 * requires iOS NowPlayingInfo bridge. expo-audio SDK 56 does not expose it
 * directly — wire when the native module is available or upgrade expo-audio.
 */
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import ReusableImage from '@/components/Media/ReusableImage';

export type RadioPlayerProps = {
  channelId: string;
  streamUrl: string;
  title: string;
  artworkUri?: string;
};

const RadioPlayer: React.FC<RadioPlayerProps> = ({
  channelId,
  streamUrl,
  title,
  artworkUri,
}) => {
  const colors = useAppStore((s) => s.colors);
  const setRadioChannel = useAppStore((s) => s.setRadioChannel);
  const setRadioPlaying = useAppStore((s) => s.setRadioPlaying);
  const clearRadio = useAppStore((s) => s.clearRadio);

  const player = useAudioPlayer({ uri: streamUrl });

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });

    setRadioChannel({ channelId, streamUrl, title, artworkUrl: artworkUri });
    player.play();

    return () => {
      player.pause();
      clearRadio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, streamUrl]);

  const handleTogglePlay = () => {
    if (player.playing) {
      player.pause();
      setRadioPlaying(false);
    } else {
      player.play();
      setRadioPlaying(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Artwork */}
      {artworkUri ? (
        <ReusableImage
          source={artworkUri}
          width={200}
          height={200}
          borderRadius={8}
        />
      ) : (
        <View style={[styles.artworkPlaceholder, { backgroundColor: colors.surfaceElevated }]} />
      )}

      {/* Title */}
      <ReusableText
        variant="heading2"
        themeColor="text"
        textAlign="center"
        style={styles.title}
      >
        {title}
      </ReusableText>

      {/* Play / pause */}
      <TouchableOpacity
        style={[styles.playBtn, { backgroundColor: colors.primary }]}
        onPress={handleTogglePlay}
        activeOpacity={0.8}
        testID="radio-player-toggle"
      >
        <ReusableText fontSize={FONTSIZE.xl} themeColor="onPrimary">
          {player.playing ? '⏸' : '▶'}
        </ReusableText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.space_24,
    paddingHorizontal: SPACING.space_24,
  },
  artworkPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  title: {
    textAlign: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RadioPlayer;
