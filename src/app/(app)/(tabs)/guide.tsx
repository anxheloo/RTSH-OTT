/**
 * Guide (Guida) — design screen 7. A "now" programme guide. Shares the
 * brand header with Home (logo taps back to Kreu); a TV/Radio toggle rides in
 * the list's `ListHeaderComponent` so it scrolls up with the rows (not pinned),
 * mirroring Home's browse controls. The body is a single FlashList of
 * `GuideRow`s under an overline ("TANI NË TV" / "TANI NË RADIO"). The list does
 * not re-key on mode switch (column count is constant), so the header stays
 * mounted through the toggle. TV rows show the airing programme + an
 * elapsed-progress bar derived client-side from `now.start`/`now.end`; radio
 * rows are pending a dedicated live-programme endpoint (gap).
 *
 * Data: server-driven `GET /api/v1/guide` (`useGuideQuery`). Freshness is
 * refetch-only (no poll): tab re-focus (`useRefreshOnFocus`), app foreground /
 * reconnect (query defaults), and pull-to-refresh. The endpoint returns `now`
 * only — there's no "next" line until the backend adds one.
 *
 * Progress is driven by a ticking client clock (`useNow`), NOT the query's
 * `dataUpdatedAt` — so the bar fills in real time between fetches instead of
 * freezing until a refetch. The guide carries only `now` (not the full
 * schedule), so when the earliest airing programme ends a single boundary timer
 * triggers a `refetch` to learn the next one (chains to the following boundary;
 * still no poll).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useGuideQuery } from '@/api/queries';
import { useDateTime } from '@/hooks/useDateTime';
import { useNow } from '@/hooks/useNow';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { BrandHeader } from '@/components/Brand';
import { EmptyChannelsState, EmptyStationsState, ErrorState } from '@/components/empty';
import { GuideRow, GuideRowSkeleton } from '@/components/epg';
import { Icon } from '@/components/Icons';
import { SegmentedToggle } from '@/components/Inputs';
import ReusableText from '@/components/Inputs/ReusableText';
import { ScreenLayout } from '@/components/Layout';
import { programProgress } from '@/utils';
import { RadioIcon } from '@/assets/icons';
import { useContentWidth } from '@/responsive';

type GuideMode = 'tv' | 'radio';

/** View-model for a single guide row — uniform across TV and radio. */
type GuideRowVM = {
  id: string;
  logoLabel: string;
  thumbnailUrl?: string;
  nowTitle: string;
  nextLabel: string;
  progress?: number;
  badge: string;
  isRadio: boolean;
  onPress: () => void;
};

