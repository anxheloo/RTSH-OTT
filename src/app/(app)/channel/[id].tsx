/**
 * Channel screen — design `sPlayer`. A portrait layout: an inline 16:9 live
 * player at the top, a catch-up day strip (today + 7 days back), then the
 * EPG / catch-up programme list for the selected day. Selecting today shows the
 * live EPG (currently-airing highlighted); a past day shows recorded programmes
 * under a catch-up banner. Fullscreen is owned here — it expands the player to
 * cover the screen and locks landscape.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

import { PLAYER_COLORS } from '@/theme/playerColors';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelQuery, useChannelStreamQuery, useEpgQuery } from '@/api/queries';
import { useCellularGate } from '@/hooks/useCellularGate';
import { useDateTime } from '@/hooks/useDateTime';
import { useLiveParentalGuard } from '@/hooks/useLiveParentalGuard';
import { CatchupBanner, DayStrip } from '@/components/catchup';
import { ProgramRow } from '@/components/epg';
import type { ProgramRowState } from '@/components/epg/ProgramRow';
import { Icon, IconButton } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { CenteredMessage, FullScreenLoader, ScreenLayout, TabHeader } from '@/components/Layout';
import LivePlayer from '@/components/Media/LivePlayer';
import { ParentalPinModal } from '@/components/ParentalPin';
import { availableQualityIds, resolveStreamSource } from '@/utils';
import type { CatchupDay, EpgItem } from '@/types/domain';
import { ChevronLeftIcon, GlobeIcon, LockIcon } from '@/assets/icons';

const CATCHUP_DAYS_BACK = 7;

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

  const { stream, isLoading: streamLoading } = useChannelStreamQuery(channelId);
  const { channel } = useChannelQuery(channelId);

  // Quality: `videoQuality` is the active (session) pick; on mount we seed it from
  // the persisted `defaultQuality` preference (closes plan gap 1). The resolver
  // maps it + the manifest to the URL to play; `auto` prefers the master (native
  // ABR) and degrades gracefully to a single source.
  const videoQuality = useAppStore((s) => s.videoQuality);
  const defaultQuality = useAppStore((s) => s.defaultQuality);
  const setVideoQuality = useAppStore((s) => s.setVideoQuality);
  const setAvailableQualities = useAppStore((s) => s.setAvailableQualities);

  useEffect(() => {
    setVideoQuality(defaultQuality);
    // Seed once per channel open; intentionally not reacting to defaultQuality changes mid-watch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Publish the stream's selectable renditions so the quality sheet only offers
  // qualities this stream actually provides (Auto-only when there are none).
  useEffect(() => {
    setAvailableQualities(availableQualityIds(stream));
    return () => setAvailableQualities([]);
  }, [stream, setAvailableQualities]);

  const streamSource = stream ? resolveStreamSource(stream, videoQuality) : '';

  const [nowMs] = useState(() => Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);

  // Content gates (22.14). Geo → block the channel inline; adult-flagged
  // channel → PIN before play (cancel leaves the channel). Live program-level
  // re-check is 22.14c. `geoBlocked` keys on the channel flag today; real
  // trigger is the streams/CDN geo error (451 / GEO_BLOCKED) — see plan 15.2.
  const geoBlocked = !!channel?.geoBlocked;
  const needsPin = !!channel?.isAdult && !pinUnlocked;

  // Live program-level re-check (22.14c). Only for *clean* channels — an
  // adult-flagged channel is already covered by the channel-level gate above,
  // so we disable the live guard there to avoid double-prompting.
  const live = useLiveParentalGuard(channelId, {
    enabled: !channel?.isAdult && !geoBlocked,
  });
  const blockPlayer = needsPin || live.isBlocked;
  // Blocked mid-watch and the user dismissed the prompt → keep the player
  // blocked but offer a way back in (not a dead end).
  const liveBlockedDismissed = live.isBlocked && !live.showPrompt;

  // Day strip — oldest → today (today rightmost). Built at local noon so the
  // localized weekday/date never slips across the day boundary by timezone.
  const days = useMemo<CatchupDay[]>(() => {
    const out: CatchupDay[] = [];
    const today = new Date();
    for (let i = CATCHUP_DAYS_BACK; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
      const isToday = i === 0;
      out.push({
        key: toDateKey(d),
        weekday: isToday ? t('datetime.today') : formatWeekday(d.toISOString(), 'short'),
        date: formatDate(d.toISOString(), { day: '2-digit', month: '2-digit' }),
        isToday,
      });
    }
    return out;
  }, [formatWeekday, formatDate, t]);

  const [selectedKey, setSelectedKey] = useState(() => days[days.length - 1].key);
  const selectedDay = days.find((d) => d.key === selectedKey) ?? days[days.length - 1];

  const { items: epg } = useEpgQuery(selectedKey);
  const programs = useMemo(
    () =>
      epg
        .filter((e) => e.channelId === channelId)
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    [epg, channelId],
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
    if (!selectedDay.isToday) return 'recorded';
    const airing = p.isLive ?? (nowMs >= Date.parse(p.startTime) && nowMs < Date.parse(p.endTime));
    return airing ? 'now' : 'scheduled';
  };

  const openProgram = (p: EpgItem, state: ProgramRowState) => {
    // Only recorded (catch-up) rows are playable from here; the live row is
    // already on screen and scheduled rows haven't aired.
    if (state === 'recorded') router.push(`/(app)/program/${p.id}`);
  };

  // Geo-restricted — block the channel inline (design `sGeo`) instead of playing.
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

  if (streamLoading) {
    return <FullScreenLoader />;
  }

  // Block playback while gated (channel-level adult, or a live adult programme).
  // The player is unmounted — never just hidden — so no audio/video leaks behind
  // the gate. When the live prompt was dismissed, show a re-unlock affordance.
  const player = blockPlayer ? (
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
      streamHeaders={stream?.headers}
      channelName={channel?.name ?? channelId}
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
        {!selectedDay.isToday ? (
          <CatchupBanner label={t('catchup.banner', { day: dayLabel })} testID="catchup-banner" />
        ) : null}

        <ReusableText variant="bodySmall" fontWeight="extraBold" style={styles.epgHeader}>
          {selectedDay.isToday ? t('catchup.epg') : t('catchup.catchup_for', { day: dayLabel })}
        </ReusableText>

        {programs.map((p) => {
          const state = programState(p);
          return (
            <ProgramRow
              key={p.id}
              title={p.title}
              meta={p.description}
              time={formatTime(p.startTime)}
              state={state}
              onPress={() => openProgram(p, state)}
              testID={`epg-row-${p.id}`}
            />
          );
        })}
      </ScrollView>

      <ParentalPinModal
        visible={needsPin || live.showPrompt}
        mode="verify"
        onSuccess={needsPin ? () => setPinUnlocked(true) : live.onVerified}
        onDismiss={needsPin ? () => router.back() : live.onDismiss}
      />
    </ScreenLayout>
  );
};

export default ChannelScreen;

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
  scroll: {
    paddingBottom: SPACING.space_24,
  },
  epgHeader: {
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.space_18,
    paddingTop: SPACING.space_16,
    paddingBottom: SPACING.space_4,
  },
});
