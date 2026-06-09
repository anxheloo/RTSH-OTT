/**
 * Mosaic — design screen 14 (`sMosaic`). A dense 2-column wall of channel
 * tiles (last-frame scene + LIVE badge); tapping a tile opens that channel's
 * player. Column logic mirrors Home (22.7) so the tablet pass (22.18) can widen
 * to wrapped rows. Opened from the Home header grid button.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery } from '@/api/queries';
import { MosaicTile } from '@/components/channels';
import { Icon, IconButton } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { FullScreenLoader, ScreenLayout, TabHeader } from '@/components/Layout';
import type { Channel } from '@/types/domain';
import { ChevronLeftIcon } from '@/assets/icons';

const MosaicScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const { channels, isLoading } = useChannelsQuery();

  const openChannel = (id: string) => router.push(`/(app)/channel/${id}`);

  if (isLoading && channels.length === 0) {
    return <FullScreenLoader />;
  }

  const renderTile = ({ item }: { item: Channel }) => (
    <View style={styles.tileWrapper}>
      <MosaicTile
        channelId={item.id}
        name={item.name}
        thumbnailUri={item.thumbnailUrl}
        isLive={item.isLive}
        onPress={() => openChannel(item.id)}
      />
    </View>
  );

  return (
    <ScreenLayout>
      <TabHeader
        title={t('mosaic.title')}
        isCentered
        leftAction={
          <IconButton onPress={() => router.back()} testID="mosaic-back">
            <Icon as={ChevronLeftIcon} size={22} color={colors.text} />
          </IconButton>
        }
      />
      <FlashList
        data={channels}
        renderItem={renderTile}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={
          <ReusableText
            themeColor="textMuted"
            fontWeight="medium"
            style={styles.subtitle}
          >
            {t('mosaic.subtitle')}
          </ReusableText>
        }
        ItemSeparatorComponent={() => <View style={styles.rowGap} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="mosaic-grid"
      />
    </ScreenLayout>
  );
};

export default MosaicScreen;

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SPACING.space_15,
    paddingBottom: SPACING.space_24,
  },
  subtitle: {
    paddingHorizontal: SPACING.space_8,
    paddingBottom: SPACING.space_10,
  },
  tileWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.space_4,
  },
  rowGap: {
    height: SPACING.space_10,
  },
});
