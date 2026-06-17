import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { resolveColors } from '@/store/createThemeSlice';
import { useAppStore } from '@/store/useAppStore';

/**
 * Re-resolves the theme palette when the OS color scheme changes, but only
 * while `mode === 'system'` — an explicit light/dark choice ignores the OS.
 *
 * Mounted once in `RootLayoutNav` (`_layout.tsx`) so the listener lives for the
 * whole app session. The slice already resolves `'system'` at init and on
 * rehydrate; this covers runtime OS toggles while the app is open.
 */
export function useSystemTheme(): void {
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (useAppStore.getState().mode === 'system') {
        useAppStore.setState({ colors: resolveColors('system') });
      }
    });
    return () => sub.remove();
  }, []);
}
