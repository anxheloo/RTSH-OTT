/**
 * Bottom tabs layout — 5 tabs: Live, EPG, Catchup, Radio, Profile.
 * Tab bar colors from theme tokens; SVG icons recolor via the tab tint.
 */
import React from 'react';

import { Tabs } from 'expo-router';

import { Fonts, FONTSIZE } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import {
  ClockIcon,
  HomeIcon,
  LayersIcon,
  MicrophoneIcon,
  ProfileIcon,
} from '@/components/Icons';

const TAB_ICON_SIZE = 24;

const TabsLayout: React.FC = () => {
  const colors = useAppStore((s) => s.colors);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Fonts.display,
          fontSize: FONTSIZE.xs,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Live',
          tabBarAccessibilityLabel: 'tab-live',
          tabBarIcon: ({ color }) => <HomeIcon size={TAB_ICON_SIZE} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="epg"
        options={{
          title: 'EPG',
          tabBarAccessibilityLabel: 'tab-epg',
          tabBarIcon: ({ color }) => <ClockIcon size={TAB_ICON_SIZE} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="catchup"
        options={{
          title: 'Catchup',
          tabBarAccessibilityLabel: 'tab-catchup',
          tabBarIcon: ({ color }) => <LayersIcon size={TAB_ICON_SIZE} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="radio"
        options={{
          title: 'Radio',
          tabBarAccessibilityLabel: 'tab-radio',
          tabBarIcon: ({ color }) => <MicrophoneIcon size={TAB_ICON_SIZE} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'tab-profile',
          tabBarIcon: ({ color }) => <ProfileIcon size={TAB_ICON_SIZE} color={color as string} />,
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
