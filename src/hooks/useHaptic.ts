import { useMemo } from 'react';

import * as Haptics from 'expo-haptics';

import { useAppStore } from '@/store/useAppStore';

export interface HapticAPI {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;
  selection: () => void;
}

/**
 * Wraps `expo-haptics` and respects `settings.hapticsEnabled`. When disabled,
 * every method is a no-op. Errors from the native call are swallowed —
 * haptics are best-effort UX, never critical.
 *
 * Stable reference across renders unless `hapticsEnabled` flips.
 */
export function useHaptic(): HapticAPI {
  const enabled = useAppStore((s) => s.hapticsEnabled);

  return useMemo<HapticAPI>(() => {
    const guard =
      (fn: () => Promise<void>): (() => void) =>
      () => {
        if (!enabled) return;
        void fn().catch(() => {});
      };

    return {
      light: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      medium: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
      heavy: guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
      success: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      warning: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
      error: guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
      selection: guard(() => Haptics.selectionAsync()),
    };
  }, [enabled]);
}
