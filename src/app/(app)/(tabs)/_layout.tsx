/**
 * Bottom tabs — 4 tabs per the design: Kreu (home), Guida (guide), Kërko
 * (search), Profili (profile). Radio folds into the Home toggle + radio routes;
 * catch-up folds into the player day-strip (Phase 22.4).
 *
 * Config-driven (SOLITAR pattern): static layout/typography from `theme/tabBar`,
 * dynamic colors injected here. Frosted background via `expo-blur`. Active state
 * tints the ICON red while the LABEL stays white (decoupled): the icon color is
 * driven by `focused`, the label by `tabBarActiveTintColor`.
 */
import React from 'react';
import { StyleSheet } from 'react-native';

import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';

import { TabBar } from '@/theme/tabBar';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import { GuideIcon, HomeIcon, ProfileIcon, SearchIcon } from '@/assets/icons';

const TabsLayout: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const mode = useAppStore((s) => s.mode);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.mutedDim,
        tabBarStyle: { ...TabBar.tabBarStyle, borderTopColor: colors.tabBarBorder },
        tabBarLabelStyle: TabBar.tabBarLabelStyle,
        tabBarItemStyle: TabBar.tabBarItemStyle,
        tabBarBackground: () => (
          <BlurView
            tint={mode === 'light' ? 'light' : 'dark'}
            intensity={24}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kreu',
          tabBarAccessibilityLabel: 'tab-home',
          tabBarIcon: ({ focused }) => (
            <Icon
              as={HomeIcon}
              size={TabBar.iconSize}
              color={focused ? colors.primary : colors.mutedDim}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Guida',
          tabBarAccessibilityLabel: 'tab-guide',
          tabBarIcon: ({ focused }) => (
            <Icon
              as={GuideIcon}
              size={TabBar.iconSize}
              color={focused ? colors.primary : colors.mutedDim}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Kërko',
          tabBarAccessibilityLabel: 'tab-search',
          tabBarIcon: ({ focused }) => (
            <Icon
              as={SearchIcon}
              size={TabBar.iconSize}
              color={focused ? colors.primary : colors.mutedDim}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profili',
          tabBarAccessibilityLabel: 'tab-profile',
          tabBarIcon: ({ focused }) => (
            <Icon
              as={ProfileIcon}
              size={TabBar.iconSize}
              color={focused ? colors.primary : colors.mutedDim}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
