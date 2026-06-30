/**
 * Checks whether the device is on cellular when `cellularPlaybackAllowed` is
 * false. If so, opens a confirmation modal. Cancelling navigates back — the
 * caller must mount this inside a route screen.
 *
 * Prompts at most ONCE per session: tapping Continue sets the runtime
 * `cellularAcknowledged` flag, so subsequent player remounts / channel switches
 * don't re-prompt. Cancel leaves the flag unset (re-entry re-asks). The flag is
 * cleared by `useNetworkMonitor` when the connection leaves cellular, and isn't
 * persisted — a fresh launch re-asks. The durable "always allow over cellular"
 * is `SettingsSlice.cellularPlaybackAllowed`.
 *
 * Mount at the top of any full-screen player route (channel/[id], program/[id]).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { NetInfoStateType } from '@react-native-community/netinfo';
import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

export function useCellularGate(): void {
  const { t } = useTranslation();
  const connectionType = useAppStore((s) => s.connectionType);
  const cellularPlaybackAllowed = useAppStore((s) => s.cellularPlaybackAllowed);
  const cellularAcknowledged = useAppStore((s) => s.cellularAcknowledged);
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);
  const updateNetworkSlice = useAppStore((s) => s.updateNetworkSlice);

  useEffect(() => {
    if (
      connectionType === NetInfoStateType.cellular &&
      !cellularPlaybackAllowed &&
      !cellularAcknowledged
    ) {
      updateModalSlice({
        currentModal: 'confirmation',
        modalData: {
          title: t('player.cellular_gate_title'),
          description: t('player.cellular_gate_message'),
          button: t('common.ok'),
          // continue → remember for the session, then ModalWrapper closes
          action: () => updateNetworkSlice({ cellularAcknowledged: true }),
          button2: t('common.cancel'),
          action2: () => router.back(),
        },
      });
    }
    // Run once on mount — connection type is stable within a route lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
