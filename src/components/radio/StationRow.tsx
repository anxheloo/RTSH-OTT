/**
 * StationRow — a radio station row (design `.radio-item`): a rounded scene tile
 * with the radio glyph, the station name + genre, and a trailing chevron. When
 * `isActive` (the station currently playing) the chevron is replaced by a small
 * live Equalizer. Used by the radio list and the Home radio toggle.
 *
 * Presentational — the parent owns navigation via `onPress`.
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
import Equalizer from '@/components/radio/Equalizer';
import type { Channel } from '@/types/domain';
import { ChevronRightIcon, RadioIcon } from '@/assets/icons';

export interface StationRowProps {
  station: Channel;
  /** Highlights the row + shows the live Equalizer when this station is playing. */
  isActive?: boolean;
  onPress: () => void;
}

const TILE = 50;

const StationRow: React.FC<StationRowProps> = ({ station, isActive = false, onPress }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`station-row-${station.id}`}
    >
      <View style={styles.tile}>
        <SceneBackground source={station.imageUrl} />
        <Icon as={RadioIcon} size={22} color={colors.onPrimary} />
      </View>

      <View style={styles.info}>
        <ReusableText fontSize={FONTSIZE.regular} fontWeight="bold" themeColor="text" numberOfLines={1}>
          {station.name}
        </ReusableText>
      </View>

      {isActive ? (
        <Equalizer height={16} barWidth={3} testID={`station-eq-${station.id}`} />
      ) : (
        <Icon as={ChevronRightIcon} size={20} color={colors.mutedDim} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_15,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: BORDERRADIUS.radius_14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: SPACING.space_2,
  },
});

export default StationRow;
