/**
 * EPG tab — Electronic Programme Guide.
 * Fetches today's EPG via useEpgQuery and renders it through EpgRow.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useEpgQuery } from '@/api/queries';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import { EmptyEpgState } from '@/components/empty';
import { EpgRow } from '@/components/epg';
import { FullScreenLoader, TabHeader } from '@/components/Layout';

const EpgScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const { items, isLoading } = useEpgQuery();

  if (isLoading && items.length === 0) {
    return <FullScreenLoader />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabHeader title="EPG" />
      <AnimatedFlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EpgRow item={item} />}
        emptyComponent={<EmptyEpgState />}
        separatorHeight={1}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

export default EpgScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
  },
});
