/**
 * SearchResultRow — a channel search result (design `.radio-item` + `.srch-thumb`):
 * a wide rounded scene thumb with the channel's short logo label, the channel
 * name + a muted meta line, and a trailing chevron. List counterpart of the
 * Home grid's ChannelCard, mirroring StationRow / GuideRow.
 *
 * Presentational — the parent composes `meta` and supplies `onPress`.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import SceneBackground from '@/components/Media/SceneBackground';
import { ChevronRightIcon } from '@/assets/icons';

export interface SearchResultRowProps {
  name: string;
  /** Muted secondary line (design "1080i · TV · HD"). */
  meta: string;
  thumbnailUri?: string;
  /** Short label drawn on the thumb (design `.clogo`). Defaults to `name`. */
  logoLabel?: string;
  onPress: () => void;
  testID?: string;
}

const THUMB_WIDTH = 78;
const THUMB_HEIGHT = 46;

const SearchResultRow: React.FC<SearchResultRowProps> = ({
  name,
  meta,
  thumbnailUri,
  logoLabel,
  onPress,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.thumb}>
        <SceneBackground source={thumbnailUri} />
        <ReusableText fontSize={FONTSIZE.xxs} fontWeight="black" themeColor="onPrimary">
          {logoLabel ?? name}
        </ReusableText>
      </View>

      <View style={styles.info}>
        <ReusableText fontSize={FONTSIZE.regular} fontWeight="bold" themeColor="text" numberOfLines={1}>
          {name}
        </ReusableText>
        <ReusableText fontSize={FONTSIZE.sm} themeColor="textMuted" numberOfLines={1} style={styles.meta}>
          {meta}
        </ReusableText>
      </View>

      <Icon as={ChevronRightIcon} size={20} color={colors.mutedDim} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_12,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: BORDERRADIUS.radius_12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  meta: {
    marginTop: SPACING.space_2,
  },
});

export default SearchResultRow;
