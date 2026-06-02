/**
 * Bottom tabs layout — 5 tabs: Live, EPG, Catchup, Radio, Profile.
 * Tab bar colors from theme tokens (dark-primary design).
 * Icons deferred — text-only labels until icon library is integrated.
 */
import React from 'react';

import { Tabs } from 'expo-router';

import { Fonts, FONTSIZE } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';

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
          fontSize: FONTSIZE.regular,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Live',
          tabBarAccessibilityLabel: 'tab-live',
        }}
      />
      <Tabs.Screen
        name="epg"
        options={{
          title: 'EPG',
          tabBarAccessibilityLabel: 'tab-epg',
        }}
      />
      <Tabs.Screen
        name="catchup"
        options={{
          title: 'Catchup',
          tabBarAccessibilityLabel: 'tab-catchup',
        }}
      />
      <Tabs.Screen
        name="radio"
        options={{
          title: 'Radio',
          tabBarAccessibilityLabel: 'tab-radio',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'tab-profile',
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
