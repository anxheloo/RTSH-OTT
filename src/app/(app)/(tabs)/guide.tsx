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
 * Data: server-driven `GET /api/v1/guide` (`useGuideQuery`) — the backend
 * returns the airing programme per channel, so there's no client boundary timer.
 * Freshness is refetch-only (no poll): tab re-focus (`useRefreshOnFocus`), app
 * foreground / reconnect (query defaults), and pull-to-refresh. The endpoint
 * returns `now` only — there's no "next" line until the backend adds one.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useGuideQuery } from '@/api/queries';
import { useDateTime } from '@/hooks/useDateTime';
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
    dataUpdatedAt,
  } = useGuideQuery(isTv ? 'TV' : 'RADIO');

  // Tab re-focus refetch — Expo Router keeps tabs mounted, so window-focus alone
  // misses tab switches (see useRefreshOnFocus).
  useRefreshOnFocus(refetchGuide);

  const rows = useMemo<GuideRowVM[]>(() => {
    // `dataUpdatedAt` (fetch time) is the progress clock — pure and advances on
    // each refetch (focus/reconnect/pull). It's 0 before the first fetch, but
    // `guide` is empty then so no row reads it.
    return guide.map((channel) => ({
      id: channel.channelId,
      logoLabel: channel.channelName,
      thumbnailUrl: channel.imageUrl,
      nowTitle: channel.now?.title ?? channel.channelName,
      // No "next" line — `/guide` returns `now` only (backend gap).
      nextLabel: '',
      progress: channel.now
        ? programProgress(channel.now.start, channel.now.end, dataUpdatedAt)
        : undefined,
      badge: channel.now ? formatTime(channel.now.start) : t('guide.live'),
      isRadio: !isTv,
      onPress: () =>
        router.push(isTv ? `/(app)/channel/${channel.channelId}` : `/(app)/radio/${channel.channelId}`),
    }));
  }, [guide, dataUpdatedAt, isTv, formatTime, t]);

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
          <GuideRow
            logoLabel={item.logoLabel}
            thumbnailUrl={item.thumbnailUrl}
            nowTitle={item.nowTitle}
            nextLabel={item.nextLabel}
            progress={item.progress}
            badge={item.badge}
            leading={
              item.isRadio ? <Icon as={RadioIcon} size={18} color={colors.onPrimary} /> : undefined
            }
            onPress={item.onPress}
          />
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