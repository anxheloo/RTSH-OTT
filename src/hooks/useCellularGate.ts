/**
 * Checks whether the device is on cellular when `cellularPlaybackAllowed` is
 * false. If so, opens a confirmation modal. Cancelling navigates back — the
 * caller must mount this inside a route screen.
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
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);

  useEffect(() => {
    if (connectionType === NetInfoStateType.cellular && !cellularPlaybackAllowed) {
      updateModalSlice({
        currentModal: 'confirmation',
        modalData: {
          title: t('player.cellular_gate_title'),
          description: t('player.cellular_gate_message'),
          button: t('common.ok'),
          // continue → ModalWrapper closes after the action runs
          action: () => {},
          button2: t('common.cancel'),
          action2: () => router.back(),
        },
      });
    }
    // Run once on mount — connection type is stable within a route lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
