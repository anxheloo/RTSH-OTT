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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { PLAYER_COLORS } from '@/theme/playerColors';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import {
  useAdsQuery,
  useChannelEpgQuery,
  useChannelPlaybackQuery,
  useChannelsQuery,
} from '@/api/queries';
import { reportAdImpression } from '@/api/services/ads';
import { useCellularGate } from '@/hooks/useCellularGate';
import { useChannelRealtime } from '@/hooks/useChannelRealtime';
import { useDateTime } from '@/hooks/useDateTime';
import { useNowProgram } from '@/hooks/useNowProgram';
import { useFullscreenOrientation } from '@/hooks/useOrientation';
import { useParentalGuard } from '@/hooks/useParentalGuard';
import { useToday } from '@/hooks/useToday';
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
import { availableQualityIds, getStreamHeaders, resolveStreamSource } from '@/utils';
import { toDateKey } from '@/utils/datetime';
import type { CatchupDay, EpgItem } from '@/types/domain';
// Analytics disabled for now — re-enable when telemetry is wanted.
// import { AnalyticsEvent, track, useWatchTracking } from '@/analytics';
import { ChevronLeftIcon, InfoIcon, LockIcon } from '@/assets/icons';
import { DEFAULT_QUALITY } from '@/constants/player';
import { useContentWidth } from '@/responsive';

const CATCHUP_DAYS_BACK = 7;
const CATCHUP_DAYS_FORWARD = 7;

