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
 *
 * Both programme lists are virtualized — mobile a `FlashList`, TV a `FlatList`
 * inside the drawer. A `ProgramRow` is expensive to mount (reanimated layout +
 * worklet, plus a native BlurView per `scheduled` row on Android), so building a
 * whole day at once made switching dates janky. The mobile rows pass `recycled`
 * because FlashList reuses cells and Reanimated would otherwise animate a reuse
 * as if it were an expand; the TV list doesn't need it (recycling aside, TV
 * already disables the row's layout animation). Auto-centering on the active
 * programme is `scrollToIndex` on both.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashList, type FlashListRef } from '@shopify/flash-list';
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
import { useContentWidth, useResponsive } from '@/responsive';
import { isTV, tvFocusHighlight, TVFocusZone, useTVFocus } from '@/tv';

/**
 * Tablet-landscape split ratio (video : guide). 62/38 keeps the player the
 * clear focus while leaving the guide column wide enough for a programme title
 * plus its time without wrapping every row. Only ever read in landscape on a
 * tablet — see `splitLayout`.
 *
 * The video side is a WIDTH percentage (it keeps its 16:9 `aspectRatio`), the
 * guide side is a `flex` weight (it fills the remaining width and the full
 * height). Both are concrete in the non-split state too — see `videoSplit`.
 */
const VIDEO_SPLIT_PERCENT = 62;
const GUIDE_SPLIT_FLEX = 38;

const CATCHUP_DAYS_BACK = 7;
const CATCHUP_DAYS_FORWARD = 7;

/**
 * Weekday i18n keys by JS `Date.getDay()` (0 = Sunday). The strip reads names
 * from `datetime.day_names.*` rather than `Intl.DateTimeFormat`, because Hermes'
 * bundled ICU lacks Albanian locale data and silently falls back to English —
 * so the whole strip follows the app language, never a partial Intl fallback.
 */
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Module-level so the virtualized list never sees a new identity (see `programList`). */
const keyExtractor = (p: EpgItem) => p.id;

