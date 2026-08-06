/**
 * Radio player — design `sRadioPlayer`. A floating, frosted back/title header
 * (the same translucent BlurView + rgba treatment as `BrandHeader`) over a
 * fixed two-pane body: the top pane is the `RadioPlayer` now-playing core
 * (art, name, eq, transport), pinned and non-scrolling; the bottom pane is a
 * 15-day strip (7 days back · today · 7 days forward) — also fixed — above the
 * schedule for the selected day. The schedule list is the ONLY thing that
 * scrolls; the screen itself never does.
 *
 * On a TABLET IN LANDSCAPE and on TV/STB those two panes sit SIDE BY SIDE
 * instead (see `splitLayout`) — the same shape, and the same reason, as
 * `channel/[id]`: stacked, the fixed now-playing pane plus the day strip eat the
 * short landscape height and leave the list a viewport barely a row tall, with
 * no way to scroll the rest into view. A 1080p TV is 540dp tall at density 320,
 * so it is SHORTER than the phone this stacked layout was drawn for while
 * `UI_SCALE` steps every token up 1.3× — stacked, the schedule got ~43dp.
 *
 * Playback is store-driven: mounting selects the station in `PlayerSlice`
 * (which `RadioAudioHost` turns into actual audio); the transport just flips
 * store flags. Prev / next swap the station in place (local `activeId` state,
 * no navigation) so there's no screen-slide. Closing from the mini-player
 * (anywhere) clears the store, which this screen watches to `router.back()`.
 *
 * Radio EPG — `GET /channels/{id}/epg?date=YYYY-MM-DD`, the SAME per-channel
 * endpoint + day-strip mechanism the TV channel screen uses
 * (`useChannelEpgQuery`): a radio station is just a `Channel` with
 * `type: 'RADIO'` in the same id-space, so the call is unchanged, only the id
 * differs. Unlike TV, browsing is **read-only** — radio is one continuous
 * stream with no per-programme recording, so the day strip only lets you see
 * what aired/airs when. Only the currently-airing row on TODAY is interactive
 * (`state: 'now'`, toggles the live stream); every other row — past or future,
 * on any day — renders `state: 'scheduled'` (info only, non-pressable, but
 * still expandable to read its description).
 *
 * The schedule is a virtualized `FlashList`. That matters beyond the usual
 * reason: a `ProgramRow` is expensive to mount (reanimated layout + a worklet,
 * plus a native `BlurView` on Android — and on radio every row but the airing
 * one is `scheduled`, so nearly all of them carry one). Building a whole day at
 * once made switching dates visibly janky; recycling keeps it to the visible
 * slice. It also means auto-centering on the now-airing row is a plain
 * `scrollToIndex` rather than the channel screen's `onLayout` offset
 * bookkeeping — nothing to measure, nothing to invalidate on a day change.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import {
  useChannelEpgQuery,
  useChannelPlaybackQuery,
  useChannelsQuery,
  useRadioStationQuery,
} from '@/api/queries';
import { useCellularGate } from '@/hooks/useCellularGate';
import { useDateTime } from '@/hooks/useDateTime';
import { useNowProgram } from '@/hooks/useNowProgram';
import { useToday } from '@/hooks/useToday';
import { CatchupBanner, DayStrip } from '@/components/catchup';
import { EmptyEpgState } from '@/components/empty';
import { ProgramRow, ProgramRowSkeleton } from '@/components/epg';
import type { ProgramRowState } from '@/components/epg/ProgramRow';
import { Icon, IconButton } from '@/components/Icons';
import { ScreenLayout, SectionHeader, Skeleton, TabHeader } from '@/components/Layout';
import RadioPlayer from '@/components/Media/RadioPlayer';
import { resolveStreamSource } from '@/utils';
import { formatDayMonth, toDateKey } from '@/utils/datetime';
import type { CatchupDay, EpgItem } from '@/types/domain';
import { ChevronLeftIcon } from '@/assets/icons';
import { useContentWidth, useResponsive } from '@/responsive';

/**
 * Tablet-landscape split ratio (now-playing : schedule) — the radio counterpart
 * of the channel screen's 62/38. The now-playing core is a fixed-size block
 * (compact art + a transport row), so it needs far less than a 16:9 player does;
 * the schedule takes the larger share because it's the only scrolling region.
 *
 * The player side is a WIDTH percentage (it stays content-height and centers
 * vertically), the schedule side is a `flex` weight (it fills the remaining
 * width and the full height).
 */
