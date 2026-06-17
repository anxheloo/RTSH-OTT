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
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';

import { TAB_BAR_BASE_HEIGHT, TabBar } from '@/theme/tabBar';
import { useAppStore } from '@/store/useAppStore';
import { useHaptic } from '@/hooks/useHaptic';
import { Icon } from '@/components/Icons';
import { GuideIcon, HomeIcon, ProfileIcon, SearchIcon } from '@/assets/icons';

const TabsLayout: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const mode = useAppStore((s) => s.mode);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const haptics = useHaptic();

  return (
    <Tabs
      // Discrete value change → selection haptic on each tab switch (gated on
      // settings.hapticsEnabled inside useHaptic). JS Tabs don't fire this natively.
      screenListeners={{ tabPress: () => haptics.selection() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.mutedDim,
        tabBarStyle: {
          ...TabBar.tabBarStyle,
          // Lift the floating bar above the bottom inset (home indicator / gesture area).
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopColor: colors.tabBarBorder,
        },
        tabBarLabelStyle: TabBar.tabBarLabelStyle,
        tabBarItemStyle: TabBar.tabBarItemStyle,
        tabBarIconStyle: TabBar.tabBarIconStyle,
        // iOS blurs natively. Android's blur needs a `blurTarget` ref to a
        // BlurTargetView wrapping the content BEHIND the bar — impossible from
        // `tabBarBackground` (it renders inside the navigator that owns the
        // screens), so Android gets a near-opaque solid instead of a silent
        // fallback + warning.
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint={mode === 'light' ? 'light' : 'dark'}
              intensity={40}
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarSolid }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav:home'),
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
          title: t('nav:guide'),
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
          title: t('nav:search'),
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
          title: t('nav:profile'),
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
