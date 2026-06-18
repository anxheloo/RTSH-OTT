/**
 * Radio player — design `sRadioPlayer`. A back / "Po luan tani" / favourite
 * header over a scroll: the `RadioPlayer` now-playing core (art, name, eq,
 * transport) and a "Programi i radios" section.
 *
 * Playback is store-driven: mounting selects the station in `PlayerSlice`
 * (which `RadioAudioHost` turns into actual audio); the transport just flips
 * store flags. Prev / next replace the route with the adjacent station so the
 * mini-player and deep links stay in sync.
 *
 * Radio EPG gap: there is no radio schedule source yet, so the programme
 * section shows only the live-now row. Wire when a radio-EPG endpoint lands.
 */
import React, { useEffect, useMemo } from 'react';
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

/** Mirrors RadioPlayer's artwork sizing (62% width capped at 230). */
const ART_MAX = 230;

const RadioPlayerScreen: React.FC = () => {
  useCellularGate();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { formatTime } = useDateTime();

  const colors = useAppStore((s) => s.colors);
  const radioChannelId = useAppStore((s) => s.radioChannelId);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const setRadioChannel = useAppStore((s) => s.setRadioChannel);
  const setRadioPlaying = useAppStore((s) => s.setRadioPlaying);
  const showToast = useAppStore((s) => s.showToast);

  const { station, isLoading } = useRadioStationQuery(id);
  const { playback } = useChannelPlaybackQuery(id);
  const { channels: stations } = useChannelsQuery('RADIO');

  const isActive = radioChannelId === id;
  const isPlaying = isActive && radioIsPlaying;

  // Select this station in the store on entry (idempotent — skip if already live).
  // Both station metadata and playback decision must be ready before wiring the audio host.
  useEffect(() => {
    if (!station || !playback || radioChannelId === station.id) return;
    setRadioChannel({
      channelId: station.id,
      streamUrl: resolveStreamSource(playback.streams, 'auto'),
      title: station.name,
      artworkUrl: station.imageUrl,
    });
  }, [station, playback, radioChannelId, setRadioChannel]);

  const { prevId, nextId } = useMemo(() => {
    const i = stations.findIndex((s: { id: string }) => s.id === id);
    if (i === -1) return { prevId: undefined, nextId: undefined };
    return {
      prevId: i > 0 ? stations[i - 1].id : undefined,
      nextId: i < stations.length - 1 ? stations[i + 1].id : undefined,
    };
  }, [stations, id]);

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <RadioPlayer
          station={station}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onPrev={prevId ? () => router.replace(`/(app)/radio/${prevId}`) : undefined}
          onNext={nextId ? () => router.replace(`/(app)/radio/${nextId}`) : undefined}
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