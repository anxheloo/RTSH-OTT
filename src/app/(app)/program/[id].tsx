/**
 * Program modal — full-screen catch-up player for a specific program.
 * Title and stream URL are resolved from the catch-up item query.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useCatchupItemQuery } from '@/api/queries';
import { useCellularGate } from '@/hooks/useCellularGate';
import { FullScreenLoader } from '@/components/Layout';
import VodPlayer from '@/components/Media/VodPlayer';

const ProgramScreen: React.FC = () => {
  useCellularGate();
  const colors = useAppStore((s) => s.colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  const { item, isLoading } = useCatchupItemQuery(id ?? '');

  if (isLoading) {
    return <FullScreenLoader />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <VodPlayer
        programId={id ?? ''}
        streamUrl={item?.streamUrl ?? ''}
        title={item?.title ?? id ?? 'Program'}
        resumePosition={0}
        onClose={() => router.back()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

export default ProgramScreen;