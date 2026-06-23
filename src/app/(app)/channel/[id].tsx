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
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import {
  useAdQuery,
  useChannelEpgQuery,
  useChannelPlaybackQuery,
  useChannelsQuery,
} from '@/api/queries';
import { useCellularGate } from '@/hooks/useCellularGate';
import { useDateTime } from '@/hooks/useDateTime';
import { useLiveParentalGuard } from '@/hooks/useLiveParentalGuard';
import { useNowProgram } from '@/hooks/useNowProgram';
import { useFullscreenOrientation } from '@/hooks/useOrientation';
import { CatchupBanner, DayStrip } from '@/components/catchup';
import { EmptyEpgState } from '@/components/empty';
import { ProgramRow, ProgramRowSkeleton } from '@/components/epg';
import type { ProgramRowState } from '@/components/epg/ProgramRow';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { CenteredMessage, ScreenLayout, Skeleton } from '@/components/Layout';
import AdOverlay from '@/components/Media/AdOverlay';
import LivePlayer from '@/components/Media/LivePlayer';
import { ParentalPinModal } from '@/components/ParentalPin';
import { availableQualityIds, resolveStreamSource } from '@/utils';
import type { CatchupDay, EpgItem } from '@/types/domain';
import { ChevronLeftIcon, InfoIcon, LockIcon } from '@/assets/icons';
import { DEFAULT_QUALITY } from '@/constants/player';

const CATCHUP_DAYS_BACK = 7;
const CATCHUP_DAYS_FORWARD = 7;

