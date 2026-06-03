/**
 * EPG tab — Electronic Programme Guide.
 * Fetches today's EPG from the mock/API via useEpgQuery.
 * ISO startTime/endTime formatted to HH:MM using Albanian locale.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FONTSIZE, SPACING } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useEpgQuery } from '@/api/queries';
import AnimatedFlashList from '@/components/AnimatedFlashList';
import { EmptyEpgState } from '@/components/empty';
import ReusableText from '@/components/Inputs/ReusableText';
import { FullScreenLoader } from '@/components/Layout';
import TabHeader from '@/components/Layout/TabHeader';
import type { EpgItem } from '@/types/domain';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sq-AL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const EpgRow: React.FC<{ item: EpgItem }> = ({ item }) => {
  const colors = useAppStore((s) => s.colors);
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={[styles.timeBadge, { backgroundColor: colors.surfaceElevated }]}>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" textAlign="center">
          {formatTime(item.startTime)}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.xs} themeColor="textMuted" textAlign="center">
          {formatTime(item.endTime)}
        </ReusableText>
      </View>
      <View style={styles.rowInfo}>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1}>
          {item.channelName}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.regular} themeColor="text" numberOfLines={2}>
          {item.title}
        </ReusableText>
      </View>
    </View>
  );
};

const EpgScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const { items, isLoading } = useEpgQuery();

  if (isLoading && items.length === 0) {
    return <FullScreenLoader />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TabHeader title="EPG" />
      <AnimatedFlashList
        data={items}
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