/**
 * Weekday i18n keys by JS `Date.getDay()` (0 = Sunday). The strip reads names
 * from `datetime.day_names.*` rather than `Intl.DateTimeFormat`, because Hermes'
 * bundled ICU lacks Albanian locale data and silently falls back to English —
 * so the whole strip follows the app language, never a partial Intl fallback.
 */
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

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

  // Analytics: emit channel_watch_start/end (re-pairs when live↔recorded flips).
  // useWatchTracking(channelId, isLive ? 'live' : 'recorded');

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

  // Entering a channel takes over audio — stop any playing radio so the two
  // streams can't overlap. Also removes the docked mini-player (no station active).
  const clearRadio = useAppStore((s) => s.clearRadio);
  useEffect(() => {
    clearRadio();
  }, [clearRadio]);

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

  // Tablet/TV: cap the inline player + EPG to a centered column so they don't
  // stretch edge-to-edge. No-op on phone, and not applied in fullscreen (the
  // video goes full-bleed). Applied as a conditional STYLE on the same View
  // nodes — never a new tree branch — so rotation doesn't remount the player.
  const contentWidth = useContentWidth('player');

  // Merged ads — ONE call returns the CHANNEL_CHANGE preroll + all MID_ROLLs for
  // this channel (Ads = Option A). Preroll shows before playback; midrolls seed
  // the realtime scheduler.
  const [adDone, setAdDone] = useState(false);
  const numericChannelId = Number(channelId);
  const { ads } = useAdsQuery(numericChannelId, { enabled: !Number.isNaN(numericChannelId) });
  const channelAd = ads.find((a) => a.placement === 'CHANNEL_CHANGE') ?? null;
  const seedMidrolls = useMemo(() => ads.filter((a) => a.placement === 'MID_ROLL'), [ads]);

  // Realtime: subscribe (mid-roll events + in-channel presence + geo queue), emit
  // watch segments, run the mid-roll scheduler. Geo (Option B) surfaces as a notice.
  const { dueAd: midrollAd, onAdComplete: onMidrollComplete, geoNotice } = useChannelRealtime(
    numericChannelId,
    selectedProgramId ? Number(selectedProgramId) : null,
    isLive ? 'LIVE' : 'RECORDED',
    seedMidrolls,
  );

  // Hold the player unmounted while a channel-change ad is showing — the live
  // stream must not start (autoplay + audio + CDN) behind the ad overlay. A
  // skeleton fills the 16:9 slot; the player mounts only once the ad completes.
  const adPending = !!channelAd && !adDone;

  // Geo-blocking is enforced by the CDN on channel open (no list flag); a blocked
  // request surfaces as a player error — logged in VideoPlayer's status listener.

  // Parental gate — keys off each EPG row's `isAdult` (the PlaybackDecision
  // carries no adult flag). Live: time-matched now-airing re-check (22.14c).
  // Recorded: gated at tap via `guard.guardPlay`. Channel-level gate stays off
  // (no `isAdult` on the channel list / PlaybackDecision) — per-program covers it.
  const parentalEnabled = useAppStore((s) => s.parentalEnabled);
  const guard = useParentalGuard(channelId, { isLive, enabled: parentalEnabled });
  const blockPlayer = guard.isBlocked;

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

  // Unified block: a live GEO_BLOCK push (Geo = Option B) is treated exactly like
  // a decision-block — stop playback + show the notice. `geoNotice` ('' when the
  // backend sent no copy → fall back to the geo string) takes precedence; GEO_LIFT
  // clears it. `showBlocked` replaces `decisionBlocked` at the render sites below.
  const blockedNotice =
    geoNotice != null
      ? geoNotice || t('player.geo_blocked')
      : decisionBlocked
        ? notice || decisionFallback
        : null;
  const showBlocked = blockedNotice !== null;

  // Current local calendar day, kept correct across midnight (foreground +
  // next-midnight timer). Anchoring the strip on this — not a mount-time
  // `new Date()` — is what stops the lineup/highlight/chip pinning to yesterday
  // after the app sits backgrounded past midnight.
  const todayKey = useToday();

  // Day strip — past (7) · today · future (7), oldest left.
  const days = useMemo<CatchupDay[]>(() => {
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const out: CatchupDay[] = [];
    for (let offset = -CATCHUP_DAYS_BACK; offset <= CATCHUP_DAYS_FORWARD; offset++) {
      const d = new Date(ty, tm - 1, td + offset, 12);
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
  }, [todayKey, formatDate, t]);

  const [selectedKey, setSelectedKey] = useState(todayKey);

  // Roll the selection forward with the calendar day — but only when the user is
  // parked on "today"; a deliberately-chosen past/future day stays put (the chip
  // just relabels as the strip shifts). React's adjust-state-during-render
  // pattern (no effect, no extra commit): `dayAnchor` holds the day we last
  // reconciled against.
  const [dayAnchor, setDayAnchor] = useState(todayKey);
  if (todayKey !== dayAnchor) {
    if (selectedKey === dayAnchor) setSelectedKey(todayKey);
    setDayAnchor(todayKey);
  }

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
  const { playing, nowMs } = useNowProgram(selectedDay.isToday ? programs : []);

  // Row state keys off the programme's own clock, not just the selected day, so a
  // programme that has *finished today* reads the same as one from a past day —
  // a playable catch-up row (play glyph, pressable). A finished programme with no
  // recording (`hasCatchup === false`) and any not-yet-started programme both
  // read as `scheduled` (pale, non-pressable).
  const programState = (p: EpgItem): ProgramRowState => {
    if (selectedDay.isToday && playing?.id === p.id) return 'now';
    if (Date.parse(p.startTime) > nowMs) return 'scheduled'; // not started yet
    return p.hasCatchup === false ? 'scheduled' : 'recorded'; // finished
  };

  const handleSelectProgram = (p: EpgItem, state: ProgramRowState) => {
    if (state === 'now') {
      setSelectedProgramId(null);
      queryClient.invalidateQueries({ queryKey: ['channel-playback', channelId, null] });
      return;
    }
    if (state === 'recorded') {
      // Gate adult recordings before the swap so the signed stream URL is never
      // fetched pre-PIN; clean items play immediately.
      guard.guardPlay(p, () => setSelectedProgramId(p.id));
    }
  };

  // Auto-center the active programme — the list animates so whatever is on the
  // player (the recorded selection, or live's now-airing programme) sits in the
  // middle of the EPG. Offsets come from each row's onLayout.
  //
  // First entry is a deferred one-shot: instead of scrolling mid-mount (which
  // competes with the player + day-strip + rows all laying out and reads as an
  // abrupt jump), we wait until the active row is measured, then defer one frame
  // (`requestAnimationFrame`) so the layout pass has committed and glide once —
  // the user watches a deliberate settle-then-scroll. Later changes (boundary
  // roll-over, recorded selection) re-center immediately via the effect / row
  // relayout.
  const activeProgramId = selectedProgramId ?? playing?.id ?? null;
  const scrollRef = useRef<ScrollView>(null);
  const rowOffsetsRef = useRef<Record<string, { y: number; height: number }>>({});
  const viewportHeightRef = useRef(0);
  const didInitialCenterRef = useRef(false);

  const centerOnProgram = useCallback((pid: string) => {
    const row = rowOffsetsRef.current[pid];
    const viewport = viewportHeightRef.current;
    if (!row || !viewport) return;
    const y = Math.max(0, row.y - viewport / 2 + row.height / 2);
    scrollRef.current?.scrollTo({ y, animated: true });
  }, []);

  const handleRowLayout = (pid: string, e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    rowOffsetsRef.current[pid] = { y, height };
    if (pid !== activeProgramId) return;
    if (didInitialCenterRef.current) {
      // Post-intro: keep the active row centred if it re-lays out.
      centerOnProgram(pid);
    } else {
      // First entry: don't scroll mid-mount. Now that the active row is
      // measured, defer one frame so the layout pass has committed, then glide
      // once — a deliberate settle-then-scroll instead of an abrupt jump.
      didInitialCenterRef.current = true;
      requestAnimationFrame(() => centerOnProgram(pid));
    }
  };

  const handleScrollLayout = (e: LayoutChangeEvent) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
  };

  useEffect(() => {
    if (activeProgramId) centerOnProgram(activeProgramId);
  }, [activeProgramId, centerOnProgram]);

  // Drop stale offsets when the day (hence the list) changes, so we never scroll
  // to a previous day's measurement before the new rows lay out.
  useEffect(() => {
    rowOffsetsRef.current = {};
  }, [selectedKey]);

  // Pull-to-refresh — invalidate every query this screen reads (prefix-matched,
  // so all cached days / both live + recorded playback entries refetch): the EPG
  // schedule, the playback decision (re-signs the stream URL — a brief rebuffer
  // is accepted), the cached TV list (channel name), and the channel-change ad.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['channel-epg', channelId] }),
      queryClient.invalidateQueries({ queryKey: ['channel-playback', channelId] }),
      queryClient.invalidateQueries({ queryKey: ['channels', 'TV'] }),
      queryClient.invalidateQueries({ queryKey: ['ads', numericChannelId] }),
    ]);
    setRefreshing(false);
  }, [queryClient, channelId, numericChannelId]);

  const player =
    mediaPending || adPending ? (
      <Skeleton
        borderRadius={BORDERRADIUS.none}
        style={styles.playerSkeleton}
        testID="player-skeleton"
      />
    ) : showBlocked ? (
      <CenteredMessage
        icon={<Icon as={InfoIcon} size={34} color={colors.textMuted} />}
        title={blockedNotice ?? decisionFallback}
        testID="playback-blocked"
      />
    ) : blockPlayer ? (
      guard.blockedDismissed ? (
        <CenteredMessage
          icon={<Icon as={LockIcon} size={34} color={colors.textMuted} />}
          title={t('parental.title')}
          body={t('parental.live_blocked')}
          actionLabel={t('parental.unlock')}
          onAction={guard.requestUnlock}
          testID="live-parental-blocked"
        />
      ) : (
        <View style={styles.blocked} />
      )
    ) : (
      <LivePlayer
        channelId={channelId}
        streamUrl={streamSource}
        streamHeaders={getStreamHeaders()}
        channelName={
          isLive
            ? (channelMeta?.name ?? channelId)
            : (programs.find((p) => p.id === selectedProgramId)?.title ??
              channelMeta?.name ??
              channelId)
        }
        isLive={isLive}
        // Analytics disabled for now — re-enable when telemetry is wanted.
        // onError={(errorType) => track(AnalyticsEvent.STREAM_ERROR, { channelId, errorType })}
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

  const dayLabel = `${selectedDay.weekday} ${selectedDay.date}`;

  // Single render tree across orientations: the player wrapper stays at the same
  // tree position whether fullscreen or inline, so rotation only restyles its
  // container — the LivePlayer (native VideoView) never unmounts, so playback
  // doesn't reload (the prior two-branch return remounted it on every rotate).
  // Fullscreen insets bottom + sides so native captions (drawn at the bottom of
  // the VideoView bounds, no caption-padding API in expo-video) and the back
  // button clear the home indicator / landscape notch; `contain` re-centers the
  // video into the safe area, the inset bars use the black video token.
  return (
    <ScreenLayout
      edges={isFullscreen ? ['bottom', 'left', 'right'] : ['top']}
      backgroundColor={isFullscreen ? 'videoPlaceholderBg' : 'background'}
    >
      <View style={isFullscreen ? styles.videoFull : [styles.video, contentWidth]}>
        {player}
        {backButton}
      </View>

      {!isFullscreen && (
        <>
          <View style={contentWidth}>
            <DayStrip
              days={days}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              testID="player-daystrip"
            />
          </View>

          <ScrollView
            ref={scrollRef}
            onLayout={handleScrollLayout}
            contentContainerStyle={[styles.scroll, contentWidth]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {!selectedDay.isToday && !selectedDay.isFuture ? (
              <CatchupBanner
                label={t('catchup.banner', { day: dayLabel })}
                testID="catchup-banner"
              />
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
                  <View key={p.id} onLayout={(e) => handleRowLayout(p.id, e)}>
                    <ProgramRow
                      title={p.title}
                      meta={p.description}
                      time={formatTime(p.startTime)}
                      state={state}
                      isPlaying={p.id === activeProgramId}
                      isLiveNow={selectedDay.isToday && playing?.id === p.id}
                      onPress={() => handleSelectProgram(p, state)}
                      testID={`epg-row-${p.id}`}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      <ParentalPinModal
        visible={guard.promptVisible}
        mode="verify"
        onSuccess={guard.onVerified}
        onDismiss={guard.onDismiss}
      />

      {/* Hold the ad until today's EPG has settled so it never pops over a
          loading list. The ad fetches up-front, so `adPending` keeps the player
          unmounted the whole time (no autoplay leak behind the overlay). */}
      {channelAd && !adDone && !epgLoading ? (
        <AdOverlay
          creative={channelAd}
          onComplete={() => setAdDone(true)}
          onShown={() =>
            reportAdImpression(channelAd.id, {
              channelId: numericChannelId,
              placement: 'CHANNEL_CHANGE',
            })
          }
          testID="channel-ad"
        />
      ) : null}

      {/* Mid-roll — fires during playback at its scheduled time. Never over a
          skeleton, the preroll, or a blocked player. */}
      {midrollAd && !adPending && !mediaPending && !blockPlayer && !showBlocked ? (
        <AdOverlay
          creative={midrollAd}
          onComplete={onMidrollComplete}
          onShown={() =>
            reportAdImpression(midrollAd.id, {
              channelId: numericChannelId,
              placement: 'MID_ROLL',
            })
          }
          testID="channel-midroll"
        />
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
  videoFull: {
    flex: 1,
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
