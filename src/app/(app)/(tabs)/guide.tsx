/**
 * Guide (Guida) — design screen 7. A "now & next" programme guide. Shares the
 * brand header with Home (logo taps back to Kreu); a TV/Radio toggle sits below
 * it, mirroring Home's browse controls. The body is a single FlashList of
 * `GuideRow`s under an overline ("TANI NË TV" / "TANI NË RADIO"). TV rows derive
 * now/next + an elapsed-progress bar per channel from the EPG; radio rows show
 * the station + genre with a live badge (radio now/next has no schedule source
 * yet — gap).
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery, useEpgQuery, useRadioStationsQuery } from '@/api/queries';
import { useDateTime } from '@/hooks/useDateTime';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { BrandHeader } from '@/components/Brand';
import { GuideRow, GuideRowSkeleton } from '@/components/epg';
import { Icon, IconButton } from '@/components/Icons';
import { SegmentedToggle } from '@/components/Inputs';
import ReusableText from '@/components/Inputs/ReusableText';
import { ScreenLayout } from '@/components/Layout';
import type { EpgItem } from '@/types/domain';
import { ProfileIcon, RadioIcon } from '@/assets/icons';

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

  const { channels, isLoading: channelsLoading } = useChannelsQuery();
  const { stations, isLoading: stationsLoading } = useRadioStationsQuery();
  const { items: epg } = useEpgQuery();

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
        thumbnailUrl: channel.thumbnailUrl,
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

  const radioRows = useMemo<GuideRowVM[]>(
    () =>
      stations.map((station) => ({
        id: station.id,
        logoLabel: station.name,
        thumbnailUrl: station.artworkUrl,
        nowTitle: station.name,
        nextLabel: station.genre,
        badge: t('guide.live'),
        isRadio: true,
        onPress: () => router.push(`/(app)/radio/${station.id}`),
      })),
    [stations, t],
  );

  const rows = mode === 'tv' ? tvRows : radioRows;
  // Rows derive from the channel/station catalogues — EPG arriving later only
  // upgrades the now/next lines, so the skeleton keys on the catalogue queries.
  const rowsLoading = mode === 'tv' ? channelsLoading : stationsLoading;

  const listSkeleton = (
    <View testID="guide-skeleton">
      {Array.from({ length: 8 }, (_, i) => (
        <GuideRowSkeleton key={i} />
      ))}
    </View>
  );

  const overline = (
    <ReusableText variant="bodySmall" fontWeight="extraBold" style={styles.overline}>
      {mode === 'tv' ? t('guide.now_on_tv') : t('guide.now_on_radio')}
    </ReusableText>
  );

  return (
    <ScreenLayout>
      <BrandHeader
        testID="guide-header"
        onLogoPress={() => router.navigate('/(app)/(tabs)')}
        rightSlot={
          <IconButton
            size={40}
            backgroundColor={colors.surface}
            onPress={() => router.push('/(app)/(tabs)/profile')}
            accessibilityLabel="Profili"
            testID="guide-profile-btn"
          >
            <Icon as={ProfileIcon} size={20} color={colors.text} />
          </IconButton>
        }
      />

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

      <View style={styles.listWrap}>
        <FlashList
          key={mode}
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
          ListHeaderComponent={overline}
          ListEmptyComponent={rowsLoading ? listSkeleton : null}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + SPACING.space_24 }]}
          showsVerticalScrollIndicator={false}
          testID="guide-list"
        />
        {/* Rows dissolve into the background as they scroll under the toggle,
            instead of clipping hard at the list edge (RTSH docked-CTA fade). */}
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

export default GuideScreen;

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
});
