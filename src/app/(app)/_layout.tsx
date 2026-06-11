/**
 * Authenticated app layout — wraps tabs + full-screen player modals.
 * System header is hidden; player modals are presented as full-screen sheets.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';

import RadioMiniPlayer from '@/components/Layout/RadioMiniPlayer';
import LaunchAdHost from '@/components/Media/LaunchAdHost';
import RadioAudioHost from '@/components/Media/RadioAudioHost';
import { getModalScreenOptions } from '@/utils/navigation';

const AppLayout: React.FC = () => {
  return (
    <View style={styles.root}>
      {/*
        Android immersive mode: hide the system nav bar so it can't collide with
        our bottom tab bar (SDK 56 forces edge-to-edge). Declarative — the native
        side manages the transient swipe-reveal + auto-rehide. No-op on iOS.
      */}
      <NavigationBar hidden />
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
        <Stack.Screen name="settings" />
        <Stack.Screen name="player-options" options={getModalScreenOptions()} />
        <Stack.Screen name="quality" options={getModalScreenOptions()} />
        <Stack.Screen name="language" options={getModalScreenOptions()} />
        <Stack.Screen name="theme" options={getModalScreenOptions()} />
      </Stack>
      <RadioAudioHost />
      <RadioMiniPlayer />
      <LaunchAdHost />
    </View>
  );
};

export default AppLayout;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
