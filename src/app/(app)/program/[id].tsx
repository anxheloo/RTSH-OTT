/**
 * Program modal — full-screen catch-up player for a specific program.
 * Uses VodPlayer with a stub stream URL until the catchup API lands (5.X.3).
 *
 * TODO(anx 2026-06-02): replace stub streamUrl with real program stream
 * and resume position from MMKV once catchup query hooks land (5.X.3).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useCellularGate } from '@/hooks/useCellularGate';
import VodPlayer from '@/components/Media/VodPlayer';

const STUB_VOD_URL = 'https://stream.rtsh.al/catchup/stub.m3u8';

const ProgramScreen: React.FC = () => {
  useCellularGate();
  const colors = useAppStore((s) => s.colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <VodPlayer
        programId={id ?? ''}
        streamUrl={STUB_VOD_URL}
        title={id ?? 'Program'}
        resumePosition={0}
        onClose={() => router.back()}
      />
    </View>
  );
};

export default ProgramScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