const ChannelScreen: React.FC = () => {
  // Cellular data warning. While `pending`, the confirmation modal is up and the
  // player stays unmounted — the stream must not start behind it.
  const cellular = useCellularGate();
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
  // landscape, collapse restores portrait. PHONES are otherwise portrait-only —
  // physically rotating one does nothing (no sensor auto-rotation). TABLETS
  // rotate freely (see `useOrientation.ts`), which is what `splitLayout` below
  // exists to handle.
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreenOrientation();

  // Tablet landscape — the SPLIT layout (video left, guide right).
  //
  // Why it's mandatory rather than cosmetic: stacked, a 16:9 player eats
  // width×9/16 of the vertical budget. On a 1280×716dp tablet that is ~450dp of
  // 716 before any chrome, which pushes the day strip to the screen edge and the
  // programme list entirely below the fold — and this screen is a fixed,
  // non-scrolling column, so nothing can bring the list back. Verified on device
  // 2026-07-28 (zero programme rows in the UI tree; a swipe scrolled nothing).
  // Side by side, the video is bounded by the COLUMN width instead, and the
  // guide gets the full screen height for its list.
  //
  // Scoped to `tablet` explicitly, never `!== 'phone'`: TV has its own branch
  // below, and a phone must be untouched by any of this.
  const { deviceClass, isLandscape } = useResponsive();
  const splitLayout = deviceClass === 'tablet' && isLandscape && !isTV && !isFullscreen;

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
  // Pulled out so the list's memoized callbacks can depend on this stable
  // reference rather than `guard`, which is a fresh object every render.
  const { guardPlay } = guard;
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
  const isToday = selectedDay.isToday;
  const playingId = playing?.id ?? null;
  const programState = useCallback(
    (p: EpgItem): ProgramRowState => {
      if (isToday && playingId === p.id) return 'now';
      if (Date.parse(p.startTime) > nowMs) return 'scheduled'; // not started yet
      return 'recorded'; // finished → catch-up playable
    },
    [isToday, playingId, nowMs],
  );

  // Which EPG row shows its full description. A single id is the whole "only one
  // row open" rule — there is nothing to reconcile. On TV it is driven from row
  // focus instead of a tap (see the FlatList's onFocus), and focus is unique, so
  // the same invariant holds there from the same field.
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  // Stable identity — it feeds the virtualized list's `renderItem`, which
  // FlashList requires to be memoized (see `programList`).
  const handleToggleExpand = useCallback((p: EpgItem) => {
    setExpandedProgramId((cur) => (cur === p.id ? null : p.id));
  }, []);

  // Switching day swaps the whole list — an open row from the previous day would
  // otherwise linger in state with nothing to match.
  const handleSelectDay = (key: string) => {
    setSelectedKey(key);
    setExpandedProgramId(null);
  };

  // Playback. Reached from the row's play glyph on mobile (the body expands
  // instead) and from a row press on TV. A `scheduled` programme renders no play
  // glyph, so it can never get here.
  const handleSelectProgram = useCallback(
    (p: EpgItem, state: ProgramRowState) => {
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
        guardPlay(p, () => {
          setSelectedProgramId(p.id);
          setSelectedProgramTitle(p.title);
        });
      }
    },
    // `guard` itself is a fresh object every render (the hook returns a literal),
    // so depend on the stable callback it exposes — otherwise this, and the
    // list's memoized `renderItem` below, churn on every render.
    [queryClient, channelId, guardPlay],
  );

  // Auto-center the active programme — whatever is on the player (the recorded
  // selection, or live's now-airing programme) sits in the middle of the EPG.
  // The mobile list is virtualized, so this is a `scrollToIndex` rather than
  // per-row offset bookkeeping: nothing to measure, nothing to invalidate on a
  // day change. The TV branch centers itself (`initialScrollIndex` +
  // `scrollToFocusedRow`).
  //
  // It MUST wait for `onLoad`. FlashList deliberately draws no items on its
  // first cycle — it measures itself first — so a scroll issued before that
  // resolves against an unmeasured list, lands at an estimated offset, and then
  // visibly snaps to the true position on the user's first scroll. `listReady`
  // is that gate.
  const activeProgramId = selectedProgramId ?? playing?.id ?? null;
  const activeIndex = activeProgramId ? programs.findIndex((p) => p.id === activeProgramId) : -1;
  const listRef = useRef<FlashListRef<EpgItem>>(null);
  const [listReady, setListReady] = useState(false);
  // The first center is a silent jump (the screen should simply open on the
  // active programme); later ones — programme rollover, picking a recording —
  // animate, so the movement is visible as a change.
  const didInitialCenterRef = useRef(false);

  useEffect(() => {
    if (isTV || !listReady || activeIndex < 0) return;
    const animated = didInitialCenterRef.current;
    didInitialCenterRef.current = true;
    const raf = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: activeIndex, viewPosition: 0.5, animated });
    });
    return () => cancelAnimationFrame(raf);
  }, [listReady, activeIndex, selectedKey]);

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
    cellular.pending || mediaPending || adPending ? (
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
        onOpenOptions={() => router.push('/(app)/(modals)/player-options')}
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
  // Portrait (non-fullscreen): we own the top inset explicitly via
  // `useSafeAreaInsets` (`marginTop: insets.top` on the video box, outside its
  // aspect-ratio frame) rather than leaning on `SafeAreaView`'s `edges` prop;
  // the absolutely-positioned back button rides down with the box and clears
  // the notch. This dates from when the route was an iOS `fullScreenModal`,
  // where `edges` did NOT reliably apply the top inset (full-bleed video sat
  // under the notch, back button clipped + unclickable). The route is a card
  // push now (see `(app)/_layout.tsx`), so `edges` may well work — but the
  // explicit inset is correct either way, so it stays until someone verifies
  // the simpler form on a notched device.
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
  //
  // Tablet landscape adds `styles.videoSplit` LAST, which unsets the two props
  // `contentWidth` contributes (`width: '100%'` + `maxWidth`) and sizes the box
  // from the row instead. Unsetting `maxWidth` is the important part: `maxWidth`
  // and `aspectRatio` on the SAME node is what made this box 820dp wide but far
  // taller than 820×9/16 — the aspect height is derived before the clamp, so the
  // player kept a 1280dp-wide box's height. In portrait the window (800dp) is
  // narrower than the 820dp cap, so the clamp never binds and portrait was
  // always correct — which is exactly why the bug only ever showed in landscape.
  const videoBoxStyle =
    isTV || isFullscreen
      ? styles.videoFull
      : [styles.video, contentWidth, { marginTop: insets.top }, splitLayout && styles.videoSplit];
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
        onSelect={handleSelectDay}
        testID="player-daystrip"
      />
    </View>
  );

  // MOBILE list only — the TV branch never renders this (it uses `tvGuideList`
  // in the drawer), so nothing here needs an `isTV` guard.
  //
  // Virtualized: a full day's schedule is dozens of rows and a `ProgramRow` is
  // expensive to mount (reanimated layout + worklet, plus a native BlurView per
  // `scheduled` row on Android). Building them all made switching dates janky.
  // Rows recycle, hence `recycled` on each one — without it a cell being reused
  // for a different programme animates the swap as if it were an expand, which
  // reads as a flicker while scrolling (FlashList → Reanimated guide).
  // EVERY prop below is memoized on purpose. This screen re-renders on its own
  // timers (realtime, parental/geo boundary checks, ad slots, now-programme
  // rollover), and a fresh `ListHeaderComponent` element on each of those makes
  // FlashList re-measure the header. The header sits at offset 0, so its height
  // feeds every row's offset — re-measuring it shifts the top of the list and
  // the first rows visibly hide and reappear mid-scroll. The radio schedule
  // never showed this only because that screen has no such timers.
  const listHeader = useMemo(
    () => (
      <View style={contentWidth}>
        {!isToday && !selectedDay.isFuture ? (
          <CatchupBanner label={t('catchup.banner', { day: dayLabel })} testID="catchup-banner" />
        ) : null}
        <ReusableText variant="bodySmall" fontWeight="extraBold" style={styles.epgHeader}>
          {isToday ? t('catchup.epg') : t('catchup.catchup_for', { day: dayLabel })}
        </ReusableText>
      </View>
    ),
    [contentWidth, isToday, selectedDay.isFuture, dayLabel, t],
  );

  const listEmpty = useMemo(
    () =>
      epgLoading ? (
        <View style={contentWidth}>
          {Array.from({ length: 6 }, (_, i) => (
            <ProgramRowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <EmptyEpgState testID="epg-empty" />
      ),
    [epgLoading, contentWidth],
  );

  const listRefreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
      />
    ),
    [refreshing, handleRefresh, colors.primary],
  );

  const handleListLoad = useCallback(() => setListReady(true), []);

  const renderProgram = useCallback(
    ({ item: p }: { item: EpgItem }) => {
      const state = programState(p);
      return (
        <View style={contentWidth}>
          <ProgramRow
            recycled
            title={p.title}
            meta={p.description}
            time={formatTime(p.startTime)}
            ageRating={p.ageRating}
            state={state}
            isPlaying={p.id === activeProgramId}
            isLiveNow={isToday && playingId === p.id}
            onPress={() => handleSelectProgram(p, state)}
            expanded={p.id === expandedProgramId}
            onToggleExpand={() => handleToggleExpand(p)}
            testID={`epg-row-${p.id}`}
          />
        </View>
      );
    },
    [
      contentWidth,
      programState,
      formatTime,
      activeProgramId,
      isToday,
      playingId,
      expandedProgramId,
      handleSelectProgram,
      handleToggleExpand,
    ],
  );

  const listData = useMemo(() => (epgLoading ? [] : programs), [epgLoading, programs]);

  // No `style` on the list itself — its bounding height comes from the `flex: 1`
  // wrapper below (`guidePane`), matching the radio schedule, which centers
  // correctly. FlashList derives its viewport from that box, and `viewPosition`
  // is computed against it, so the box has to be the thing that's definite.
  const programList = (
    <FlashList
      ref={listRef}
      data={listData}
      keyExtractor={keyExtractor}
      // Recycled rows re-render off these, not just `data`.
      extraData={`${activeProgramId}|${expandedProgramId}|${playingId}|${isToday}`}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      // Items only exist after FlashList's first measure pass — this is the
      // earliest point `scrollToIndex` resolves against real offsets.
      onLoad={handleListLoad}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      refreshControl={listRefreshControl}
      renderItem={renderProgram}
    />
  );

  // TV drawer body — a SINGLE vertical FlatList with the date strip as its
  // header, so the D-pad flows date-chips → programme rows within ONE list's
  // focus management. Two separate scrollers (horizontal strip + vertical
  // ScrollView) don't hand focus off reliably on tvOS — this is the fix for
  // "can't move from the dates into the list". FlatList auto-scrolls the focused
  // row into view. TV-only; mobile keeps the ScrollView above untouched.
  const tvListRef = useRef<FlatList<EpgItem>>(null);
  const tvScrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mashing the D-pad fires onFocus faster than each animated scrollToIndex can
  // settle, stacking overlapping animations on the list — this coalesces rapid
  // focus changes so only the row the user actually lands on triggers a scroll
  // (hardens the removeClippedSubviews fix above against the same overlap).
  const scrollToFocusedRow = useCallback((index: number) => {
    if (tvScrollDebounceRef.current) clearTimeout(tvScrollDebounceRef.current);
    tvScrollDebounceRef.current = setTimeout(() => {
      tvListRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
    }, 80);
  }, []);
  useEffect(() => {
    return () => {
      if (tvScrollDebounceRef.current) clearTimeout(tvScrollDebounceRef.current);
    };
  }, []);
  // The drawer opens centered on the programme currently on the player (the
  // now-airing one when watching live) instead of at the top — no manual
  // scrolling to find "what's on now". Shares `activeIndex` with the mobile
  // list's auto-center; only the scrolling mechanism differs.
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
      // Rapid D-pad presses stack overlapping animated scrollToIndex calls
      // (fired per-row onFocus below) while the list is simultaneously mounting/
      // unmounting rows via windowing — Android's removeClippedSubviews child-count
      // bookkeeping desyncs under that overlap and throws IllegalStateException
      // ("Invalid clipping state"). Disabling it for this small list is the
      // standard workaround; the list is short enough that keeping all rows
      // natively mounted is cheap.
      removeClippedSubviews={false}
      ListHeaderComponent={tvGuideHeader}
      // Start rendered at the airing programme so its row is mounted (and thus
      // can grab initial focus) and roughly in view; onFocus then centers it.
      initialScrollIndex={activeIndex > 0 ? activeIndex : undefined}
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
            ageRating={p.ageRating}
            state={state}
            isPlaying={p.id === activeProgramId}
            isLiveNow={selectedDay.isToday && playing?.id === p.id}
            onPress={() => handleSelectProgram(p, state)}
            expanded={p.id === expandedProgramId}
            // Marks the row expandable (chevron + un-clamped description). On TV
            // the body press still plays, so this is never fired by a tap here —
            // focus below is what opens the row.
            onToggleExpand={() => handleToggleExpand(p)}
            // Land initial D-pad focus on the airing/active programme when the
            // drawer opens, so the user is on "now" without scrolling.
            hasTVPreferredFocus={p.id === activeProgramId}
            onFocus={() => {
              scrollToFocusedRow(index);
              // Focus IS the expansion on TV: only one row can hold D-pad focus,
              // so "one open row" falls out without a second source of truth.
              setExpandedProgramId(p.id);
            }}
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
      // Tablet landscape: flip the ROOT to a row so the video and the guide sit
      // side by side. Passed as a style on the existing root rather than wrapping
      // the children in a new <View> — an added/removed wrapper across a rotation
      // would remount the VideoView and restart playback.
      //
      // Always a style, never `undefined`: `flexDirection` must be explicitly
      // written back to 'column' on the way out of landscape, because a removed
      // layout prop is not reliably reset (see `videoSplit`).
      style={splitLayout ? styles.bodySplit : styles.bodyStack}
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
                    hasTVPreferredFocus={activeIndex < 0}
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
            // One bounded pane below the player holds the strip + list, so the
            // list's height is definite (mirrors the radio schedule's
            // `bottomHalf`). FlashList reads its viewport from this box — that's
            // what `viewPosition: 0.5` centers against.
            <View style={[styles.guidePane, splitLayout && styles.guidePaneSplit]}>
              {dayStripEl}
              {programList}
            </View>
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
  // TABLET LANDSCAPE ONLY (see `splitLayout`). Narrows the player to the left
  // column; `aspectRatio` from `styles.video` still sets the height, so the box
  // is 62% × 9/16 and the guide column keeps the rest of the screen.
  //
  // Deliberately NO `flex` here, and every property it touches is also set in
  // the non-split state. Rotating back to portrait REMOVES this style from the
  // array, and RN does not reliably reset a layout prop that simply disappears
  // — a `flex: 62` survived the rotation and made the player fill the whole
  // portrait screen (verified on device 2026-07-28). Overriding a VALUE is
  // safe; removing a PROPERTY is not. `maxWidth` needs no override either: 62%
  // of any tablet width is below the 820dp cap, so the cap never binds.
  videoSplit: {
    width: `${VIDEO_SPLIT_PERCENT}%`,
    alignSelf: 'center',
    marginTop: 0,
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
  // Bounded box for the day strip + programme list — it fills whatever is left
  // below the player, which is what gives the virtualized list a definite
  // viewport height to center against.
  guidePane: {
    flex: 1,
  },
  // TABLET LANDSCAPE ONLY — the guide becomes the right column of the row and
  // takes the FULL screen height, which is the whole point: stacked it only got
  // whatever the 16:9 player left over, which was nothing.
  guidePaneSplit: {
    flex: GUIDE_SPLIT_FLEX,
  },
  // The two ROOT directions, applied to the ScreenLayout root (see its `style`
  // prop). A style swap on an existing node, never a wrapper, so the VideoView
  // keeps its tree position across a rotation and playback survives. `bodyStack`
  // is the default column and exists only so leaving landscape WRITES 'column'
  // back rather than dropping the prop.
  bodyStack: {
    flexDirection: 'column',
  },
  bodySplit: {
    flexDirection: 'row',
  },
  epgHeader: {
    letterSpacing: 0.6,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_16,
    paddingBottom: SPACING.space_4,
  },
});

export default ChannelScreen;
