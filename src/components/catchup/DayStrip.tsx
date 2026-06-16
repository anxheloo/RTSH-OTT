/**
 * DayStrip — horizontal catch-up day selector (design `.daystrip`). Each chip is
 * a localized weekday over a short date; the selected day gets a raised surface.
 * Oldest → today, today rightmost. Controlled; the parent owns the EPG/catch-up
 * data for the selected `CatchupDay.key`.
 */
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import type { CatchupDay } from '@/types/domain';

export interface DayStripProps {
  days: CatchupDay[];
  selectedKey: string;
  onSelect: (key: string) => void;
  testID?: string;
}

const DayStrip: React.FC<DayStripProps> = ({ days, selectedKey, onSelect, testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View style={[styles.strip, { borderBottomColor: colors.border }]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {days.map((day) => {
          const isActive = day.key === selectedKey;
          return (
            <TouchableOpacity
              key={day.key}
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
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
  },
  day: {
    minWidth: 84,
    paddingVertical: SPACING.space_12,
    paddingHorizontal: SPACING.space_8,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  date: {
    marginTop: SPACING.space_2,
  },
});

export default DayStrip;
