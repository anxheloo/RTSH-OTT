/**
 * Radio tab — 13 RTSH radio stations.
 * Tapping a station sets PlayerSlice (→ RadioMiniPlayer shows) and shows
 * the inline RadioPlayer for that station.
 */
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import TabHeader from '@/components/Layout/TabHeader';
import RadioPlayer from '@/components/Media/RadioPlayer';

type RadioStation = {
  id: string;
  name: string;
  streamUrl: string;
  genre: string;
};

const RADIO_STATIONS: RadioStation[] = [
  { id: 'rtsh-radio1', name: 'RTSH Radio 1', streamUrl: 'https://stream.rtsh.al/radio1/live.m3u8', genre: 'Lajme & Muzikë' },
  { id: 'rtsh-radio2', name: 'RTSH Radio 2', streamUrl: 'https://stream.rtsh.al/radio2/live.m3u8', genre: 'Muzikë Popullore' },
  { id: 'rtsh-radio3', name: 'RTSH Radio 3', streamUrl: 'https://stream.rtsh.al/radio3/live.m3u8', genre: 'Klasike' },
  { id: 'rtsh-radiotirana', name: 'Radio Tirana', streamUrl: 'https://stream.rtsh.al/radiotirana/live.m3u8', genre: 'Lajme' },
  { id: 'rtsh-radiokorca', name: 'Radio Korça', streamUrl: 'https://stream.rtsh.al/radiokorca/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radiogjirokastres', name: 'Radio Gjirokastrës', streamUrl: 'https://stream.rtsh.al/radiogjk/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radiodurres', name: 'Radio Durrësit', streamUrl: 'https://stream.rtsh.al/radiodurres/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radiovlora', name: 'Radio Vlorës', streamUrl: 'https://stream.rtsh.al/radiovlora/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radioelbasani', name: 'Radio Elbasanit', streamUrl: 'https://stream.rtsh.al/radioelbasani/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radiofier', name: 'Radio Fierit', streamUrl: 'https://stream.rtsh.al/radiofier/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radioberat', name: 'Radio Beratit', streamUrl: 'https://stream.rtsh.al/radioberat/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radiokukes', name: 'Radio Kukësit', streamUrl: 'https://stream.rtsh.al/radiokukes/live.m3u8', genre: 'Rajonale' },
  { id: 'rtsh-radioshkoder', name: 'Radio Shkodrës', streamUrl: 'https://stream.rtsh.al/radioshkoder/live.m3u8', genre: 'Rajonale' },
];

const StationRow: React.FC<{ station: RadioStation; isActive: boolean; onPress: () => void }> = ({
  station,
  isActive,
  onPress,
}) => {
  const colors = useAppStore((s) => s.colors);
  return (
    <TouchableOpacity
      style={[
        styles.stationRow,
        {
          backgroundColor: isActive ? colors.surfaceElevated : colors.surface,
          borderLeftColor: isActive ? colors.primary : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`station-row-${station.id}`}
    >
      <View style={[styles.stationDot, { backgroundColor: isActive ? colors.primary : colors.surfaceElevated }]}>
        <ReusableText fontSize={FONTSIZE.xs} themeColor={isActive ? 'onPrimary' : 'textMuted'}>
          ♪
        </ReusableText>
      </View>
      <View style={styles.stationInfo}>
        <ReusableText fontSize={FONTSIZE.regular} themeColor="text" numberOfLines={1}>
          {station.name}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted">
          {station.genre}
        </ReusableText>
      </View>
      {isActive && (
        <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

const RadioScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);

  if (activeStation) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabHeader title="Radio" />
      {RADIO_STATIONS.map((station) => (
        <StationRow
          key={station.id}
          station={station}
          isActive={false}
          onPress={() => setActiveStation(station)}
        />
      ))}
    </View>
  );
};

export default RadioScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_12,
    borderLeftWidth: 3,
    gap: SPACING.space_12,
  },
  stationDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stationInfo: {
    flex: 1,
    gap: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});
