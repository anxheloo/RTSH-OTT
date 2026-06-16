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
      {/* Pushed screens slide in from the right (matches the auth stack);
          full-screen player modals slide up from the bottom — modal semantics,
          and the gesture/back direction reads correctly on both platforms. */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="channel/[id]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="program/[id]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="settings" />
        <Stack.Screen name="account" />
        <Stack.Screen name="change-password" />
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default AppLayout;
