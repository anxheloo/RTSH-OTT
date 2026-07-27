/**
 * TVNavButton — TV/STB-only header control. A menu button that opens a left
 * drawer listing the four tab routes (Kreu / Guida / Kërko / Profili), so a
 * viewer can switch sections straight from the header with the D-pad instead of
 * driving focus all the way down to the bottom tab bar.
 *
 * Returns null off-TV — phone/tablet keep the bottom tabs only, unchanged — and
 * while unauthenticated, since the `(auth)` screens share `BrandHeader` but the
 * four routes it lists sit behind the auth guard. Each
 * tab screen's `BrandHeader` renders one; only the active screen's is mounted,
 * so its drawer is the one in play (no shared state needed). Selecting a route
 * navigates and closes; the remote Back key closes it too.
 */
import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SvgProps } from 'react-native-svg';

import { type Href, router, usePathname } from 'expo-router';

import { BORDERRADIUS } from '@/theme/borders';
import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import ReusableText from '@/components/Inputs/ReusableText';
import { CloseIcon, GridIcon, GuideIcon, HomeIcon, ProfileIcon, SearchIcon } from '@/assets/icons';
import { isTV, tvFocusHighlight, TVFocusZone, useTVFocus } from '@/tv';

type NavRoute = {
  key: string;
  href: Href;
  /** Resolved pathname for the active check (groups stripped). */
  match: string;
  icon: React.FC<SvgProps>;
  label: string;
};

type NavItemProps = {
  route: NavRoute;
  active: boolean;
  preferred: boolean;
  onSelect: (href: Href) => void;
};

/** One route row in the drawer. Own component so each tracks D-pad focus. */
const NavItem: React.FC<NavItemProps> = ({ route, active, preferred, onSelect }) => {
  const colors = useAppStore((s) => s.colors);
  const { focused, focusProps } = useTVFocus();
  return (
    <TouchableOpacity
      {...focusProps}
      hasTVPreferredFocus={preferred}
      style={[
        styles.item,
        focused && {
          backgroundColor: colors.surfaceHigh,
          borderLeftWidth: 4,
          borderLeftColor: colors.focus,
        },
      ]}
      onPress={() => onSelect(route.href)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={`tv-nav-${route.key}`}
    >
      <Icon as={route.icon} size={24} color={active ? colors.primary : colors.text} />
      <ReusableText
        variant="body"
        fontWeight={active ? 'bold' : 'medium'}
        themeColor={active ? 'primary' : 'text'}
      >
        {route.label}
      </ReusableText>
    </TouchableOpacity>
  );
};

const TVNavButton: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerFocus = useTVFocus();
  const closeFocus = useTVFocus();

  // Off-TV, and on the (auth) stack, there is nothing to navigate to — the four
  // routes it lists all live behind the auth guard.
  if (!isTV || !isAuthenticated) return null;

  const routes: NavRoute[] = [
    { key: 'home', href: '/(app)/(tabs)', match: '/', icon: HomeIcon, label: t('nav.home') },
    { key: 'guide', href: '/(app)/(tabs)/guide', match: '/guide', icon: GuideIcon, label: t('nav.guide') },
    { key: 'search', href: '/(app)/(tabs)/search', match: '/search', icon: SearchIcon, label: t('nav.search') },
    { key: 'profile', href: '/(app)/(tabs)/profile', match: '/profile', icon: ProfileIcon, label: t('nav.profile') },
  ];
  const activeKey = routes.find((r) => r.match === pathname)?.key ?? 'home';

  const onSelect = (href: Href) => {
    setOpen(false);
    router.navigate(href);
  };

  return (
    <>
      <TouchableOpacity
        {...triggerFocus.focusProps}
        style={[styles.trigger, tvFocusHighlight(colors.focus, triggerFocus.focused)]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('nav.menu')}
        testID="tv-nav-btn"
      >
        <Icon as={GridIcon} size={22} color={colors.text} />
      </TouchableOpacity>

      {/* Rendered in a Modal so it escapes BrandHeader's clipped, absolutely
          positioned box and covers the whole screen (incl. the bottom tabs). */}
      <Modal
        transparent
        visible={open}
        animationType="fade"
        statusBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.scrim}>
          <TVFocusZone
            style={[styles.drawer, { backgroundColor: colors.background }]}
            autoFocus={false}
            trapFocusUp
            trapFocusDown
            trapFocusLeft
            trapFocusRight
          >
            <View style={styles.head}>
              <ReusableText variant="heading3" themeColor="text">
                {t('nav.menu')}
              </ReusableText>
              <TouchableOpacity
                {...closeFocus.focusProps}
                style={[styles.closeBtn, tvFocusHighlight(colors.focus, closeFocus.focused)]}
                onPress={() => setOpen(false)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                testID="tv-nav-close"
              >
                <Icon as={CloseIcon} size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {routes.map((r) => (
              <NavItem
                key={r.key}
                route={r}
                active={r.key === activeKey}
                preferred={r.key === activeKey}
                onSelect={onSelect}
              />
            ))}
          </TVFocusZone>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: '32%',
    minWidth: 360,
    height: '100%',
    paddingTop: SPACING.space_24,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: SPACING.space_16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDERRADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_16,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: SPACING.space_16,
  },
});

export default TVNavButton;
