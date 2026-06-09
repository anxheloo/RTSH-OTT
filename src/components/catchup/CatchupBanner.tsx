/**
 * CatchupBanner — red-tinted notice shown above the programme list when a past
 * day is selected (design `.cubanner`): a clock glyph + "Catch-up · <day> —
 * recorded programmes". Presentational; the parent composes the label.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { ClockIcon } from '@/assets/icons';

export interface CatchupBannerProps {
  label: string;
  testID?: string;
}

const CatchupBanner: React.FC<CatchupBannerProps> = ({ label, testID }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}
      testID={testID}
    >
      <Icon as={ClockIcon} size={14} color={colors.primary} />
      <ReusableText fontSize={FONTSIZE.xs} themeColor="primary" numberOfLines={2} style={styles.text}>
        {label}
      </ReusableText>
    </View>
  );
};

export default CatchupBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_8,
    marginHorizontal: SPACING.space_18,
    marginTop: SPACING.space_12,
    paddingHorizontal: SPACING.space_12,
    paddingVertical: SPACING.space_8,
    borderRadius: BORDERRADIUS.radius_12,
    borderWidth: 1,
  },
  text: {
    flex: 1,
  },
});
