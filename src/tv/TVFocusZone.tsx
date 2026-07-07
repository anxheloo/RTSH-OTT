/**
 * Focus coordinator for a region on TV — wraps children in a
 * `TVFocusGuideView` so the D-pad focus engine (a) redirects to the first
 * focusable child on entry and remembers the last focused child (`autoFocus`),
 * and (b) can trap focus inside the region (modals / overlays via `trapFocus*`).
 *
 * Mobile-inert: off-TV it renders a bare fragment (no extra view, no style), so
 * the phone/tablet tree is unchanged. The optional `style` is applied ONLY on
 * TV (e.g. `flex: 1` to fill a screen region) — keep callers laid out so they
 * don't depend on it off-TV.
 */
import React from 'react';
import { type StyleProp, TVFocusGuideView, type ViewStyle } from 'react-native';

import { isTV } from './constants';

export interface TVFocusZoneProps {
  children: React.ReactNode;
  /** Applied only on TV (the focus guide's own container style). */
  style?: StyleProp<ViewStyle>;
  /** Redirect focus to the first focusable child on entry + remember last. Default true. */
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  trapFocusRight?: boolean;
}

const TVFocusZone: React.FC<TVFocusZoneProps> = ({
  children,
  style,
  autoFocus = true,
  trapFocusUp,
  trapFocusDown,
  trapFocusLeft,
  trapFocusRight,
}) => {
  if (!isTV) return <>{children}</>;
  return (
    <TVFocusGuideView
      style={style}
      autoFocus={autoFocus}
      trapFocusUp={trapFocusUp}
      trapFocusDown={trapFocusDown}
      trapFocusLeft={trapFocusLeft}
      trapFocusRight={trapFocusRight}
    >
      {children}
    </TVFocusGuideView>
  );
};

export default TVFocusZone;