/**
 * Weekday i18n keys by JS `Date.getDay()` (0 = Sunday). The strip reads names
 * from `datetime.day_names.*` rather than `Intl.DateTimeFormat`, because Hermes'
 * bundled ICU lacks Albanian locale data and silently falls back to English —
 * so the whole strip follows the app language, never a partial Intl fallback.
 */
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

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
  const { formatDate, formatTime } = useDateTime();

  // Channel metadata from the cached TV list (name, geoBlocked).
  const { channels } = useChannelsQuery('TV');
  const channelMeta = channels.find((c) => c.id === channelId) ?? null;

  const queryClient = useQueryClient();

  // null = watching live; non-null = watching a recorded programme.
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const isLive = selectedProgramId === null;

  // Single query — branches on programId: live → GET /channels/{id},
  // recorded → GET /channels/{id}/epg/{programId}. Each pair cached independently.
  const { playback: currentPlayback, isLoading: playbackLoading } = useChannelPlaybackQuery(
    channelId,
    selectedProgramId,
  );

  // The player skeleton holds until the first decision lands.
  const mediaPending = playbackLoading && !currentPlayback;

  // Quality: reset to Auto on each channel open so a manual pin from a prior
  // channel doesn't carry over.
  const videoQuality = useAppStore((s) => s.videoQuality);
  const setVideoQuality = useAppStore((s) => s.setVideoQuality);
  const setAvailableQualities = useAppStore((s) => s.setAvailableQualities);

  useEffect(() => {
    setVideoQuality(DEFAULT_QUALITY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Publish the selectable renditions from the current playback's streams map.
  useEffect(() => {
    setAvailableQualities(availableQualityIds(currentPlayback?.streams));
    return () => setAvailableQualities([]);
  }, [currentPlayback, setAvailableQualities]);

  const streamSource = currentPlayback
    ? resolveStreamSource(currentPlayback.streams, videoQuality)
    : '';

  // Fullscreen tracks the device orientation: rotating to landscape enters it,
  // rotating back to portrait exits. The fullscreen button forces the
  // orientation for users who don't want to physically rotate.
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreenOrientation();

  // Channel-change ad — fetch once per channel entry; show before playback.
  const [adDone, setAdDone] = useState(false);
  const numericChannelId = Number(channelId);
  const { creative: channelAd } = useAdQuery(
    { placement: 'CHANNEL_CHANGE', channelId: numericChannelId },
    { enabled: !Number.isNaN(numericChannelId) },
  );

  // Hold the player unmounted while a channel-change ad is showing — the live
  // stream must not start (autoplay + audio + CDN) behind the ad overlay. A
  // skeleton fills the 16:9 slot; the player mounts only once the ad completes.
  const adPending = !!channelAd && !adDone;

  // Geo-blocking is enforced by the CDN on channel open (no list flag); a blocked
  // request surfaces as a player error — logged in VideoPlayer's status listener.

  // isAdult channel-level gate deferred — not present in the list or
  // PlaybackDecision yet. Live programme-level re-check (22.14c) still works.
  const parentalEnabled = useAppStore((s) => s.parentalEnabled);
  const needsPin = false; // TODO: wire when isAdult is available in the API response

  const live = useLiveParentalGuard(channelId, {
    enabled: parentalEnabled,
  });
  const blockPlayer = needsPin || live.isBlocked;
  const liveBlockedDismissed = live.isBlocked && !live.showPrompt;

  // Backend access decision — only ALLOWED plays. Anything else (GEO_BLOCKED,
  // CATCHUP_UNAVAILABLE, NOT_ENTITLED, …) surfaces the server's noticeMessage
  // in place of the player, for both live and recorded playback.
  const decisionBlocked = !!currentPlayback && currentPlayback.decision !== 'ALLOWED';
  const notice = currentPlayback?.noticeMessage?.trim();
  // Fallback when the backend sends no noticeMessage: geo-specific copy for a
  // geo-block, generic otherwise.
  const decisionFallback =
    currentPlayback?.decision === 'GEO_BLOCKED'
      ? t('player.geo_blocked')
      : t('player.unavailable_body');

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
        weekday: isToday
          ? t('datetime.today')
          : t(`datetime.day_names.${WEEKDAY_KEYS[d.getDay()]}`),
        date: formatDate(d.toISOString(), { day: '2-digit', month: '2-digit' }),
        isToday,
        isFuture,
      });
    }
    return out;
  }, [formatDate, t]);

  const [selectedKey, setSelectedKey] = useState(() => days[CATCHUP_DAYS_BACK].key);
  const selectedDay = days.find((d) => d.key === selectedKey) ?? days[CATCHUP_DAYS_BACK];

  const { items: epg, isLoading: epgLoading } = useChannelEpgQuery(channelId, selectedKey);
  const programs = useMemo(
    () => [...epg].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    [epg],
  );

  // Which programme is airing now in this channel's schedule — drives the "now"
  // play-icon row and rolls it to the next programme at the boundary (client
  // timer, no network: the EPG is already in memory). Only TODAY's list has a
  // meaningful "now"; pass [] on other days so nothing is marked.
  const { playing } = useNowProgram(selectedDay.isToday ? programs : []);

  const programState = (p: EpgItem): ProgramRowState => {
    if (selectedDay.isFuture) return 'scheduled';
    if (!selectedDay.isToday) return 'recorded';
    return playing?.id === p.id ? 'now' : 'scheduled';
  };

  const handleSelectProgram = (p: EpgItem, state: ProgramRowState) => {
    if (state === 'now') {
      setSelectedProgramId(null);
      queryClient.invalidateQueries({ queryKey: ['channel-playback', channelId, null] });
      return;
    }
    if (state === 'recorded') {
      setSelectedProgramId(p.id);
    }
  };

  const player =
    mediaPending || adPending ? (
      <Skeleton
        borderRadius={BORDERRADIUS.none}
        style={styles.playerSkeleton}
        testID="player-skeleton"
      />
    ) : decisionBlocked ? (
      <CenteredMessage
        icon={<Icon as={InfoIcon} size={34} color={colors.textMuted} />}
        title={notice || decisionFallback}
        testID="playback-blocked"
      />
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
        channelName={
          isLive
            ? (channelMeta?.name ?? channelId)
            : (programs.find((p) => p.id === selectedProgramId)?.title ??
              channelMeta?.name ??
              channelId)
        }
        isLive={isLive}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenOptions={() => router.push('/(app)/player-options')}
      />
    );

  // Single back button for every player state and orientation: absolutely
  // positioned over the video surface, exits fullscreen in landscape and
  // navigates back in portrait. The player draws no back of its own.
  const handleBack = () => (isFullscreen ? exitFullscreen() : router.back());
  const backButton = (
    <TouchableOpacity
      style={styles.backBtn}
      onPress={handleBack}
      activeOpacity={0.8}
      accessibilityLabel={t('common.back')}
      testID="channel-back-btn"
    >
      <Icon as={ChevronLeftIcon} size={22} color={PLAYER_COLORS.onSurface} />
    </TouchableOpacity>
  );

  if (isFullscreen) {
    // Inset bottom + sides so native captions (drawn at the bottom of the
    // VideoView bounds, no caption-padding API in expo-video) and the back
    // button clear the home indicator / landscape notch. `contain` re-centers
    // the video into the safe area; the inset bars use the black video token.
    return (
      <ScreenLayout edges={['bottom', 'left', 'right']} backgroundColor="videoPlaceholderBg">
        {player}
        {backButton}
      </ScreenLayout>
    );
  }

  const dayLabel = `${selectedDay.weekday} ${selectedDay.date}`;

  return (
    <ScreenLayout edges={['top']}>
      <View style={styles.video}>
        {player}
        {backButton}
      </View>

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

      {channelAd && !adDone ? (
        <AdOverlay creative={channelAd} onComplete={() => setAdDone(true)} testID="channel-ad" />
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: PLAYER_COLORS.surface,
  },
  backBtn: {
    position: 'absolute',
    top: SPACING.space_10,
    left: SPACING.space_10,
    width: 40,
    height: 40,
    borderRadius: BORDERRADIUS.full,
    backgroundColor: PLAYER_COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
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
