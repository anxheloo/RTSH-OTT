/**
 * Home (Kreu) — design screen 6. Brand header (logo), a search entry, and a
 * Televizion/Radio toggle. TV mode: hero carousel, then the channel grid.
 * Radio mode: the station list.
 *
 * One FlashList owns the screen's scroll (the `Artists.tsx` pattern): the
 * primary vertical dataset (channel grid / station list) is the list `data`;
 * the search + toggle + horizontal hero carousel + section title all ride in
 * `ListHeaderComponent`, so they scroll up with the content. A horizontal list
 * nested in a vertical list's header is fine (different orientation); never
 * nest a vertical list in a vertical scroller.
 *
 * The list re-keys per mode (`key`) because the grid's column count differs
 * from the radio list — FlashList can't change `numColumns` in place. The
 * remount is invisible (the header has no animation/internal state) and resets
 * scroll to top, which is the right UX when swapping to a different dataset.
 *
 * Responsive: the TV column count comes from `useResponsiveGrid()` (device
 * class + orientation — phone 2, tablet 3/4, TV 4), so the grid widens on
 * tablet/large screens. Cards self-size via `flex: 1`. Radio stays
 * single-column at every size. (TV focus/D-pad nav → plan 22.18.)
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery } from '@/api/queries';
import { useDeviceIdentity, useRefreshOnFocus, useTabBarHeight } from '@/hooks';
import { BrandHeader } from '@/components/Brand';
import ChannelCard from '@/components/channels/ChannelCard';
import ChannelCardSkeleton from '@/components/channels/ChannelCardSkeleton';
import { EmptyChannelsState, EmptyStationsState, ErrorState } from '@/components/empty';
import { HeroCarousel } from '@/components/home';
import { BrowseControls, ScreenLayout, SectionHeader } from '@/components/Layout';
import StationRow from '@/components/radio/StationRow';
import StationRowSkeleton from '@/components/radio/StationRowSkeleton';
import type { Channel, HeroItem } from '@/types/domain';
import { useResponsive, useResponsiveGrid } from '@/responsive';

type HomeMode = 'tv' | 'radio';

/** Gutter between grid columns; cells pad out to SCREEN_PADDING on the edges. */
const GRID_GAP = SPACING.space_10;

// TODO: replace with useHomeFeedQuery once the /home endpoint is live (backend pending).
const MOCK_HERO_ITEMS: HeroItem[] = [
  {
    id: '1',
    kicker: 'PREMIERË SONTE',
    title: 'Fiks Fare',
    meta: 'E Hënë · 21:00 · RTSH 1',
    imageUrl: '',
    channelId: '1',
    isLive: false,
  },
  {
    id: '2',
    kicker: 'LIVE',
    title: 'Lajmet e Mbrëmjes',
    meta: 'E Hënë · 20:00 · RTSH 1',
    imageUrl: '',
    channelId: '1',
    isLive: true,
  },
  {
    id: '3',
    kicker: 'NË VAZHDIM',
    title: 'Shqipëria Direkt',
    meta: 'E Hënë · 18:30 · RTSH 2',
    imageUrl: '',
    channelId: '2',
    isLive: true,
  },
];

