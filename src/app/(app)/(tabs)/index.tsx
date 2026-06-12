/**
 * Home (Kreu) — design screen 6. Brand header (logo + profile icon), a
 * search entry, and a Televizion/Radio toggle. TV mode: hero carousel, then
 * the 2-column channel grid. Radio mode: the station list. One FlashList
 * carries the grid/list; the scrolling top content rides in
 * `ListHeaderComponent` (re-keyed on mode so the column count switches
 * cleanly).
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery, useHomeFeedQuery, useRadioStationsQuery } from '@/api/queries';
import { useTabBarHeight } from '@/hooks';
import { BrandHeader } from '@/components/Brand';
import ChannelCard from '@/components/channels/ChannelCard';
import ChannelCardSkeleton from '@/components/channels/ChannelCardSkeleton';
import { HeroCarousel } from '@/components/home';
import { Icon, IconButton } from '@/components/Icons';
import { BrowseControls, ScreenLayout, SectionHeader } from '@/components/Layout';
import StationRow from '@/components/radio/StationRow';
import StationRowSkeleton from '@/components/radio/StationRowSkeleton';
import type { Channel, RadioStation } from '@/types/domain';
import { ProfileIcon } from '@/assets/icons';

type HomeMode = 'tv' | 'radio';

/** Gap between the two grid columns. Edge cells pad out to SCREEN_PADDING so the
 * list itself stays full-bleed (its header rows own their internal padding). */
const GRID_GAP = SPACING.space_10;

const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const activeStationId = useAppStore((s) => s.radioChannelId);
  const tabBarHeight = useTabBarHeight();

  const [mode, setMode] = useState<HomeMode>('tv');

  const { channels, isLoading: channelsLoading } = useChannelsQuery();
  const { stations, isLoading: stationsLoading } = useRadioStationsQuery();
  const { heroes, isLoading: heroesLoading } = useHomeFeedQuery();

  const openChannel = (id: string) => router.push(`/(app)/channel/${id}`);

  const tvHeader = (
    <View>
      <View style={styles.heroWrap}>
        <HeroCarousel
          items={heroes}
          isLoading={heroesLoading}
          onPressItem={openChannel}
          testID="home-hero"
        />
      </View>
      <SectionHeader title={t('home.tv_channels')} />
    </View>
  );

  // Skeleton stacks ride ListEmptyComponent: the grid/list swaps placeholders
  // for data in place once the query lands, with no layout jump.
  const tvSkeleton = (
    <View testID="home-tv-skeleton">
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={[styles.skeletonGridRow, i > 0 && styles.skeletonRowGap]}>
          <View style={styles.cellLeft}>
            <ChannelCardSkeleton />
          </View>
          <View style={styles.cellRight}>
            <ChannelCardSkeleton />
          </View>
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

  const radioHeader = (
    <View>
      <SectionHeader title={t('home.radio_stations')} />
    </View>
  );

  const renderChannel = ({ item, index }: { item: Channel; index: number }) => (
    <View style={index % 2 === 0 ? styles.cellLeft : styles.cellRight}>
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
          <IconButton
            size={40}
            backgroundColor={colors.surface}
            onPress={() => router.push('/(app)/(tabs)/profile')}
            accessibilityLabel="Profili"
            testID="home-profile-btn"
          >
            <Icon as={ProfileIcon} size={20} color={colors.text} />
          </IconButton>
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

      <View style={styles.listWrap}>
        {mode === 'tv' ? (
          <FlashList
            key="tv"
            data={channels}
            renderItem={renderChannel}
            keyExtractor={(item) => item.id}
            numColumns={2}
            ListHeaderComponent={tvHeader}
            ListEmptyComponent={channelsLoading ? tvSkeleton : null}
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
            ListEmptyComponent={stationsLoading ? radioSkeleton : null}
            contentContainerStyle={[
              styles.listContentRadio,
              { paddingBottom: tabBarHeight + SPACING.space_24 },
            ]}
            showsVerticalScrollIndicator={false}
            testID="home-radio-list"
          />
        )}
        {/* Content dissolves into the background as it scrolls under the
            search + toggle, instead of clipping hard at the list edge
            (same docked-CTA fade as guide). */}
        <LinearGradient
          colors={[colors.background, `${colors.background}B3`, `${colors.background}00`]}
          locations={[0, 0.35, 1]}
          style={styles.topFade}
          pointerEvents="none"
        />
      </View>
    </ScreenLayout>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  heroWrap: {
    paddingTop: SPACING.space_16,
  },
  listWrap: {
    flex: 1,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SPACING.space_48,
  },
  listContent: {
    paddingBottom: SPACING.space_24,
  },
  listContentRadio: {
    paddingBottom: SPACING.space_24,
  },
  cellLeft: {
    flex: 1,
    paddingLeft: SCREEN_PADDING,
    paddingRight: GRID_GAP / 2,
  },
  cellRight: {
    flex: 1,
    paddingLeft: GRID_GAP / 2,
    paddingRight: SCREEN_PADDING,
  },
  rowGap: {
    height: SPACING.space_10,
  },
  skeletonGridRow: {
    flexDirection: 'row',
  },
  skeletonRowGap: {
    marginTop: SPACING.space_10,
  },
});
