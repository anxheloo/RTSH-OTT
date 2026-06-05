/**
 * Catchup tab — catch-up TV / VOD content.
 * Fetches items via useCatchupQuery and renders them through CatchupCard.
 */
import React from 'react';
import { StyleSheet } from 'react-native';

import { SPACING } from '@/theme';
import { useCatchupQuery } from '@/api/queries';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import { CatchupCard } from '@/components/catchup';
import { EmptyCatchupState } from '@/components/empty';
import { FullScreenLoader, ScreenLayout, TabHeader } from '@/components/Layout';

const CatchupScreen: React.FC = () => {
  const { items, isLoading } = useCatchupQuery();

  if (isLoading && items.length === 0) {
    return <FullScreenLoader />;
  }

  return (
    <ScreenLayout>
      <TabHeader title="Catchup" />
      <AnimatedFlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CatchupCard item={item} />}
        emptyComponent={<EmptyCatchupState />}
        separatorHeight={SPACING.space_10}
        contentContainerStyle={styles.list}
      />
    </ScreenLayout>
  );
};

export default CatchupScreen;

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
  },
});
