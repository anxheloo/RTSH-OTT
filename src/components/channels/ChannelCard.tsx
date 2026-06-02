/**
 * ChannelCard — 2-column grid card for the Live tab.
 * Layout per Figma screen 3: image 132px tall (rounded top corners),
 * label row 40px (rounded bottom corners, #141414 bg), channel name Anton 14px.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';

export type ChannelCardProps = {
  channelId: string;
  name: string;
  /** Thumbnail / live snapshot URI. Undefined shows a placeholder bg. */
  thumbnailUri?: string;
  onPress: () => void;
};

const ChannelCard: React.FC<ChannelCardProps> = ({ channelId, name, thumbnailUri: _thumbnailUri, onPress }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`channel-card-${channelId}`}
    >
      {/* Thumbnail area */}
      <View style={[styles.thumbnail, { backgroundColor: colors.videoPlaceholderBg }]} />

      {/* Label row */}
      <View style={[styles.label, { backgroundColor: colors.cardBackground }]}>
        <ReusableText
          fontSize={FONTSIZE.regular}
          numberOfLines={1}
          style={styles.channelName}
        >
          {name}
        </ReusableText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BORDERRADIUS.card,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 132,
    borderTopLeftRadius: BORDERRADIUS.card,
    borderTopRightRadius: BORDERRADIUS.card,
  },
  label: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: SPACING.space_10,
    borderBottomLeftRadius: BORDERRADIUS.card,
    borderBottomRightRadius: BORDERRADIUS.card,
  },
  channelName: {
    fontFamily: Fonts.display,
    color: '#FFFFFF',
  },
});

export default ChannelCard;
