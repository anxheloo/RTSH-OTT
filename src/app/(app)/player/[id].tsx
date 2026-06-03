/**
 * Player modal — full-screen live channel player.
 * Route param `id` is the channel ID. Stream URL is a stub until
 * the channels API (5.X.3) lands — then swap for useChannelStream(id).
 *
 * TODO(anx 2026-06-02): replace stub streamUrl with real channel stream
 * lookup once channels API is wired (5.X.3).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import LivePlayer from '@/components/Media/LivePlayer';

const STUB_STREAM_URL = 'https://stream.rtsh.al/rtsh1/live.m3u8';

const PlayerScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LivePlayer
        channelId={id ?? ''}
        streamUrl={STUB_STREAM_URL}
        channelName={id ?? ''}
        onClose={() => router.back()}
      />
    </View>
  );
};

export default PlayerScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
