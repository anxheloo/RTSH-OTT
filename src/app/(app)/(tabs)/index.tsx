/**
 * Home (Kreu) — design screen 6. Header (logo + mosaic/profile icons), a
 * search entry, and a Televizion/Radio toggle. TV mode: hero carousel, a
 * continue-watching rail, a package filter, then the 2-column channel grid.
 * Radio mode: the station list. One FlashList carries the grid/list; the
 * scrolling top content rides in `ListHeaderComponent` (re-keyed on mode so the
 * column count switches cleanly).
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery, useHomeFeedQuery, useRadioStationsQuery } from '@/api/queries';
import { useTabBarHeight } from '@/hooks';
import { BrandHeader } from '@/components/Brand';
import ChannelCard from '@/components/channels/ChannelCard';
import { ContinueRow, HeroCarousel } from '@/components/home';
import { Icon, IconButton } from '@/components/Icons';
import { FilterChipRow } from '@/components/Inputs';
import { BrowseControls, ScreenLayout, SectionHeader } from '@/components/Layout';
import StationRow from '@/components/radio/StationRow';
import type { Channel, RadioStation } from '@/types/domain';
import { GridIcon, ProfileIcon } from '@/assets/icons';
import {
  ALL_PACKAGES_LABEL,
  CHANNEL_PACKAGES,
  PACKAGE_LABEL,
  type PackageFilter,
} from '@/constants/packages';

type HomeMode = 'tv' | 'radio';

const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const activeStationId = useAppStore((s) => s.radioChannelId);
  const tabBarHeight = useTabBarHeight();

  const [mode, setMode] = useState<HomeMode>('tv');
  const [pkg, setPkg] = useState<PackageFilter>('all');

  const { channels } = useChannelsQuery();
  const { stations } = useRadioStationsQuery();
  const { heroes, continueWatching } = useHomeFeedQuery();

  const filteredChannels = useMemo(
    () => (pkg === 'all' ? channels : channels.filter((c) => c.package === pkg)),
    [channels, pkg],
  );

  const packageChips = useMemo(
    () => [
      { label: ALL_PACKAGES_LABEL, value: 'all' as PackageFilter },
      ...CHANNEL_PACKAGES.map((p) => ({ label: PACKAGE_LABEL[p], value: p as PackageFilter })),
    ],
    [],
  );

  const openChannel = (id: string) => router.push(`/(app)/channel/${id}`);

  const tvHeader = (
    <View>
      <View style={styles.heroWrap}>
        <HeroCarousel items={heroes} onPressItem={openChannel} testID="home-hero" />
      </View>
      {continueWatching.length > 0 ? (
        <>
          <SectionHeader title={t('home.continue_watching')} />
          <ContinueRow items={continueWatching} onPressItem={openChannel} testID="home-continue" />
        </>
      ) : null}
      <View style={styles.chips}>
        <FilterChipRow chips={packageChips} value={pkg} onChange={setPkg} testID="home-pkg-chips" />
      </View>
      <SectionHeader
        title={t('home.tv_channels')}
        actionLabel={t('home.guide_link')}
        onActionPress={() => router.push('/(app)/(tabs)/guide')}
      />
    </View>
  );

  const radioHeader = (
    <View>
      <SectionHeader title={t('home.radio_stations')} />
    </View>
  );

  const renderChannel = ({ item }: { item: Channel }) => (
    <View style={styles.cardWrapper}>
      <ChannelCard
        channelId={item.id}
        name={item.name}
        thumbnailUri={item.thumbnailUrl}
        isLive={item.isLive}
        isAdult={item.isAdult}
        geoBlocked={item.geoBlocked}
        onPress={() => openChannel(item.id)}
      />
    </View>
  );

  const renderStation = ({ item }: { item: RadioStation }) => (
    <StationRow
      station={item}
      isActive={item.id === activeStationId}
      onPress={() => router.push(`/(app)/radio/${item.id}`)}
    />
  );

  return (
    <ScreenLayout>
      <BrandHeader
        testID="home-header"
        rightSlot={
          <View style={styles.headerActions}>
            <IconButton
              size={40}
              backgroundColor={colors.surface}
              onPress={() => router.push('/(app)/mosaic')}
              accessibilityLabel="Mozaik"
              testID="home-mosaic-btn"
            >
              <Icon as={GridIcon} size={20} color={colors.text} />
            </IconButton>
            <IconButton
              size={40}
              backgroundColor={colors.surface}
              onPress={() => router.push('/(app)/(tabs)/profile')}
              accessibilityLabel="Profili"
              testID="home-profile-btn"
            >
              <Icon as={ProfileIcon} size={20} color={colors.text} />
            </IconButton>
          </View>
        }
      />

      {/* Pinned (not in the list header) so toggling TV↔Radio — which re-keys
          the FlashList — never remounts or jolts the search + toggle. */}
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

      {mode === 'tv' ? (
        <FlashList
          key="tv"
          data={filteredChannels}
          renderItem={renderChannel}
          keyExtractor={(item) => item.id}
          numColumns={2}
          ListHeaderComponent={tvHeader}
          ItemSeparatorComponent={() => <View style={styles.rowGap} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + SPACING.space_24 }]}
          showsVerticalScrollIndicator={false}
          testID="home-tv-grid"
        />
      ) : (
        <FlashList
          key="radio"
          data={stations}
          renderItem={renderStation}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={radioHeader}
          contentContainerStyle={[
            styles.listContentRadio,
            { paddingBottom: tabBarHeight + SPACING.space_24 },
          ]}
          showsVerticalScrollIndicator={false}
          testID="home-radio-list"
        />
      )}
    </ScreenLayout>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.space_8,
  },
  heroWrap: {
    paddingTop: SPACING.space_16,
  },
  chips: {
    paddingTop: SPACING.space_8,
  },
  listContent: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
  },
  listContentRadio: {
    paddingBottom: SPACING.space_24,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 5,
  },
  rowGap: {
    height: SPACING.space_10,
  },
});
