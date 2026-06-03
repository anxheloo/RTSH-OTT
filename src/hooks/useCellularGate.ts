/**
 * Checks whether the device is on cellular when `cellularPlaybackAllowed` is
 * false. If so, opens a confirmation modal. Cancelling the modal navigates
 * back — the caller must mount this inside a route screen.
 *
 * Mount at the top of any full-screen player route (channel/[id], program/[id]).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

import { useNetworkReconnect } from './useNetworkReconnect';

export function useCellularGate(): void {
  const { t } = useTranslation();
  const network = useNetworkReconnect();
  const cellularPlaybackAllowed = useAppStore((s) => s.cellularPlaybackAllowed);
  const openModal = useAppStore((s) => s.openModal);

  useEffect(() => {
    if (network.type === 'cellular' && !cellularPlaybackAllowed) {
      openModal('confirmation', {
        title: t('player.cellular_gate_title'),
        message: t('player.cellular_gate_message'),
        confirmLabel: t('common.ok'),
        cancelLabel: t('common.cancel'),
        onConfirm: () => {},
        onCancel: () => router.back(),
      });
    }
  // Run once on mount — network type is stable within a route lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
