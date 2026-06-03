/**
 * Channel modal — full-screen live player for a specific channel.
 * Stream URL and channel name resolved from query hooks.
 *
 * TODO(anx 2026-06-02): add EPG strip below player once EPG query hook
 * integration lands in a future pass.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useChannelQuery, useChannelStreamQuery } from '@/api/queries';
import { FullScreenLoader } from '@/components/Layout';
import LivePlayer from '@/components/Media/LivePlayer';

const ChannelScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  const { stream, isLoading: streamLoading } = useChannelStreamQuery(id ?? '');
  const { channel } = useChannelQuery(id ?? '');

  if (streamLoading) {
    return <FullScreenLoader />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LivePlayer
        channelId={id ?? ''}
        streamUrl={stream?.hlsUrl ?? ''}
        channelName={channel?.name ?? id ?? ''}
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
