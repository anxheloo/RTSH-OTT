/**
 * AnimatedFlashList — generic FlashList v2 wrapper for vertical lists.
 * Provides: loading footer, empty slot, item separator, pull-to-refresh.
 * For 2-column grids (channel grid) use FlashList directly with numColumns.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { FlashList, FlashListProps } from '@shopify/flash-list';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';

type AnimatedFlashListProps<T> = Omit<
  FlashListProps<T>,
  'ListEmptyComponent' | 'ListFooterComponent' | 'ItemSeparatorComponent'
> & {
  isLoading?: boolean;
  emptyComponent?: React.ReactElement;
  /** Skeleton stack shown in place of the empty slot while `isLoading`
   * (loading-state strategy). Suppresses the footer spinner. */
  skeletonComponent?: React.ReactElement;
  separatorHeight?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

function AnimatedFlashList<T>({
  isLoading = false,
  emptyComponent,
  skeletonComponent,
  separatorHeight = SPACING.space_10,
  onRefresh,
  isRefreshing = false,
  ...rest
}: AnimatedFlashListProps<T>) {
  const colors = useAppStore((s) => s.colors);

  const renderFooter =
    isLoading && !skeletonComponent
      ? () => (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )
      : undefined;

  return (
    <FlashList
      ItemSeparatorComponent={() => <View style={{ height: separatorHeight }} />}
      ListEmptyComponent={isLoading ? (skeletonComponent ?? null) : emptyComponent}
      ListFooterComponent={renderFooter}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: SPACING.space_24,
    alignItems: 'center',
  },
});

export default AnimatedFlashList;
