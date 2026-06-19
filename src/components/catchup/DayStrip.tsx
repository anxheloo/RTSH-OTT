/**
 * DayStrip — horizontal catch-up day selector (design `.daystrip`). Each chip is
 * a localized weekday over a short date; the selected day gets a raised surface.
 * Oldest → today, today rightmost. Controlled; the parent owns the EPG/catch-up
 * data for the selected `CatchupDay.key`.
 *
 * Scrolls to the selected day on mount and on every selection change, keeping the
 * active chip centered. `getItemLayout` with a fixed `ITEM_WIDTH` is required for
 * `scrollToIndex` to work reliably — items must not exceed that width.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import type { CatchupDay } from '@/types/domain';

const ITEM_WIDTH = 84;

export interface DayStripProps {
  days: CatchupDay[];
  selectedKey: string;
  onSelect: (key: string) => void;
  testID?: string;
}

const DayStrip: React.FC<DayStripProps> = ({ days, selectedKey, onSelect, testID }) => {
  const colors = useAppStore((s) => s.colors);
  const listRef = useRef<FlatList<CatchupDay>>(null);

  const selectedIdx = days.findIndex((d) => d.key === selectedKey);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!listRef.current || selectedIdx < 0) return;
    listRef.current.scrollToIndex({
      index: selectedIdx,
      animated: hasMounted.current,
      viewPosition: 0.5,
    });
    hasMounted.current = true;
  }, [selectedIdx]);

  const getItemLayout = useCallback(
    (_: ArrayLike<CatchupDay> | null | undefined, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item: day }: { item: CatchupDay }) => {
      const isActive = day.key === selectedKey;
      return (
        <TouchableOpacity
          onPress={() => onSelect(day.key)}
          activeOpacity={0.7}
          style={[
            styles.day,
            { borderRightColor: colors.border },
            isActive && { backgroundColor: colors.surface },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
          testID={testID ? `${testID}-${day.key}` : undefined}
        >
          <ReusableText
            fontSize={FONTSIZE.xxs}
            themeColor={isActive ? 'text' : 'textMuted'}
            textAlign="center"
          >
            {day.weekday}
          </ReusableText>
          <ReusableText
            fontSize={FONTSIZE.sm}
            fontWeight="semiBold"
            themeColor={isActive ? 'text' : 'textMuted'}
            textAlign="center"
            style={styles.date}
          >
            {day.date}
          </ReusableText>
        </TouchableOpacity>
      );
    },
     
    [selectedKey, colors, onSelect, testID],
  );

  return (
    <View style={[styles.strip, { borderBottomColor: colors.border }]} testID={testID}>
      <FlatList
        ref={listRef}
        data={days}
        horizontal
        keyExtractor={(d) => d.key}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={selectedIdx >= 0 ? selectedIdx : 0}
        showsHorizontalScrollIndicator={false}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
          }, 50);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  day: {
    width: ITEM_WIDTH,
    paddingVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_8,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  date: {
    marginTop: SPACING.space_2,
  },
});

export default DayStrip;
