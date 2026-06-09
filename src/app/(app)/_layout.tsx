/**
 * Authenticated app layout — wraps tabs + full-screen player modals.
 * System header is hidden; player modals are presented as full-screen sheets.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Stack } from 'expo-router';

import RadioMiniPlayer from '@/components/Layout/RadioMiniPlayer';
import RadioAudioHost from '@/components/Media/RadioAudioHost';
import { getModalScreenOptions } from '@/utils/navigation';

const AppLayout: React.FC = () => {
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="channel/[id]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="program/[id]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen name="mosaic" />
        <Stack.Screen name="player-options" options={getModalScreenOptions()} />
        <Stack.Screen name="quality" options={getModalScreenOptions()} />
      </Stack>
      <RadioAudioHost />
      <RadioMiniPlayer />
    </View>
  );
};

export default AppLayout;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
