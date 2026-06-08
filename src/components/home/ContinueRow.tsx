/**
 * ContinueRow — horizontal "Vazhdo të shikosh" rail (design `.hrow`) of
 * `ContinueCard`s. Renders nothing when empty so the section header can be
 * hidden by the parent. Theme-agnostic layout; cards own their visuals.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { SPACING } from '@/theme/spacing';
import type { ContinueItem } from '@/types/domain';

import ContinueCard from './ContinueCard';

export interface ContinueRowProps {
  items: ContinueItem[];
  onPressItem: (channelId: string) => void;
  testID?: string;
}

const ContinueRow: React.FC<ContinueRowProps> = ({ items, onPressItem, testID }) => {
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      testID={testID}
    >
      {items.map((item) => (
        <ContinueCard key={item.id} item={item} onPress={() => onPressItem(item.channelId)} />
      ))}
    </ScrollView>
  );
};

export default ContinueRow;

const styles = StyleSheet.create({
  content: {
    gap: SPACING.space_12,
    paddingHorizontal: SPACING.space_18,
    paddingBottom: SPACING.space_4,
  },
});
