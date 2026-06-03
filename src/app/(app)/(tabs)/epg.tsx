/**
 * EPG tab — Electronic Programme Guide.
 * Placeholder data until 5.X.1 (domain types) + 5.X.3 (query hooks) land.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import { EmptyEpgState } from '@/components/empty';
import ReusableText from '@/components/Inputs/ReusableText';
import TabHeader from '@/components/Layout/TabHeader';

type EpgItem = {
  id: string;
  channelName: string;
  programTitle: string;
  startTime: string;
  endTime: string;
};

const PLACEHOLDER_EPG: EpgItem[] = [
  { id: '1', channelName: 'RTSH 1 HD', programTitle: 'Lajmet', startTime: '18:00', endTime: '18:30' },
  { id: '2', channelName: 'RTSH 1 HD', programTitle: 'Debat', startTime: '18:30', endTime: '19:30' },
  { id: '3', channelName: 'RTSH 2', programTitle: 'Dokumentar', startTime: '18:00', endTime: '19:00' },
  { id: '4', channelName: 'RTSH 24', programTitle: 'Kronikë', startTime: '18:00', endTime: '18:20' },
  { id: '5', channelName: 'RTSH Sport HD', programTitle: 'Sport Live', startTime: '19:00', endTime: '21:00' },
  { id: '6', channelName: 'RTSH Muzikë', programTitle: 'Muzikë Shqiptare', startTime: '18:00', endTime: '20:00' },
  { id: '7', channelName: 'RTSH Fëmijë', programTitle: 'Seriale Fëmijësh', startTime: '17:00', endTime: '19:00' },
  { id: '8', channelName: 'RTSH 3', programTitle: 'Film', startTime: '20:00', endTime: '22:00' },
];

const EpgRow: React.FC<{ item: EpgItem }> = ({ item }) => {
  const colors = useAppStore((s) => s.colors);
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={[styles.timeBadge, { backgroundColor: colors.surfaceElevated }]}>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" textAlign="center">
          {item.startTime}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" textAlign="center">
          {item.endTime}
        </ReusableText>
      </View>
      <View style={styles.rowInfo}>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1}>
          {item.channelName}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.regular} themeColor="text" numberOfLines={2}>
          {item.programTitle}
        </ReusableText>
      </View>
    </View>
  );
};

const EpgScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabHeader title="EPG" />
      <AnimatedFlashList
        data={PLACEHOLDER_EPG}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EpgRow item={item} />}
        emptyComponent={<EmptyEpgState />}
        separatorHeight={1}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

export default EpgScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
  },
  row: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 64,
  },
  timeBadge: {
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.space_10,
  },
  rowInfo: {
    flex: 1,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_10,
    justifyContent: 'center',
    gap: 4,
  },
});
