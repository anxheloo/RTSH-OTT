/**
 * Guide (Guida) — design screen 7. A "now & next" programme guide. Shares the
 * brand header with Home (logo taps back to Kreu); a TV/Radio toggle rides in
 * the list's `ListHeaderComponent` so it scrolls up with the rows (not pinned),
 * mirroring Home's browse controls. The body is a single FlashList of
 * `GuideRow`s under an overline ("TANI NË TV" / "TANI NË RADIO"). The list does
 * not re-key on mode switch (column count is constant), so the header stays
 * mounted through the toggle. TV rows derive
 * now/next + an elapsed-progress bar per channel from the EPG; radio rows show
 * the station + genre with a live badge (radio now/next has no schedule source
 * yet — gap).
 *
 * EPG data: sourced from the mock fixture directly while the global `/epg`
 * endpoint is not yet available on the backend. Swap back to `useEpgQuery`
 * once the endpoint lands.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { getMockEpg } from '@/api/mocks/fixtures/epg';
import { useChannelsQuery } from '@/api/queries';
import { useDateTime } from '@/hooks/useDateTime';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { BrandHeader } from '@/components/Brand';
import { EmptyChannelsState, EmptyStationsState, ErrorState } from '@/components/empty';
import { GuideRow, GuideRowSkeleton } from '@/components/epg';
import { Icon } from '@/components/Icons';
import { SegmentedToggle } from '@/components/Inputs';
import ReusableText from '@/components/Inputs/ReusableText';
import { ScreenLayout } from '@/components/Layout';
import type { EpgItem } from '@/types/domain';
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
  // Snapshot at mount: now/next selection + progress are a point-in-time view
  // (matches the design's static bars). A periodic tick can refresh it later.
  const [nowMs] = useState(() => Date.now());

  const {
    channels,
    isLoading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels,
  } = useChannelsQuery('TV');

  // TODO: replace with useEpgQuery() once GET /epg is available on the backend.
  const epg = useMemo(() => getMockEpg() as EpgItem[], []);

  const tvRows = useMemo<GuideRowVM[]>(() => {
    const byChannel = new Map<string, EpgItem[]>();
    for (const item of epg) {
      const list = byChannel.get(item.channelId);
      if (list) list.push(item);
      else byChannel.set(item.channelId, [item]);
    }

    return channels.map((channel) => {
      const items = (byChannel.get(channel.id) ?? [])
        .slice()
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
      const nowIdx = items.findIndex(
        (e) => e.isLive ?? (nowMs >= Date.parse(e.startTime) && nowMs < Date.parse(e.endTime)),
      );
      const now = nowIdx >= 0 ? items[nowIdx] : items[0];
      const next = items[(nowIdx >= 0 ? nowIdx : 0) + 1];

      let progress: number | undefined;
      if (now) {
        const start = Date.parse(now.startTime);
        const end = Date.parse(now.endTime);
        progress = end > start ? Math.min(Math.max((nowMs - start) / (end - start), 0), 1) : undefined;
      }

      return {
        id: channel.id,
        logoLabel: channel.name,
        thumbnailUrl: channel.imageUrl,
        nowTitle: now?.title ?? channel.name,
        nextLabel: next
          ? t('guide.next', { time: formatTime(next.startTime), title: next.title })
          : '',
        progress,
        badge: now ? formatTime(now.startTime) : t('guide.live'),
        isRadio: false,
        onPress: () => router.push(`/(app)/channel/${channel.id}`),
      };
    });
  }, [channels, epg, nowMs, formatTime, t]);

  // Radio guide rows pending a dedicated live-programme endpoint.
  const radioRows: GuideRowVM[] = [];

  const isTv = mode === 'tv';
  const rows = isTv ? tvRows : radioRows;
  const rowsLoading = isTv ? channelsLoading : false;
  const rowsError = isTv ? channelsError : null;
  const refetchRows = isTv ? refetchChannels : async () => {};

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
    <ErrorState onRetry={() => void refetchRows()} testID="guide-error" />
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