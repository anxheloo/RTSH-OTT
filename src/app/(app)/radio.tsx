/**
 * Radio tab — RTSH radio stations.
 * Tapping a station sets PlayerSlice (→ RadioMiniPlayer shows) and renders
 * the inline RadioPlayer for that station.
 */
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { FONTSIZE } from '@/theme';
import { useRadioStationsQuery } from '@/api/queries';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import ReusableText from '@/components/Inputs/ReusableText';
import { FullScreenLoader, ScreenLayout, TabHeader } from '@/components/Layout';
import RadioPlayer from '@/components/Media/RadioPlayer';
import { StationRow } from '@/components/radio';
import type { RadioStation } from '@/types/domain';

const RadioScreen: React.FC = () => {
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const { stations, isLoading } = useRadioStationsQuery();

  if (isLoading && stations.length === 0 && !activeStation) {
    return <FullScreenLoader />;
  }

  if (activeStation) {
    return (
      <ScreenLayout>
        <TabHeader
          title={activeStation.name}
          leftAction={
            <TouchableOpacity
              onPress={() => setActiveStation(null)}
              activeOpacity={0.7}
              testID="radio-back-to-list"
            >
              <ReusableText fontSize={FONTSIZE.md} themeColor="primary">
                ← Lista
              </ReusableText>
            </TouchableOpacity>
          }
        />
        <RadioPlayer
          channelId={activeStation.id}
          streamUrl={activeStation.streamUrl}
          title={activeStation.name}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <TabHeader title="Radio" />
      <AnimatedFlashList
        data={stations}
        keyExtractor={(station) => station.id}
        renderItem={({ item }) => (
          <StationRow station={item} isActive={false} onPress={() => setActiveStation(item)} />
        )}
        separatorHeight={0}
      />
    </ScreenLayout>
  );
};

export default RadioScreen;