const GuideScreen: React.FC = () => {
  const { t } = useTranslation();
  const { formatTime } = useDateTime();
  const colors = useAppStore((s) => s.colors);
  const tabBarHeight = useTabBarHeight();
  // Center each row on tablet/TV so single-column rows don't stretch; no-op on phone.
  const contentWidth = useContentWidth('content');
  const [mode, setMode] = useState<GuideMode>('tv');
  const [refreshing, setRefreshing] = useState(false);

  const isTv = mode === 'tv';

  // One query, switched by type (each value is its own cache entry) — mirrors
  // the channels endpoint. TV rows open the channel screen; radio rows open the
  // radio player.
  const {
    guide,
    isLoading: rowsLoading,
    error: rowsError,
    refetch: refetchGuide,
  } = useGuideQuery(isTv ? 'TV' : 'RADIO');

  // Tab re-focus refetch — Expo Router keeps tabs mounted, so window-focus alone
  // misses tab switches (see useRefreshOnFocus).
  useRefreshOnFocus(refetchGuide);

  // Ticking client clock drives the progress fill in real time (the server is
  // refetch-only, so `dataUpdatedAt` would freeze the bar between fetches).
  const nowMs = useNow();

  // Boundary rollover: the guide carries only `now` (not the full schedule), so
  // when the earliest airing programme ends we must refetch to learn the next
  // one. Arm a single timer to that edge and refetch when it passes — chains to
  // the following boundary as the fresh data re-runs this effect (no poll).
  useEffect(() => {
    const nextEnd = guide
      .map((c) => (c.now ? Date.parse(c.now.end) : NaN))
      .filter((t) => t > nowMs)
      .sort((a, b) => a - b)[0];
    if (nextEnd === undefined) return;
    const id = setTimeout(() => void refetchGuide(), nextEnd - nowMs + 250);
    return () => clearTimeout(id);
  }, [guide, nowMs, refetchGuide]);

  const rows = useMemo<GuideRowVM[]>(() => {
    // `nowMs` (ticking client clock) is the progress clock — advances every tick
    // so the fill moves in real time without a refetch.
    return guide.map((channel) => ({
      id: channel.channelId,
      logoLabel: channel.channelName,
      thumbnailUrl: channel.imageUrl,
      nowTitle: channel.now?.title ?? channel.channelName,
      // No "next" line — `/guide` returns `now` only (backend gap).
      nextLabel: '',
      progress: channel.now
        ? programProgress(channel.now.start, channel.now.end, nowMs)
        : undefined,
      badge: channel.now ? formatTime(channel.now.start) : t('guide.live'),
      isRadio: !isTv,
      onPress: () =>
        router.push(isTv ? `/(app)/channel/${channel.channelId}` : `/(app)/radio/${channel.channelId}`),
    }));
  }, [guide, nowMs, isTv, formatTime, t]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchGuide();
    setRefreshing(false);
  }, [refetchGuide]);

  const listSkeleton = (
    <View testID="guide-skeleton">
      {Array.from({ length: 8 }, (_, i) => (
        <GuideRowSkeleton key={i} />
      ))}
    </View>
  );

  // Skeleton while loading, ErrorState (with Retry) on a failed catalogue load,
  // else the mode's empty state for a genuine `[]`.
  const listEmpty = rowsLoading ? (
    listSkeleton
  ) : rowsError ? (
    <ErrorState onRetry={() => void refetchGuide()} testID="guide-error" />
  ) : isTv ? (
    <EmptyChannelsState testID="guide-empty" />
  ) : (
    <EmptyStationsState testID="guide-empty" />
  );

  // Toggle + overline scroll up with the rows (in the list header), not pinned.
  const listHeader = (
    <View>
      <View style={styles.toggleWrap}>
        <SegmentedToggle
          options={[
            { label: t('guide.toggle_tv'), value: 'tv' },
            { label: t('guide.toggle_radio'), value: 'radio' },
          ]}
          value={mode}
          onChange={setMode}
          testID="guide-mode-toggle"
        />
      </View>
      <ReusableText variant="bodySmall" fontWeight="extraBold" style={styles.overline}>
        {mode === 'tv' ? t('guide.now_on_tv') : t('guide.now_on_radio')}
      </ReusableText>
    </View>
  );

  return (
    <ScreenLayout>
      <BrandHeader
        testID="guide-header"
        onLogoPress={() => router.navigate('/(app)/(tabs)')}
      />

      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={contentWidth}>
            <GuideRow
              logoLabel={item.logoLabel}
              thumbnailUrl={item.thumbnailUrl}
              nowTitle={item.nowTitle}
              nextLabel={item.nextLabel}
              progress={item.progress}
              badge={item.badge}
              leading={
                item.isRadio ? (
                  <Icon as={RadioIcon} size={18} color={colors.onPrimary} />
                ) : undefined
              }
              onPress={item.onPress}
            />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + SPACING.space_24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        testID="guide-list"
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  toggleWrap: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_4,
    paddingBottom: SPACING.space_12,
  },
  overline: {
    letterSpacing: 0.6,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_8,
    paddingBottom: SPACING.space_4,
  },
  listContent: {
    paddingBottom: SPACING.space_24,
  },
});

export default GuideScreen;