/**
 * Channel screen — design `sPlayer`. A portrait layout: an inline 16:9 live
 * player at the top, a 15-day strip (7 days back · today · 7 days forward),
 * then the EPG / catch-up programme list for the selected day. Today shows the
 * live schedule (currently-airing highlighted); past days show recorded
 * programmes under a catch-up banner; future days show the schedule. The
 * backend returns an empty array when no data exists for a date — shown via
 * `EmptyEpgState`. Fullscreen is owned here.
 *
 * Two queries on entry:
 *  1. `useChannelPlaybackQuery` — `GET /channels/{id}` → PlaybackDecision (stream URLs)
 *  2. `useChannelEpgQuery`      — `GET /channels/{id}/epg?date=today` → EPG list
 *
 * Channel metadata (name, geoBlocked) is read from the already-cached TV list.
 * Tapping a past EPG item swaps `activePlayback` to that item's embedded streams
 * so the player replays the recording without an extra network request.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

import { BORDERRADIUS } from '@/theme/borders';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelEpgQuery, useChannelPlaybackQuery, useChannelsQuery } from '@/api/queries';
import { useCellularGate } from '@/hooks/useCellularGate';
import { useDateTime } from '@/hooks/useDateTime';
import { useLiveParentalGuard } from '@/hooks/useLiveParentalGuard';
import { CatchupBanner, DayStrip } from '@/components/catchup';
import { EmptyEpgState } from '@/components/empty';
import { ProgramRow, ProgramRowSkeleton } from '@/components/epg';
import type { ProgramRowState } from '@/components/epg/ProgramRow';
import { Icon, IconButton } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { CenteredMessage, ScreenLayout, Skeleton, TabHeader } from '@/components/Layout';
import LivePlayer from '@/components/Media/LivePlayer';
import { ParentalPinModal } from '@/components/ParentalPin';
import { availableQualityIds, resolveStreamSource } from '@/utils';
import type { CatchupDay, EpgItem, PlaybackDecision } from '@/types/domain';
import { ChevronLeftIcon, GlobeIcon, LockIcon } from '@/assets/icons';
import { DEFAULT_QUALITY } from '@/constants/player';

const CATCHUP_DAYS_BACK = 7;
const CATCHUP_DAYS_FORWARD = 7;

/** Local `YYYY-MM-DD` (matches the EPG mock's date keys). */
function toDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const ChannelScreen: React.FC = () => {
  useCellularGate();
  const { id } = useLocalSearchParams<{ id: string }>();
  const channelId = id ?? '';
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const { formatWeekday, formatDate, formatTime } = useDateTime();

  // Channel metadata from the cached TV list (name, geoBlocked).
  const { channels } = useChannelsQuery('TV');
  const channelMeta = channels.find((c) => c.id === channelId) ?? null;

  // Playback decision — stream URLs for this channel.
  const { playback, isLoading: playbackLoading } = useChannelPlaybackQuery(channelId);

  // The player skeleton holds until the playback decision lands — we need streams
  // before mounting the player.
  const mediaPending = playbackLoading;

  // Active playback — starts as the live channel decision, swapped to an EPG
  // item's embedded streams when the user taps a recorded programme.
  const [activePlayback, setActivePlayback] = useState<PlaybackDecision | null>(null);

  useEffect(() => {
    if (playback) setActivePlayback(playback);
  }, [playback]);

  // Quality: reset to Auto on each channel open so a manual pin from a prior
  // channel doesn't carry over.
  const videoQuality = useAppStore((s) => s.videoQuality);
  const setVideoQuality = useAppStore((s) => s.setVideoQuality);
  const setAvailableQualities = useAppStore((s) => s.setAvailableQualities);

  useEffect(() => {
    setVideoQuality(DEFAULT_QUALITY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Publish the selectable renditions from the active playback's streams map.
  useEffect(() => {
    setAvailableQualities(availableQualityIds(activePlayback?.streams));
    return () => setAvailableQualities([]);
  }, [activePlayback, setAvailableQualities]);

  const streamSource = activePlayback
    ? resolveStreamSource(activePlayback.streams, videoQuality)
    : '';

  const [nowMs] = useState(() => Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Geo-blocking comes from the channel list flag (CDN geo is plan 15.2).
  const geoBlocked = !!channelMeta?.geoBlocked;

  // isAdult channel-level gate deferred — not present in the list or
  // PlaybackDecision yet. Live programme-level re-check (22.14c) still works.
  const parentalEnabled = useAppStore((s) => s.parentalEnabled);
  const needsPin = false; // TODO: wire when isAdult is available in the API response

  const live = useLiveParentalGuard(channelId, {
    enabled: parentalEnabled && !geoBlocked,
  });
  const blockPlayer = needsPin || live.isBlocked;
  const liveBlockedDismissed = live.isBlocked && !live.showPrompt;

  // Day strip — past (7) · today · future (7), oldest left.
  const days = useMemo<CatchupDay[]>(() => {
    const out: CatchupDay[] = [];
    const today = new Date();
    for (let offset = -CATCHUP_DAYS_BACK; offset <= CATCHUP_DAYS_FORWARD; offset++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 12);
      const isToday = offset === 0;
      const isFuture = offset > 0;
      out.push({
        key: toDateKey(d),
        weekday: isToday ? t('datetime.today') : formatWeekday(d.toISOString(), 'short'),
        date: formatDate(d.toISOString(), { day: '2-digit', month: '2-digit' }),
        isToday,
        isFuture,
      });
    }
    return out;
  }, [formatWeekday, formatDate, t]);

  const [selectedKey, setSelectedKey] = useState(() => days[CATCHUP_DAYS_BACK].key);
  const selectedDay = days.find((d) => d.key === selectedKey) ?? days[CATCHUP_DAYS_BACK];

  const { items: epg, isLoading: epgLoading } = useChannelEpgQuery(channelId, selectedKey);
  const programs = useMemo(
    () => [...epg].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    [epg],
  );

  // Lock landscape while fullscreen; release on exit/unmount.
  useEffect(() => {
    if (isFullscreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    } else {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [isFullscreen]);

  const programState = (p: EpgItem): ProgramRowState => {
    if (selectedDay.isFuture) return 'scheduled';
    if (!selectedDay.isToday) return 'recorded';
    const airing = p.isLive ?? (nowMs >= Date.parse(p.startTime) && nowMs < Date.parse(p.endTime));
    return airing ? 'now' : 'scheduled';
  };

  const handleSelectProgram = (p: EpgItem, state: ProgramRowState) => {
    if (state === 'recorded') {
      setActivePlayback({
        decision: p.decision,
        channelId: p.channelId,
        programId: p.programId,
        noticeMessage: p.noticeMessage,
        streams: p.streams,
      });
    }
  };

  // Geo-restricted — block the channel inline (design `sGeo`).
  if (geoBlocked) {
    return (
      <ScreenLayout edges={['top', 'bottom']}>
        <TabHeader
          title=""
          showBottomBorder={false}
          leftAction={
            <IconButton onPress={() => router.back()} testID="geo-back">
              <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
            </IconButton>
          }
        />
        <CenteredMessage
          icon={<Icon as={GlobeIcon} size={36} color={colors.textMuted} />}
          title={t('geo.title')}
          body={t('geo.body')}
          actionLabel={t('geo.back_home')}
          onAction={() => router.back()}
          testID="geo-message"
        />
      </ScreenLayout>
    );
  }

  const player = mediaPending ? (
    <Skeleton borderRadius={BORDERRADIUS.none} style={styles.playerSkeleton} testID="player-skeleton" />
  ) : blockPlayer ? (
    liveBlockedDismissed ? (
      <CenteredMessage
        icon={<Icon as={LockIcon} size={34} color={colors.textMuted} />}
        title={t('parental.title')}
        body={t('parental.live_blocked')}
        actionLabel={t('parental.unlock')}
        onAction={live.requestUnlock}
        testID="live-parental-blocked"
      />
    ) : (
      <View style={styles.blocked} />
    )
  ) : (
    <LivePlayer
      channelId={channelId}
      streamUrl={streamSource}
      channelName={channelMeta?.name ?? channelId}
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((f) => !f)}
      onOpenOptions={() => router.push('/(app)/player-options')}
      onClose={() => (isFullscreen ? setIsFullscreen(false) : router.back())}
    />
  );

  if (isFullscreen) {
    return <View style={styles.fullscreen}>{player}</View>;
  }

  const dayLabel = `${selectedDay.weekday} ${selectedDay.date}`;

  return (
    <ScreenLayout edges={['top']}>
      <View style={styles.video}>{player}</View>

      <DayStrip
        days={days}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        testID="player-daystrip"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!selectedDay.isToday && !selectedDay.isFuture ? (
          <CatchupBanner label={t('catchup.banner', { day: dayLabel })} testID="catchup-banner" />
        ) : null}

        <ReusableText variant="bodySmall" fontWeight="extraBold" style={styles.epgHeader}>
          {selectedDay.isToday ? t('catchup.epg') : t('catchup.catchup_for', { day: dayLabel })}
        </ReusableText>

        {epgLoading ? (
          Array.from({ length: 6 }, (_, i) => <ProgramRowSkeleton key={i} />)
        ) : programs.length === 0 ? (
          <EmptyEpgState testID="epg-empty" />
        ) : (
          programs.map((p) => {
            const state = programState(p);
            return (
              <ProgramRow
                key={p.id}
                title={p.title}
                meta={p.description}
                time={formatTime(p.startTime)}
                state={state}
                onPress={() => handleSelectProgram(p, state)}
                testID={`epg-row-${p.id}`}
              />
            );
          })
        )}
      </ScrollView>

      <ParentalPinModal
        visible={needsPin || live.showPrompt}
        mode="verify"
        onSuccess={live.onVerified}
        onDismiss={live.onDismiss}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: PLAYER_COLORS.surface,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: PLAYER_COLORS.surface,
  },
  blocked: {
    flex: 1,
  },
  playerSkeleton: {
    flex: 1,
  },
  scroll: {
    paddingBottom: SPACING.space_24,
  },
  epgHeader: {
    letterSpacing: 0.6,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_16,
    paddingBottom: SPACING.space_4,
  },
});

export default ChannelScreen;