const PLAYER_SPLIT_PERCENT = 42;
const SCHEDULE_SPLIT_FLEX = 58;

const CATCHUP_DAYS_BACK = 7;
const CATCHUP_DAYS_FORWARD = 7;
const EPG_SKELETON_ROWS = 5;

/** Mirrors the channel screen's day-strip weekday keys (see channel/[id].tsx). */
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Mirrors RadioPlayer's compact artwork sizing (48% width capped at 160). */
const ART_MAX = 160;

/** Header content height above the safe-area inset — mirrors `TabHeader`'s own default. */
const HEADER_BASE_HEIGHT = 56;
/** Extra breathing room below the floating header before the player art starts. */
const HEADER_CONTENT_GAP = SPACING.space_10;

const RadioPlayerScreen: React.FC = () => {
  // Cellular data warning. While `pending`, the station is not selected into the
  // store — `RadioAudioHost` is store-driven, so nothing streams behind the modal.
  const cellular = useCellularGate();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { formatTime } = useDateTime();

  const colors = useAppStore((s) => s.colors);
  const mode = useAppStore((s) => s.mode);
  const insets = useSafeAreaInsets();
  // Cap + center the column on tablet/TV; no-op on phone. `player` (820), NOT
  // `content` (640) — this screen is a player + its EPG, the same kind of column
  // as `channel/[id]`, and the two must not disagree on width. At 640 a tablet in
  // portrait (800dp) showed 80dp gutters while the channel screen went
  // full-bleed; the 820 cap doesn't bind in portrait, so both read the same.
  const contentWidth = useContentWidth('player');

  // Tablet landscape AND TV/STB — the SPLIT layout (now-playing left, schedule
  // right).
  //
  // Same defect, same fix as the channel screen: stacked, the fixed now-playing
  // pane plus the day strip consume most of the short landscape height and leave
  // the schedule list a viewport barely a row tall — and this screen is a fixed,
  // non-scrolling column, so nothing can bring the rest of the list back. Side by
  // side, the schedule column gets the FULL screen height.
  //
  // TV is in because it has exactly that shape, only worse: a 1080p set is 540dp
  // tall at density 320 — SHORTER than the phone this stacked layout was drawn
  // for — while UI_SCALE steps every token up 1.3×. Stacked, the schedule got
  // ~43dp, under a single row. TV needs no `isLandscape` test: a TV is always
  // landscape (see GRID_COLUMNS' tv entry, which carries the same assumption).
  //
  // A phone stays untouched by any of this.
  const { deviceClass, isLandscape } = useResponsive();
  const splitLayout = deviceClass === 'tv' || (deviceClass === 'tablet' && isLandscape);
  const radioChannelId = useAppStore((s) => s.radioChannelId);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const setRadioChannel = useAppStore((s) => s.setRadioChannel);
  const setRadioPlaying = useAppStore((s) => s.setRadioPlaying);

  // Floating header clearance for the (non-scrolling) top pane — mirrors
  // `useBrandHeaderHeight`'s formula, kept local since only this screen floats
  // a `TabHeader`.
  const headerHeight = HEADER_BASE_HEIGHT + insets.top + HEADER_CONTENT_GAP;

  // The URL param only seeds the screen; prev/next swap the station in place
  // (no navigation), so the displayed station lives in local state.
  const [activeId, setActiveId] = useState(id);

  const { station, isLoading } = useRadioStationQuery(activeId);
  const { playback } = useChannelPlaybackQuery(activeId);
  const { channels: stations } = useChannelsQuery('RADIO');

  const isActive = radioChannelId === activeId;
  const isPlaying = isActive && radioIsPlaying;

  // Current local calendar day, kept correct across midnight (foreground +
  // next-midnight timer) — see `useToday`.
  const todayKey = useToday();

  // Day strip — past (7) · today · future (7), oldest left. Identical
  // construction to the channel screen's day strip.
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

  // Roll the selection forward with the calendar day — but only when the user
  // is parked on "today"; a deliberately-chosen past/future day stays put (the
  // chip just relabels as the strip shifts). Same adjust-state-during-render
  // pattern as the channel screen (no effect, no extra commit).
  const [dayAnchor, setDayAnchor] = useState(todayKey);
  if (todayKey !== dayAnchor) {
    if (selectedKey === dayAnchor) setSelectedKey(todayKey);
    setDayAnchor(todayKey);
  }

  const selectedDay = days.find((d) => d.key === selectedKey) ?? days[CATCHUP_DAYS_BACK];

  // Schedule for the selected day — same per-channel EPG endpoint/hook as the
  // TV screen, just keyed on the station's id instead of a TV channel's.
  const { items: epg, isLoading: epgLoading } = useChannelEpgQuery(activeId, selectedKey);
  const programs = useMemo(
    () => [...epg].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    [epg],
  );

  // Only TODAY's list has a meaningful "now" — browsing another day passes []
  // so nothing is marked as airing there.
  const { playing } = useNowProgram(selectedDay.isToday ? programs : []);

  // One row open at a time; resets on day/station swap since the list changes
  // under it.
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const handleToggleExpand = (p: EpgItem) => {
    setExpandedProgramId((cur) => (cur === p.id ? null : p.id));
  };

  const handleSelectDay = (key: string) => {
    setSelectedKey(key);
    setExpandedProgramId(null);
  };

  // Radio has no per-programme playback — only the row airing right now on
  // TODAY is interactive; every other row (already aired or upcoming, on any
  // day) is info-only. Pressing it (via the play glyph) toggles the single
  // live stream.
  const programState = (p: EpgItem): ProgramRowState =>
    selectedDay.isToday && playing?.id === p.id ? 'now' : 'scheduled';

  // Auto-center the airing programme. The list is virtualized, so this is a
  // `scrollToIndex` rather than per-row offset bookkeeping — nothing to
  // measure, nothing to invalidate on a day change. Only meaningful on today's
  // list (browsing another day has nothing "active" to center on).
  //
  // It MUST wait for `onLoad`. FlashList deliberately draws no items on its
  // first cycle — it measures itself first — so a scroll issued before that
  // resolves against an unmeasured list and lands at an estimated offset, which
  // then snaps to the true position on the user's first scroll. `listReady` is
  // that gate.
  const activeProgramId = selectedDay.isToday ? (playing?.id ?? null) : null;
  const listRef = useRef<FlashListRef<EpgItem>>(null);
  const activeIndex = activeProgramId
    ? programs.findIndex((p) => p.id === activeProgramId)
    : -1;
  const [listReady, setListReady] = useState(false);
  // First center is a silent jump (the screen should simply open on the airing
  // programme); later ones — programme rollover — animate so the move is seen.
  const didInitialCenterRef = useRef(false);

  useEffect(() => {
    if (!listReady || activeIndex < 0) return;
    const animated = didInitialCenterRef.current;
    didInitialCenterRef.current = true;
    const raf = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: activeIndex, viewPosition: 0.5, animated });
    });
    return () => cancelAnimationFrame(raf);
  }, [listReady, activeIndex, selectedKey]);

  // Select the active station in the store once per `activeId` (entry + prev/next).
  // A ref guard keeps a store clear (mini-player close) from re-selecting it.
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (cellular.pending || !station || !playback || selectedRef.current === activeId) return;
    selectedRef.current = activeId;
    setRadioChannel({
      channelId: station.id,
      streamUrl: resolveStreamSource(playback.streams, 'auto'),
      title: station.name,
      artworkUrl: station.imageUrl,
    });
    // `cellular.pending` is a dep so the station is selected the moment the user
    // accepts the data warning — not only on the next unrelated re-render.
  }, [cellular.pending, station, playback, activeId, setRadioChannel]);

  // Closing the player (X on the mini-player, on-screen or off) clears the store;
  // when that happens while this screen is open, leave it too.
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (radioChannelId) wasActiveRef.current = true;
    else if (wasActiveRef.current) router.back();
  }, [radioChannelId]);

  const { prevId, nextId } = useMemo(() => {
    const i = stations.findIndex((s: { id: string }) => s.id === activeId);
    if (i === -1) return { prevId: undefined, nextId: undefined };
    return {
      prevId: i > 0 ? stations[i - 1].id : undefined,
      nextId: i < stations.length - 1 ? stations[i + 1].id : undefined,
    };
  }, [stations, activeId]);

  const togglePlay = () => {
    if (isActive) {
      setRadioPlaying(!radioIsPlaying);
    } else if (station && playback) {
      setRadioChannel({
        channelId: station.id,
        streamUrl: resolveStreamSource(playback.streams, 'auto'),
        title: station.name,
        artworkUrl: station.imageUrl,
      });
    }
  };

  // Pull-to-refresh — mirrors the channel screen: invalidate this station's
  // schedule (every cached day, prefix-matched) + the cached RADIO list
  // (station name/art).
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['channel-epg', activeId] }),
      queryClient.invalidateQueries({ queryKey: ['channels', 'RADIO'] }),
    ]);
    setRefreshing(false);
  };

  // Floating, frosted header — the same absolute + BlurView/rgba translucent
  // treatment as `BrandHeader`, floating over the (non-scrolling) top pane
  // instead of sitting in normal flow like the flat `TabHeader` used by
  // settings/account/change-password. Identical across every screen state, so
  // it's built once rather than duplicated in each early return below.
  const floatingHeader = (
    <View style={styles.floatingHeader} testID="radio-player-header">
      {Platform.OS === 'ios' ? (
        <BlurView
          tint={mode === 'light' ? 'light' : 'dark'}
          intensity={40}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarSolid }]} />
      )}
      <TabHeader
        title={t('radio.now_playing')}
        isCentered
        leftAction={
          <IconButton onPress={() => router.back()} testID="radio-player-back">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        }
      />
    </View>
  );

  if (isLoading && !station) {
    return (
      <ScreenLayout>
        <View
          style={[styles.skeletonBody, { paddingTop: headerHeight }]}
          testID="radio-player-skeleton"
        >
          <Skeleton borderRadius={BORDERRADIUS.radius_20} style={styles.skeletonArt} />
          <Skeleton width={150} height={FONTSIZE.lg} />
          <Skeleton width={90} height={FONTSIZE.sm} />
        </View>
        {floatingHeader}
      </ScreenLayout>
    );
  }

  if (!station) {
    return <ScreenLayout>{floatingHeader}</ScreenLayout>;
  }

  const dayLabel = `${selectedDay.weekday} ${selectedDay.date}`;

  // The past-day banner + section title scroll with the rows, so they ride the
  // list header rather than a wrapper above the scroller.
  const listHeader = (
    <View style={[styles.programs, contentWidth]}>
      {!selectedDay.isToday && !selectedDay.isFuture ? (
        <CatchupBanner label={t('radio.past_banner', { day: dayLabel })} testID="radio-past-banner" />
      ) : null}
      <SectionHeader
        title={selectedDay.isToday ? t('radio.program') : t('radio.schedule_for', { day: dayLabel })}
      />
    </View>
  );

  // Three-way placeholder (STYLE_GUIDE → Loading States): skeleton while the
  // day's schedule loads, else the empty state for a genuine [].
  const listEmpty = epgLoading ? (
    <View style={contentWidth}>
      {Array.from({ length: EPG_SKELETON_ROWS }, (_, i) => (
        <ProgramRowSkeleton key={i} />
      ))}
    </View>
  ) : (
    <EmptyEpgState testID="radio-epg-empty" />
  );

  // Rows recycle, so the list needs to know which non-`data` values change a
  // row's render — the open row, and what the transport/now-airing state is.
  const listExtraData = `${expandedProgramId}|${playing?.id}|${isPlaying}`;

  return (
    <ScreenLayout>
      <View
        style={[
          styles.body,
          splitLayout ? styles.bodySplit : styles.bodyStack,
          // Both columns clear the floating header in split mode; stacked, only
          // the top pane needs to (see its own paddingTop below). Written as a
          // value in BOTH states, never a style that appears and disappears —
          // a dropped layout prop isn't reliably reset across a rotation.
          { paddingTop: splitLayout ? headerHeight : 0 },
        ]}
      >
        {/* Now-playing core. Sized to its own content (never forced to a fixed
            fraction, so it can't be squeezed into overlapping the schedule);
            fixed, never scrolls. In split mode it becomes the left column and
            `alignSelf: 'center'` — a ROW's cross axis — centers it vertically. */}
        <View
          style={[
            styles.topHalf,
            contentWidth,
            { paddingTop: splitLayout ? 0 : headerHeight },
            splitLayout && styles.topHalfSplit,
          ]}
        >
          <RadioPlayer
            station={station}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onPrev={prevId ? () => setActiveId(prevId) : undefined}
            onNext={nextId ? () => setActiveId(nextId) : undefined}
            hasPrev={Boolean(prevId)}
            hasNext={Boolean(nextId)}
          />
        </View>

        {/* Schedule pane — day strip (sticky, outside the scroller) + list.
            Only the list scrolls; the day strip stays put. In split mode this
            becomes the right column and takes the FULL screen height, which is
            the whole point — stacked in landscape it got almost nothing. */}
        <View style={[styles.bottomHalf, splitLayout && styles.bottomHalfSplit]}>
          <View style={contentWidth}>
            <DayStrip
              days={days}
              selectedKey={selectedKey}
              onSelect={handleSelectDay}
              testID="radio-daystrip"
            />
          </View>

          {/* Virtualized: a day's schedule is dozens of rows and each one is
              expensive to mount (reanimated layout + worklet, and on Android a
              native BlurView, since on radio every row but the airing one is
              `scheduled`). Mounting them all made a date change janky — with
              recycling only the visible slice is ever built. */}
          <FlashList
            ref={listRef}
            data={epgLoading ? [] : programs}
            keyExtractor={(p) => p.id}
            extraData={listExtraData}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            // Items only exist after FlashList's first measure pass — this is
            // the earliest point `scrollToIndex` resolves against real offsets.
            onLoad={() => setListReady(true)}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item: p }) => {
              const state = programState(p);
              const isNow = state === 'now';
              return (
                <View style={contentWidth}>
                  <ProgramRow
                    // This list recycles — without this the row's height
                    // transition + chevron ease play on every cell reuse,
                    // reading as a flicker while scrolling.
                    recycled
                    title={p.title}
                    meta={p.description}
                    time={formatTime(p.startTime)}
                    ageRating={p.ageRating}
                    state={state}
                    isPlaying={isNow && isPlaying}
                    isLiveNow={isNow}
                    onPress={togglePlay}
                    expanded={p.id === expandedProgramId}
                    onToggleExpand={() => handleToggleExpand(p)}
                    testID={`radio-program-${p.id}`}
                  />
                </View>
              );
            }}
          />
        </View>
      </View>

      {floatingHeader}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: SPACING.space_40,
  },
  programs: {
    paddingTop: SPACING.space_16,
  },
  skeletonBody: {
    alignItems: 'center',
    paddingTop: SPACING.space_24,
    gap: SPACING.space_12,
  },
  skeletonArt: {
    width: '48%',
    maxWidth: ART_MAX,
    // Mirrors `RadioPlayer`'s `styles.art` — including the `maxHeight` clamp,
    // which is load-bearing there and here for the same reason (see that file:
    // an aspect-ratio height is derived from the PERCENTAGE width, before
    // `maxWidth` clamps it). This copy is the worse of the two: `skeletonBody`
    // carries no `contentWidth`, so its parent is the FULL window — 48% of a
    // 960dp TV is 461dp of tower where a 160dp square belongs.
    maxHeight: ART_MAX,
    aspectRatio: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
  },
  // The two body directions. `bodyStack` is the default column and exists only
  // so that leaving landscape WRITES 'column' back rather than dropping the
  // prop — RN does not reliably reset a layout prop that simply disappears
  // (learned on the channel screen's `videoSplit`).
  bodyStack: {
    flexDirection: 'column',
  },
  bodySplit: {
    flexDirection: 'row',
  },
  // Sized to its own content, never stretched to a fixed fraction — a forced
  // 50/50 split clipped or overlapped the transport row on shorter screens.
  // `overflow: hidden` is a defensive clip only; RadioPlayer's compact sizing
  // is what actually keeps it inside its pane.
  topHalf: {
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: SPACING.space_12,
  },
  // TABLET LANDSCAPE ONLY (see `splitLayout`). Narrows the now-playing core to
  // the left column; it keeps its content height and `alignSelf: 'center'`
  // centers it on the row's cross axis (vertically). No `flex` here on purpose —
  // this style is REMOVED on the way back to portrait, and an override of a
  // VALUE is safe where a removed PROPERTY is not. The 820 `maxWidth` from
  // `contentWidth` never binds: 42% of any tablet width is well under it.
  topHalfSplit: {
    width: `${PLAYER_SPLIT_PERCENT}%`,
    alignSelf: 'center',
  },
  // Takes whatever height remains below the top pane. The day strip renders
  // as its own sibling (not the ScrollView's first child), so it stays fixed
  // while only the schedule list scrolls.
  bottomHalf: {
    flex: 1,
  },
  // TABLET LANDSCAPE ONLY — the schedule becomes the right column of the row and
  // stretches to the FULL screen height, which is the whole point: stacked it
  // only got what the now-playing pane and the day strip left over, which in
  // landscape was barely one row.
  bottomHalfSplit: {
    flex: SCHEDULE_SPLIT_FLEX,
  },
});

export default RadioPlayerScreen;
