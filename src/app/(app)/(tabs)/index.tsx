/**
 * Live tab — home screen showing RTSH TV channel grid.
 * Layout per Figma screen 3 (2026-06-02).
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { BORDERRADIUS, FONTSIZE, SPACING } from '@/theme';
import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery } from '@/api/queries';
import { BrandHeader } from '@/components/Brand';
import ChannelCard from '@/components/channels/ChannelCard';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { FullScreenLoader, ScreenLayout } from '@/components/Layout';
import type { Channel } from '@/types/domain';
import { ProfileIcon } from '@/assets/icons';

type ContentTab = 'search' | 'tv' | 'radio';

const LiveScreen: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const isOnline = useAppStore((s) => s.isOnline);
  const [activeTab, setActiveTab] = useState<ContentTab>('tv');
  const { channels, isLoading } = useChannelsQuery();

  // Only block on the loader while a fetch can actually progress. Offline with
  // no cached data, the query stays paused/pending — render the (empty) grid
  // instead of an infinite spinner; the no-internet modal explains why.
  if (isLoading && channels.length === 0 && isOnline) {
    return <FullScreenLoader />;
  }

  const renderChannel = ({ item }: { item: Channel }) => (
    <View style={styles.cardWrapper}>
      <ChannelCard
        channelId={item.id}
        name={item.name}
        thumbnailUri={item.logoUrl}
        onPress={() => router.push(`/(app)/channel/${item.id}`)}
      />
    </View>
  );

  return (
    <ScreenLayout>
      {/* Header */}
      <BrandHeader
        testID="live-header"
        rightSlot={
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => {}}
            activeOpacity={0.8}
            testID="live-header-avatar"
          >
            <Icon as={ProfileIcon} size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Content toggle row */}
      <View style={[styles.toggleRow, { backgroundColor: colors.background }]}>
        <ContentToggle
          label="Search"
          tabKey="search"
          activeTab={activeTab}
          onPress={setActiveTab}
          colors={colors}
        />
        <ContentToggle
          label="Televizion"
          tabKey="tv"
          activeTab={activeTab}
          onPress={setActiveTab}
          colors={colors}
        />
        <ContentToggle
          label="Radio"
          tabKey="radio"
          activeTab={activeTab}
          onPress={setActiveTab}
          colors={colors}
        />
      </View>

      {/* Channel grid — FlashList v2, 2-column, spacing via item margins + separator */}
      <FlashList
        data={channels}
        renderItem={renderChannel}
        keyExtractor={(item: Channel) => item.id}
        numColumns={2}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.space_10 }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="live-channel-grid"
      />
    </ScreenLayout>
  );
};

type ContentToggleProps = {
  label: string;
  tabKey: ContentTab;
  activeTab: ContentTab;
  onPress: (tab: ContentTab) => void;
  colors: ReturnType<typeof useAppStore.getState>['colors'];
};

const ContentToggle: React.FC<ContentToggleProps> = ({ label, tabKey, activeTab, onPress, colors }) => {
  const isActive = activeTab === tabKey;

  return (
    <TouchableOpacity
      style={[
        styles.toggle,
        {
          backgroundColor: isActive ? colors.surfaceElevated : colors.surface,
        },
      ]}
      onPress={() => onPress(tabKey)}
      activeOpacity={0.8}
      testID={`live-toggle-${tabKey}`}
    >
      <ReusableText
        fontSize={FONTSIZE.regular}
        style={{
          fontFamily: Fonts.display,
          color: isActive ? colors.text : colors.textMuted,
        }}
      >
        {label}
      </ReusableText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.space_8,
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_10,
  },
  toggle: {
    height: 56,
    paddingHorizontal: SPACING.space_16,
    borderRadius: BORDERRADIUS.pill_sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.space_15,
    paddingTop: SPACING.space_10,
    paddingBottom: SPACING.space_24,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 5,
  },
});

export default LiveScreen;
