/**
 * Search (Kërko) — design screen 8. TV/Radio toggle + shared search input.
 *
 * - TV (default): filters the cached TV channels list client-side.
 * - Radio: lazy — `useChannelsQuery('RADIO')` fires only on first mode switch;
 *   skeleton rows show while loading, cache hit on subsequent switches.
 *
 * Search term persists across mode switches. One FlashList, re-keyed on mode
 * switch (row heights differ: SearchResultRow vs StationRow).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery } from '@/api/queries';
import { useSearch } from '@/hooks/useSearch';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { BrandHeader } from '@/components/Brand';
import { SearchResultRow, SearchResultRowSkeleton } from '@/components/channels';
import { EmptyChannelsState, EmptyStationsState, ErrorState } from '@/components/empty';
import type { SegmentedToggleOption } from '@/components/Inputs/SegmentedToggle';
import { BrowseControls, ScreenLayout } from '@/components/Layout';
import StationRow from '@/components/radio/StationRow';
import StationRowSkeleton from '@/components/radio/StationRowSkeleton';
import type { Channel } from '@/types/domain';

type SearchMode = 'tv' | 'radio';

const SKELETON_COUNT = 8;

const SearchScreen: React.FC = () => {
  const { t } = useTranslation();
  const activeStationId = useAppStore((s) => s.radioChannelId);
  const tabBarHeight = useTabBarHeight();
  const { search, updateSearch, debouncedSearch } = useSearch();

  const [mode, setMode] = useState<SearchMode>('tv');
  const radioEnabled = mode === 'radio';

  const {
    channels: tvChannels,
    isLoading: tvLoading,
    error: tvError,
    refetch: refetchTv,
  } = useChannelsQuery('TV');

  const {
    channels: radioStations,
    isLoading: radioLoading,
    error: radioError,
    refetch: refetchRadio,
  } = useChannelsQuery('RADIO', { enabled: radioEnabled });

  const needle = debouncedSearch.trim().toLowerCase();

  const filteredTv = useMemo(
    () => (needle ? tvChannels.filter((c) => c.name.toLowerCase().includes(needle)) : tvChannels),
    [tvChannels, needle],
  );

  const filteredRadio = useMemo(
    () =>
      needle ? radioStations.filter((c) => c.name.toLowerCase().includes(needle)) : radioStations,
    [radioStations, needle],
  );

  const openChannel = useCallback((id: string) => router.push(`/(app)/channel/${id}`), []);
  const openStation = useCallback((id: string) => router.push(`/(app)/radio/${id}`), []);

  const handleModeChange = useCallback((next: SearchMode) => setMode(next), []);

  const toggleOptions: SegmentedToggleOption<SearchMode>[] = useMemo(
    () => [
      { label: t('home.toggle_tv'), value: 'tv' },
      { label: t('home.toggle_radio'), value: 'radio' },
    ],
    [t],
  );

  const isTv = mode === 'tv';
  const isLoading = isTv ? tvLoading : radioLoading;
  const hasError = isTv ? !!tvError : !!radioError;
  const refetch = isTv ? refetchTv : refetchRadio;
  const listData: Channel[] = isTv ? filteredTv : filteredRadio;

  const tvSkeleton = (
    <View testID="search-tv-skeleton">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SearchResultRowSkeleton key={i} />
      ))}
    </View>
  );

  const radioSkeleton = (
    <View testID="search-radio-skeleton">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <StationRowSkeleton key={i} />
      ))}
    </View>
  );

  const listEmpty = isLoading ? (
    isTv ? tvSkeleton : radioSkeleton
  ) : hasError ? (
    <ErrorState onRetry={() => void refetch()} testID="search-error" />
  ) : isTv ? (
    <EmptyChannelsState testID="search-empty" />
  ) : (
    <EmptyStationsState testID="search-empty" />
  );

  const renderItem = useCallback(
    ({ item }: { item: Channel }) => {
      if (isTv) {
        return (
          <SearchResultRow
            name={item.name}
            meta="TV"
            thumbnailUri={item.imageUrl}
            onPress={() => openChannel(item.id)}
            testID={`search-channel-${item.id}`}
          />
        );
      }
      return (
        <StationRow
          station={item}
          isActive={item.id === activeStationId}
          onPress={() => openStation(item.id)}
        />
      );
    },
    [isTv, activeStationId, openChannel, openStation],
  );

  const listHeader = (
    <BrowseControls
      searchPlaceholder={t('home.search_placeholder')}
      searchValue={search}
      onSearchChange={updateSearch}
      autoFocus
      toggleOptions={toggleOptions}
      toggleValue={mode}
      onToggleChange={handleModeChange}
      testID="search-browse-controls"
    />
  );

  return (
    <ScreenLayout>
      <BrandHeader
        testID="search-header"
        onLogoPress={() => router.navigate('/(app)/(tabs)')}
      />

      <FlashList
        key={mode}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: tabBarHeight + SPACING.space_24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </ScreenLayout>
  );
};

export default SearchScreen;