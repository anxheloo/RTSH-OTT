/**
 * Guide (Guida) — design screen 7. A "now & next" programme guide. The header
 * carries a TV/Radio toggle; the body is a single FlashList of `GuideRow`s under
 * an overline ("TANI NË TV" / "TANI NË RADIO"). TV rows derive now/next + an
 * elapsed-progress bar per channel from the EPG; radio rows show the station +
 * genre with a live badge (radio now/next has no schedule source yet — gap).
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery, useEpgQuery, useRadioStationsQuery } from '@/api/queries';
import { useDateTime } from '@/hooks/useDateTime';
import { GuideRow } from '@/components/epg';
import { Icon } from '@/components/Icons';
import { SegmentedToggle } from '@/components/Inputs';
import ReusableText from '@/components/Inputs/ReusableText';
import { ScreenLayout, TabHeader } from '@/components/Layout';
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
  const [mode, setMode] = useState<GuideMode>('tv');
  // Snapshot at mount: now/next selection + progress are a point-in-time view
  // (matches the design's static bars). A periodic tick can refresh it later.
  const [nowMs] = useState(() => Date.now());

  const { channels } = useChannelsQuery();
  const { stations } = useRadioStationsQuery();
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
        // TODO(anx 2026-06-08): route to radio/[id] player once it lands (22.11).
        onPress: () => router.push('/(app)/radio'),
      })),
    [stations, t],
  );

  const rows = mode === 'tv' ? tvRows : radioRows;

  const overline = (
    <ReusableText variant="bodySmall" fontWeight="extraBold" style={styles.overline}>
      {mode === 'tv' ? t('guide.now_on_tv') : t('guide.now_on_radio')}
    </ReusableText>
  );

  return (
    <ScreenLayout>
      <TabHeader
        title={t('guide.title')}
        rightAction={
          <SegmentedToggle
            options={[
              { label: t('guide.toggle_tv'), value: 'tv' },
              { label: t('guide.toggle_radio'), value: 'radio' },
            ]}
            value={mode}
            onChange={setMode}
            testID="guide-mode-toggle"
          />
        }
      />

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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="guide-list"
      />
    </ScreenLayout>
  );
};

export default GuideScreen;

const styles = StyleSheet.create({
  overline: {
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.space_18,
    paddingTop: SPACING.space_8,
    paddingBottom: SPACING.space_4,
  },
  listContent: {
    paddingBottom: SPACING.space_24,
  },
});
