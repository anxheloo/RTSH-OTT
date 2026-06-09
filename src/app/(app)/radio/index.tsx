/**
 * Radio list — design `sRadioList`. The full radio station catalogue: a back
 * header and a scrollable list of `StationRow`s. Tapping a station opens its
 * player route; the currently-playing station shows a live Equalizer in-row.
 * Audio itself is owned by `RadioAudioHost` (above the router), so leaving this
 * screen never stops playback.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useRadioStationsQuery } from '@/api/queries';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import { Icon, IconButton } from '@/components/Icons';
import { FullScreenLoader, ScreenLayout, TabHeader } from '@/components/Layout';
import { StationRow } from '@/components/radio';
import { ChevronLeftIcon } from '@/assets/icons';

const RadioListScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const activeStationId = useAppStore((s) => s.radioChannelId);
  const { stations, isLoading } = useRadioStationsQuery();

  if (isLoading && stations.length === 0) {
    return <FullScreenLoader />;
  }

  return (
    <ScreenLayout>
      <TabHeader
        title={t('radio.title')}
        isCentered
        leftAction={
          <IconButton onPress={() => router.back()} testID="radio-list-back">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        }
      />
      <AnimatedFlashList
        data={stations}
        keyExtractor={(station) => station.id}
        renderItem={({ item }) => (
          <StationRow
            station={item}
            isActive={item.id === activeStationId}
            onPress={() => router.push(`/(app)/radio/${item.id}`)}
          />
        )}
        separatorHeight={0}
      />
    </ScreenLayout>
  );
};

export default RadioListScreen;
