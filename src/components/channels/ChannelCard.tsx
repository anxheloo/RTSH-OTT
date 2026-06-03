/**
 * ChannelCard — 2-column grid card for the Live tab.
 * Layout per Figma screen 3: thumbnail 132px tall (rounded top corners),
 * label row 40px (rounded bottom corners), channel name in the display font.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import ReusableText from '@/components/Inputs/ReusableText';
import ReusableImage from '@/components/Media/ReusableImage';

export interface ChannelCardProps {
  channelId: string;
  name: string;
  /** Channel logo / live snapshot URI. Undefined shows a placeholder bg. */
  thumbnailUri?: string;
  onPress: () => void;
}

const THUMBNAIL_HEIGHT = 132;

const ChannelCard: React.FC<ChannelCardProps> = ({ channelId, name, thumbnailUri, onPress }) => {
  const colors = useAppStore((s) => s.colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`channel-card-${channelId}`}
    >
      <View style={[styles.thumbnail, { backgroundColor: colors.videoPlaceholderBg }]}>
        {thumbnailUri ? (
          <ReusableImage
            source={thumbnailUri}
            height={THUMBNAIL_HEIGHT}
            contentFit="contain"
            testID={`channel-logo-${channelId}`}
          />
        ) : null}
      </View>

      <View style={[styles.label, { backgroundColor: colors.cardBackground }]}>
        <ReusableText
          fontSize={FONTSIZE.regular}
          themeColor="text"
          numberOfLines={1}
          style={styles.channelName}
        >
          {name}
        </ReusableText>
      </View>
    </TouchableOpacity>
  );
};

export default ChannelCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BORDERRADIUS.card,
    overflow: 'hidden',
  },
  thumbnail: {
    height: THUMBNAIL_HEIGHT,
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
  },
});