const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const activeStationId = useAppStore((s) => s.radioChannelId);
  const tabBarHeight = useTabBarHeight();

  // Register this device once on first Home mount (tabs stay mounted).
  useDeviceIdentity();

  const [mode, setMode] = useState<HomeMode>('tv');

  const { channels: data, isLoading, error, refetch, dataUpdatedAt } = useChannelsQuery(mode);
  const [refreshing, setRefreshing] = useState(false);

  // Refetch on tab re-focus (same pattern as Guide) — Expo Router keeps tabs
  // mounted, so window-focus alone misses tab switches. Foreground / reconnect /
  // mount are covered by the query defaults + the finite `staleTime` override.
  useRefreshOnFocus(refetch);

  const isTv = mode === 'tv';
  // TV grid columns come from device class + orientation; radio is always 1 col.
  const gridColumns = useResponsiveGrid();
  const numColumns = isTv ? gridColumns : 1;
  // Orientation feeds the list key (below): on a phone numColumns is identical
  // in both orientations, so without this FlashList never remounts on rotation
  // and keeps a stale multi-column layout (header wedged beside the grid).
  const { isLandscape } = useResponsive();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openChannel = (id: string) => router.push(`/(app)/channel/${id}`);
  const openStation = (id: string) => router.push(`/(app)/radio/${id}`);

  // Search + toggle scroll up with the content (no stickyHeaderIndices). The
  // mode-specific top content (hero + section title) is part of the same header.
  const listHeader = (
    <View>
      <BrowseControls
        searchPlaceholder={t('home.search_placeholder')}
        onSearchPress={() => router.push('/(app)/(tabs)/search')}
        toggleOptions={[
          { label: t('home.toggle_tv'), value: 'tv' },
          { label: t('home.toggle_radio'), value: 'radio' },
        ]}
        toggleValue={mode}
        onToggleChange={setMode}
        testID="home-browse-controls"
      />
      {isTv && (
        <HeroCarousel
          items={MOCK_HERO_ITEMS}
          onPressItem={openChannel}
          testID="home-hero"
        />
      )}
      {isTv ? (
        <SectionHeader title={t('home.tv_channels')} />
      ) : (
        <SectionHeader title={t('home.radio_stations')} />
      )}
    </View>
  );

  // Skeleton stacks ride ListEmptyComponent: the grid/list swaps placeholders
  // for data in place once the query lands, with no layout jump.
  const tvSkeleton = (
    <View testID="home-tv-skeleton" style={styles.skeletonGrid}>
      {Array.from({ length: numColumns * 3 }, (_, i) => (
        <View key={i} style={[styles.skeletonCell, { width: `${100 / numColumns}%` }]}>
          <ChannelCardSkeleton />
        </View>
      ))}
    </View>
  );

  const radioSkeleton = (
    <View testID="home-radio-skeleton">
      {Array.from({ length: 6 }, (_, i) => (
        <StationRowSkeleton key={i} />
      ))}
    </View>
  );

  // Non-data placeholder: skeleton while loading, ErrorState (with Retry) on a
  // failed load, else the mode's empty state for a genuine `[]`.
  const listEmpty = isLoading ? (
    isTv ? tvSkeleton : radioSkeleton
  ) : error ? (
    <ErrorState onRetry={() => void refetch()} testID="home-error" />
  ) : isTv ? (
    <EmptyChannelsState testID="home-empty" />
  ) : (
    <EmptyStationsState testID="home-empty" />
  );

  const renderItem = ({ item, index }: { item: Channel; index: number }) => {
    if (isTv) {
      const col = index % numColumns;
      return (
        <View
          style={[
            styles.cell,
            {
              paddingLeft: col === 0 ? SCREEN_PADDING : GRID_GAP / 2,
              paddingRight: col === numColumns - 1 ? SCREEN_PADDING : GRID_GAP / 2,
            },
          ]}
        >
          <ChannelCard
            channelId={item.id}
            name={item.name}
            logoUrl={item.logoUrl}
            thumbnailUri={item.imageUrl}
            thumbnailRefreshKey={dataUpdatedAt}
            onPress={() => openChannel(item.id)}
          />
        </View>
      );
    }

    return (
      <StationRow
        station={item}
        isActive={item.id === activeStationId}
        onPress={() => openStation(item.id)}
      />
    );
  };

  return (
    <ScreenLayout>
      <BrandHeader testID="home-header" />

      <FlashList
        // Re-key on mode + column count + orientation: FlashList can't change
        // numColumns in place, and on a phone the count is the same in both
        // orientations — so orientation must force the remount too, else the
        // grid keeps a stale layout after rotating (cheap; header has no state).
        key={`${mode}-${numColumns}-${isLandscape ? 'l' : 'p'}`}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: tabBarHeight + SPACING.space_24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        testID="home-list"
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    paddingBottom: GRID_GAP,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SCREEN_PADDING - GRID_GAP / 2,
  },
  skeletonCell: {
    paddingHorizontal: GRID_GAP / 2,
    paddingBottom: GRID_GAP,
  },
});

export default HomeScreen;