/**
 * Top header for tab screens. Title text with optional left / right action
 * slots. Theme-aware background + bottom border. Layout is left-aligned
 * title by default; pass `isCentered` for centered title (like iOS large
 * modal headers).
 *
 * For sticky / scroll-collapsing headers, wrap or compose in the screen.
 * This is the static row.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import type { ThemeColors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';

import ReusableText from '../Inputs/ReusableText';

export type TabHeaderProps = {
  title: string;
  /** Optional element rendered on the left (e.g. back button, menu icon). */
  leftAction?: React.ReactNode;
  /** Optional element rendered on the right (e.g. settings button, profile avatar). */
  rightAction?: React.ReactNode;
  /** Centers the title between the action slots. Default: left-aligned. */
  isCentered?: boolean;
  /** Theme background token. Defaults to `'headerBackground'`. */
  backgroundColor?: keyof ThemeColors;
  /** Theme color for the title. Defaults to `'text'`. */
  titleColor?: keyof ThemeColors;
  /** Shows the bottom hairline border. Default: true. */
  showBottomBorder?: boolean;
  /** Explicit pixel height. Defaults to 56. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TabHeader: React.FC<TabHeaderProps> = ({
  title,
  leftAction,
  rightAction,
  isCentered = false,
  backgroundColor = 'headerBackground',
  titleColor = 'text',
  showBottomBorder = true,
  height = 56,
  style,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: colors[backgroundColor],
          borderBottomWidth: showBottomBorder ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: colors.border,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.side}>{leftAction}</View>

      <View style={[styles.titleWrap, isCentered && styles.titleCentered]}>
        <ReusableText
          variant="heading3"
          themeColor={titleColor}
          textAlign={isCentered ? 'center' : 'left'}
          numberOfLines={1}
        >
          {title}
        </ReusableText>
      </View>

      <View style={[styles.side, styles.sideRight]}>{rightAction}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  side: {
    minWidth: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  titleCentered: {
    alignItems: 'center',
  },
});

export default TabHeader;
