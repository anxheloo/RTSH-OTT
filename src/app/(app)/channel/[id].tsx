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
  BackHandler,
  FlatList,
  type LayoutChangeEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { useAdSlot } from '@/hooks/useAdSlot';
import { useCellularGate } from '@/hooks/useCellularGate';
import { useChannelRealtime } from '@/hooks/useChannelRealtime';
import { useDateTime } from '@/hooks/useDateTime';
import { useDelayedReveal } from '@/hooks/useDelayedReveal';
import { useLiveProgramBlock } from '@/hooks/useLiveProgramBlock';
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
import { formatDayMonth, toDateKey } from '@/utils/datetime';
import type { CatchupDay, EpgItem } from '@/types/domain';
import { ChevronLeftIcon, CloseIcon, GuideIcon, InfoIcon, LockIcon } from '@/assets/icons';
import { AD_REVEAL_DELAY_MS } from '@/constants/ads';
import { DEFAULT_QUALITY } from '@/constants/player';
import { useContentWidth } from '@/responsive';
import { isTV, tvFocusHighlight, TVFocusZone, useTVFocus } from '@/tv';

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
  const { formatTime } = useDateTime();
  const insets = useSafeAreaInsets();

  // Channel metadata from the cached TV list (name, geoBlocked).
  const { channels } = useChannelsQuery('TV');
  const channelMeta = channels.find((c) => c.id === channelId) ?? null;

  const queryClient = useQueryClient();

  // null = watching live; non-null = watching a recorded programme.
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const isLive = selectedProgramId === null;

  // The recorded programme's title, captured at selection. Kept in state (not derived
  // from the reactive `programs` list) so that browsing another day mid-playback —
  // which swaps `programs` to a list that no longer contains the playing recording —
  // can't flip the player/now-playing label back to the channel name.
  const [selectedProgramTitle, setSelectedProgramTitle] = useState<string | null>(null);

  // Analytics is DISABLED pending backend ingestion — when re-enabled, watch
  // tracking + the LivePlayer onError → stream_error beacon mount here (see
  // ARCHITECTURE.md → Analytics & telemetry).

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

  // Fullscreen is button-driven only: the expand control locks the device to
  // landscape, collapse restores portrait. The app is otherwise portrait-only —
  // physically rotating the phone does nothing (no sensor auto-rotation).
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreenOrientation();

  // TV/STB only: the player stays full-screen and the guide (day strip +
  // programme list) lives in a slide-in drawer opened from a header button.
  // Mobile ignores this — it keeps the inline player with the guide stacked
  // below (the `!isTV` branch of the render). Closed by the header button, the
  // drawer's close button, selecting a programme, or the remote Back key.
  const [guideOpen, setGuideOpen] = useState(false);
  const hamburgerFocus = useTVFocus();
  const drawerCloseFocus = useTVFocus();

  // Remote Back closes the drawer first (instead of leaving the screen). Only
  // armed on TV while the drawer is open.
  useEffect(() => {
    if (!isTV || !guideOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setGuideOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [guideOpen]);

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

  // Live per-programme access gate — the decision sibling of the parental live
  // gate. Keys off the now-airing programme's `decision` flag (the same field the
  // `/epg/{programId}` endpoint returns, country-evaluated by the backend, kept
  // current by the EPG refetch + per-programme GEO_BLOCK/GEO_LIFT socket events).
  // Watches today's schedule independently, so it holds even while the user
  // browses a past day with live still playing. Whole-channel geo still arrives
  // via the decision (`GEO_BLOCKED`) + the channel-scoped `geoNotice`.
  const liveBlock = useLiveProgramBlock(channelId, { isLive });

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

  // Unified block — stop playback + show a notice, in priority order:
  //   1. live per-programme block (now-airing programme's `decision` !== ALLOWED),
  //   2. a whole-channel GEO_BLOCK push (`geoNotice`, '' when no copy sent),
  //   3. a non-ALLOWED playback decision (live or recorded).
  // All collapse to geo/decision copy; `showBlocked` replaces `decisionBlocked`
  // at the render sites below.
  const blockedNotice = liveBlock.blocked
    ? liveBlock.notice || t('player.geo_blocked')
    : geoNotice != null
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
        date: formatDayMonth(d),
        isToday,
        isFuture,
      });
    }
    return out;
  }, [todayKey, t]);

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

  // Ease the preroll in a couple seconds after the channel screen has settled
  // (EPG loaded), rather than snapping it up the instant the ad is fetched. The
  // player stays unmounted the whole time via `adPending`, so the skeleton
  // holds the slot during the delay — no autoplay leak behind the overlay.
  const showChannelAd = useDelayedReveal(
    !!channelAd && !adDone && !epgLoading,
    AD_REVEAL_DELAY_MS,
  );
  // One ad on screen at a time, app-wide (mirrors `ModalSlice`) — guards the
  // screen-transition window where this preroll and the app-open overlay
  // (mounted above the router, outside this screen's lifetime) could both be
  // mounted for a frame.
  const canShowChannelAd = useAdSlot(
    !!channelAd && !adDone && !epgLoading && showChannelAd,
    channelAd?.id,
  );
  const canShowMidrollAd = useAdSlot(
    !!midrollAd && !adPending && !mediaPending && !blockPlayer && !showBlocked,
    midrollAd?.id,
  );

  // A mid-roll fires DURING playback, so (unlike the preroll) the player is
  // already mounted — pause it for the break instead of unmounting, and gate PiP
  // entry off so the live surface can't keep playing behind the (JS-overlay) ad.
  // Keyed to `canShowMidrollAd` (NOT the raw due ad): a mid-roll that is due but
  // suppressed — ad slot held by another placement, or a block/skeleton up —
  // must not freeze the picture with no visible ad. Live resumes at the live edge
  // (handled in VideoPlayer); recorded resumes in place.
  const adActive = canShowMidrollAd;

  // Which programme is airing now in this channel's schedule — drives the "now"
  // play-icon row and rolls it to the next programme at the boundary (client
  // timer, no network: the EPG is already in memory). Only TODAY's list has a
  // meaningful "now"; pass [] on other days so nothing is marked.
  const { playing, nowMs } = useNowProgram(selectedDay.isToday ? programs : []);

  // Row state keys off the programme's own clock, not just the selected day, so a
  // programme that has *finished today* reads the same as one from a past day —
  // a playable catch-up row (play glyph, pressable). Only a not-yet-started
  // programme reads as `scheduled` (pale, non-pressable): a finished programme
  // must never look like a future one, so every past row is `recorded`
  // regardless of `hasCatchup` (a finished slot the user could have watched is
  // offered as catch-up, not greyed out like an upcoming one).
  const programState = (p: EpgItem): ProgramRowState => {
    if (selectedDay.isToday && playing?.id === p.id) return 'now';
    if (Date.parse(p.startTime) > nowMs) return 'scheduled'; // not started yet
    return 'recorded'; // finished → catch-up playable
  };

  const handleSelectProgram = (p: EpgItem, state: ProgramRowState) => {
    // TV: picking a programme dismisses the guide drawer back to the full-screen
    // player (no-op on mobile, where the guide isn't a drawer).
    if (isTV) setGuideOpen(false);
    if (state === 'now') {
      setSelectedProgramId(null);
      setSelectedProgramTitle(null);
      queryClient.invalidateQueries({ queryKey: ['channel-playback', channelId, null] });
      return;
    }
    if (state === 'recorded') {
      // Gate adult recordings before the swap so the signed stream URL is never
      // fetched pre-PIN; clean items play immediately.
      guard.guardPlay(p, () => {
        setSelectedProgramId(p.id);
        setSelectedProgramTitle(p.title);
      });
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
            : (selectedProgramTitle ?? channelMeta?.name ?? channelId)
        }
        isLive={isLive}
        paused={adActive}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenOptions={() => router.push('/(app)/player-options')}
      />
    );

  // Single back button for every player state and orientation: absolutely
  // positioned over the video surface, exits fullscreen in landscape and
  // navigates back in portrait. The player draws no back of its own.
  const handleBack = () => (isFullscreen ? exitFullscreen() : router.back());
  const backFocus = useTVFocus();
  const backButton = (
    <TouchableOpacity
      {...backFocus.focusProps}
      style={[styles.backBtn, tvFocusHighlight(colors.focus, backFocus.focused)]}
      onPress={handleBack}
      activeOpacity={0.8}
      accessibilityRole="button"
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
  //
  // Portrait (non-fullscreen): the screen is presented as an iOS `fullScreenModal`,
  // where `SafeAreaView`'s `edges` prop does NOT reliably apply the top inset — so
  // the full-bleed video sat under the notch and the overlaid back button was
  // clipped + unclickable. We own the top inset explicitly via `useSafeAreaInsets`
  // (`marginTop: insets.top` on the video box, outside its aspect-ratio frame),
  // which DOES report correctly inside these modals; the absolutely-positioned
  // back button rides down with the box and clears the notch.
  // TV: a header button (hamburger) that slides the guide drawer in. Sits
  // top-right over the full-screen video, opposite the back button. TV-only —
  // never rendered on mobile (the guide is stacked below the inline player).
  const guideButton = (
    <TouchableOpacity
      {...hamburgerFocus.focusProps}
      style={[styles.guideBtn, tvFocusHighlight(colors.focus, hamburgerFocus.focused)]}
      onPress={() => setGuideOpen(true)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t('catchup.epg')}
      testID="channel-guide-btn"
    >
      <Icon as={GuideIcon} size={22} color={PLAYER_COLORS.onSurface} />
    </TouchableOpacity>
  );

  // Video box. On TV the player is always full-screen (the guide is a drawer, not
  // a stacked column); on mobile it's the width-capped inline box (fullscreen
  // wins first). Same element in every branch → mobile's single-tree rotation
  // invariant is preserved (mobile is always the else path).
  const videoBoxStyle =
    isTV || isFullscreen ? styles.videoFull : [styles.video, contentWidth, { marginTop: insets.top }];
  const videoBox = (
    <View style={videoBoxStyle}>
      {player}
      {backButton}
      {isTV ? guideButton : null}
    </View>
  );

  const dayStripEl = (
    <View style={isTV ? undefined : contentWidth}>
      <DayStrip
        days={days}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        testID="player-daystrip"
      />
    </View>
  );

  const programList = (
    <ScrollView
      ref={scrollRef}
      onLayout={handleScrollLayout}
      contentContainerStyle={[styles.scroll, isTV ? undefined : contentWidth]}
      showsVerticalScrollIndicator={false}
      // Pull-to-refresh is a touch-only affordance — omit it on TV (no touch;
      // refresh happens via re-entry / the day strip).
      refreshControl={
        isTV ? undefined : (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        )
      }
    >
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
        // On TV, TVFocusZone (a TVFocusGuideView, mobile-inert) gives the
        // D-pad a guided destination so focus lands on the first row — plain
        // RN ScrollView children below the fold are otherwise unreachable by
        // the TV focus engine. Each row scrolls itself into view on focus.
        <TVFocusZone>
          {programs.map((p) => {
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
                  onFocus={() => centerOnProgram(p.id)}
                  testID={`epg-row-${p.id}`}
                />
              </View>
            );
          })}
        </TVFocusZone>
      )}
    </ScrollView>
  );

  // TV drawer body — a SINGLE vertical FlatList with the date strip as its
  // header, so the D-pad flows date-chips → programme rows within ONE list's
  // focus management. Two separate scrollers (horizontal strip + vertical
  // ScrollView) don't hand focus off reliably on tvOS — this is the fix for
  // "can't move from the dates into the list". FlatList auto-scrolls the focused
  // row into view. TV-only; mobile keeps the ScrollView above untouched.
  const tvListRef = useRef<FlatList<EpgItem>>(null);
  // Default the drawer to the programme currently on the player (the now-airing
  // one when watching live), so the guide opens centered on it instead of at the
  // top — no manual scrolling to find "what's on now".
  const tvActiveIndex = programs.findIndex((p) => p.id === activeProgramId);
  const tvGuideHeader = (
    <View>
      {dayStripEl}
      {!selectedDay.isToday && !selectedDay.isFuture ? (
        <CatchupBanner label={t('catchup.banner', { day: dayLabel })} testID="catchup-banner" />
      ) : null}
      <ReusableText variant="bodySmall" fontWeight="extraBold" style={styles.epgHeader}>
        {selectedDay.isToday ? t('catchup.epg') : t('catchup.catchup_for', { day: dayLabel })}
      </ReusableText>
    </View>
  );
  const tvGuideList = (
    <FlatList
      ref={tvListRef}
      data={epgLoading ? [] : programs}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={tvGuideHeader}
      // Start rendered at the airing programme so its row is mounted (and thus
      // can grab initial focus) and roughly in view; onFocus then centers it.
      initialScrollIndex={tvActiveIndex > 0 ? tvActiveIndex : undefined}
      ListEmptyComponent={
        epgLoading ? (
          <View>
            {Array.from({ length: 8 }, (_, i) => (
              <ProgramRowSkeleton key={i} />
            ))}
          </View>
        ) : (
          <EmptyEpgState testID="epg-empty" />
        )
      }
      renderItem={({ item: p, index }) => {
        const state = programState(p);
        return (
          <ProgramRow
            title={p.title}
            meta={p.description}
            time={formatTime(p.startTime)}
            state={state}
            isPlaying={p.id === activeProgramId}
            isLiveNow={selectedDay.isToday && playing?.id === p.id}
            onPress={() => handleSelectProgram(p, state)}
            // Land initial D-pad focus on the airing/active programme when the
            // drawer opens, so the user is on "now" without scrolling.
            hasTVPreferredFocus={p.id === activeProgramId}
            onFocus={() =>
              tvListRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true })
            }
            testID={`epg-row-${p.id}`}
          />
        );
      }}
      onScrollToIndexFailed={({ index }) => {
        setTimeout(() => {
          tvListRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: false });
        }, 60);
      }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    />
  );

  return (
    <ScreenLayout
      edges={isFullscreen ? ['bottom', 'left', 'right'] : []}
      backgroundColor={isFullscreen ? 'videoPlaceholderBg' : 'background'}
    >
      {isTV ? (
        // TV (landscape, 10-foot): the player stays full-screen. The guide (date
        // strip + programme list) opens in a slide-in drawer from the header
        // hamburger, so the mobile portrait stack (which would push the list
        // off-screen behind a full-width 16:9 video) is never used here.
        <>
          {videoBox}
          {guideOpen ? (
            <View style={styles.tvDrawerScrim}>
              {/* Focus-trapped panel: the D-pad stays inside (dates + list +
                  close) until the user closes it (close button / Back key). */}
              <TVFocusZone
                style={styles.tvDrawer}
                // autoFocus off so it doesn't force focus to the first child
                // (close) — the airing programme row claims initial focus via
                // hasTVPreferredFocus instead (close is the fallback below).
                autoFocus={false}
                trapFocusUp
                trapFocusDown
                trapFocusLeft
                trapFocusRight
              >
                <View style={styles.tvDrawerHead}>
                  <ReusableText variant="heading3" themeColor="text">
                    {t('catchup.epg')}
                  </ReusableText>
                  <TouchableOpacity
                    {...drawerCloseFocus.focusProps}
                    hasTVPreferredFocus={tvActiveIndex < 0}
                    style={[
                      styles.drawerCloseBtn,
                      tvFocusHighlight(colors.focus, drawerCloseFocus.focused),
                    ]}
                    onPress={() => setGuideOpen(false)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    testID="channel-guide-close"
                  >
                    <Icon as={CloseIcon} size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {tvGuideList}
              </TVFocusZone>
            </View>
          ) : null}
        </>
      ) : (
        <>
          {videoBox}
          {!isFullscreen && (
            <>
              {dayStripEl}
              {programList}
            </>
          )}
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
      {channelAd && canShowChannelAd ? (
        <AdOverlay
          creative={channelAd}
          channelId={numericChannelId}
          onComplete={() => setAdDone(true)}
          testID="channel-ad"
        />
      ) : null}

      {/* Mid-roll — fires during playback at its scheduled time. Never over a
          skeleton, the preroll, or a blocked player. */}
      {midrollAd && canShowMidrollAd ? (
        <AdOverlay
          creative={midrollAd}
          channelId={numericChannelId}
          onComplete={onMidrollComplete}
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
  // TV: guide-drawer header button — top-left, immediately right of the back
  // button (40px button + 8px gap), so it never collides with the player's own
  // options button in the top-right.
  guideBtn: {
    position: 'absolute',
    top: SPACING.space_10,
    left: SPACING.space_10 + 48,
    width: 40,
    height: 40,
    borderRadius: BORDERRADIUS.full,
    backgroundColor: PLAYER_COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // TV: guide drawer — a dimmed scrim over the full-screen player with a panel
  // slid against the right edge (dates + programme list).
  tvDrawerScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tvDrawer: {
    width: '38%',
    minWidth: 420,
    height: '100%',
    backgroundColor: PLAYER_COLORS.surface,
    paddingTop: SPACING.space_16,
  },
  tvDrawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SPACING.space_12,
  },
  drawerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
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
