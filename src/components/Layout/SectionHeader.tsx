/**
 * SectionHeader — row title with an optional trailing action link (design
 * `sec-h`): "Kanalet TV … Guida", "Vazhdo të shikosh", "Stacionet Radio".
 * Title is 17/700; the action is a muted 13/600 link. Theme-tokened, portable.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import ReusableText from '@/components/Inputs/ReusableText';

export interface SectionHeaderProps {
  title: string;
  /** Trailing link label (e.g. "Guida"). Omit for a title-only header. */
  actionLabel?: string;
  onActionPress?: () => void;
  testID?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onActionPress,
  testID,
}) => (
  <View style={styles.row} testID={testID}>
    <ReusableText variant="heading3">{title}</ReusableText>
    {actionLabel ? (
      <TouchableOpacity
        onPress={onActionPress}
        activeOpacity={0.7}
        testID={testID ? `${testID}-action` : undefined}
      >
        <ReusableText variant="label" themeColor="textMuted">
          {actionLabel}
        </ReusableText>
      </TouchableOpacity>
    ) : null}
  </View>
);

export default SectionHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_20,
    paddingBottom: SPACING.space_10,
  },
});
