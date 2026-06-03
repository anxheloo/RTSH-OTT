/**
 * Channel modal — full-screen live player for a specific channel.
 * Same as player/[id] for now; will expand with EPG sidebar in a future pass.
 *
 * TODO(anx 2026-06-02): add EPG strip below player once channels + EPG
 * query hooks land (5.X.3).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import LivePlayer from '@/components/Media/LivePlayer';

const STUB_STREAM_URL = 'https://stream.rtsh.al/rtsh1/live.m3u8';

const ChannelScreen: React.FC = () => {
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

export default ChannelScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
