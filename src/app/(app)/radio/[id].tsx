/**
 * Radio player — design `sRadioPlayer`. A back / "Po luan tani" / favourite
 * header over a scroll: the `RadioPlayer` now-playing core (art, name, eq,
 * transport) and a "Programi i radios" section.
 *
 * Playback is store-driven: mounting selects the station in `PlayerSlice`
 * (which `RadioAudioHost` turns into actual audio); the transport just flips
 * store flags. Prev / next swap the station in place (local `activeId` state,
 * no navigation) so there's no screen-slide. Closing from the mini-player
 * (anywhere) clears the store, which this screen watches to `router.back()`.
 *
 * Radio EPG gap: there is no radio schedule source yet, so the programme
 * section shows only the live-now row. Wire when a radio-EPG endpoint lands.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { router, useLocalSearchParams } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelPlaybackQuery, useChannelsQuery, useRadioStationQuery } from '@/api/queries';
import { useCellularGate } from '@/hooks/useCellularGate';
import { useDateTime } from '@/hooks/useDateTime';
import { ProgramRow } from '@/components/epg';
import { Icon, IconButton } from '@/components/Icons';
import { ScreenLayout, SectionHeader, Skeleton, TabHeader } from '@/components/Layout';
import RadioPlayer from '@/components/Media/RadioPlayer';
import { resolveStreamSource } from '@/utils';
import { ChevronLeftIcon, StarIcon } from '@/assets/icons';
import { useContentWidth } from '@/responsive';

/** Mirrors RadioPlayer's artwork sizing (62% width capped at 230). */
const ART_MAX = 230;

const RadioPlayerScreen: React.FC = () => {
  useCellularGate();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { formatTime } = useDateTime();

  const colors = useAppStore((s) => s.colors);
  // Center the now-playing column on tablet/TV; no-op on phone.
  const contentWidth = useContentWidth('content');
  const radioChannelId = useAppStore((s) => s.radioChannelId);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const setRadioChannel = useAppStore((s) => s.setRadioChannel);
  const setRadioPlaying = useAppStore((s) => s.setRadioPlaying);
  const showToast = useAppStore((s) => s.showToast);

  // The URL param only seeds the screen; prev/next swap the station in place
  // (no navigation), so the displayed station lives in local state.
  const [activeId, setActiveId] = useState(id);

  const { station, isLoading } = useRadioStationQuery(activeId);
  const { playback } = useChannelPlaybackQuery(activeId);
  const { channels: stations } = useChannelsQuery('RADIO');

  const isActive = radioChannelId === activeId;
  const isPlaying = isActive && radioIsPlaying;

  // Select the active station in the store once per `activeId` (entry + prev/next).
  // A ref guard keeps a store clear (mini-player close) from re-selecting it.
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!station || !playback || selectedRef.current === activeId) return;
    selectedRef.current = activeId;
    setRadioChannel({
      channelId: station.id,
      streamUrl: resolveStreamSource(playback.streams, 'auto'),
      title: station.name,
      artworkUrl: station.imageUrl,
    });
  }, [station, playback, activeId, setRadioChannel]);

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

  if (isLoading && !station) {
    return (
      <ScreenLayout>
        <TabHeader
          title={t('radio.now_playing')}
          isCentered
          leftAction={
            <IconButton onPress={() => router.back()} testID="radio-player-back">
              <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
            </IconButton>
          }
        />
        <View style={styles.skeletonBody} testID="radio-player-skeleton">
          <Skeleton borderRadius={BORDERRADIUS.radius_20} style={styles.skeletonArt} />
          <Skeleton width={150} height={FONTSIZE.lg} />
          <Skeleton width={90} height={FONTSIZE.sm} />
        </View>
      </ScreenLayout>
    );
  }

  if (!station) {
    return (
      <ScreenLayout>
        <TabHeader
          title={t('radio.now_playing')}
          isCentered
          leftAction={
            <IconButton onPress={() => router.back()} testID="radio-player-back">
              <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
            </IconButton>
          }
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <TabHeader
        title={t('radio.now_playing')}
        isCentered
        leftAction={
          <IconButton onPress={() => router.back()} testID="radio-player-back">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        }
        rightAction={
          <IconButton
            onPress={() => showToast(t('radio.favorite_soon'))}
            testID="radio-player-favorite"
          >
            <Icon as={StarIcon} size={20} color={colors.text} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, contentWidth]}
        showsVerticalScrollIndicator={false}
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

        <View style={styles.programs}>
          <SectionHeader title={t('radio.program')} />
          <ProgramRow
            title={station.name}
            meta={t('radio.live_now')}
            time={formatTime(new Date().toISOString())}
            state="now"
            onPress={togglePlay}
            testID="radio-program-now"
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: SPACING.space_40,
  },
  programs: {
    paddingTop: SPACING.space_24,
  },
  skeletonBody: {
    alignItems: 'center',
    paddingTop: SPACING.space_24,
    gap: SPACING.space_12,
  },
  skeletonArt: {
    width: '62%',
    maxWidth: ART_MAX,
    aspectRatio: 1,
  },
});

export default RadioPlayerScreen;