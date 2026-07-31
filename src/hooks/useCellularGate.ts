/**
 * Cellular-data gate — confirms before playback starts over cellular when
 * `cellularPlaybackAllowed` is false. Mount at the top of a player route
 * (`channel/[id]`, `radio/[id]`) and hold playback while `pending` is true:
 * the confirmation modal is up and nothing must reach the network or the
 * speakers until the user accepts.
 *
 * `pending` is DERIVED, not stored — it is exactly "on cellular, not allowed in
 * settings, not acknowledged this session". Continue flips the runtime
 * `cellularAcknowledged` flag, which clears `pending` in the same render and
 * releases the player; Cancel leaves the flag unset and pops the route. The flag
 * is cleared by `useNetworkMonitor` whenever the connection leaves cellular and
 * is never persisted — so a fresh launch re-asks, and (because `pending` is
 * reactive) a mid-session Wi-Fi → cellular switch re-asks and re-holds playback,
 * which is the behavior `createNetworkSlice` always documented as the intent.
 * The durable "always allow over cellular" is `SettingsSlice.cellularPlaybackAllowed`.
 *
 * REQUIRES the host route NOT to be presented as a native modal. `ModalWrapper`
 * lives at the app root, so its RN `<Modal>` presents from the root view
 * controller; a route presented as `fullScreenModal` is a *second* presentation
 * from that same controller, and on iOS the two race — the sheet flashes for
 * ~1s, gets orphaned, and (since nothing clears `currentModal` on unmount)
 * leaves an invisible full-screen modal window swallowing every touch app-wide.
 * That is why `channel/[id]` is a plain card push with a slide-from-bottom
 * animation rather than `presentation: 'fullScreenModal'`.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { NetInfoStateType } from '@react-native-community/netinfo';
import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

export interface CellularGate {
  /** Playback must not start yet — the data-warning modal is up. */
  pending: boolean;
}

export function useCellularGate(): CellularGate {
  const { t } = useTranslation();
  const connectionType = useAppStore((s) => s.connectionType);
  const cellularPlaybackAllowed = useAppStore((s) => s.cellularPlaybackAllowed);
  const cellularAcknowledged = useAppStore((s) => s.cellularAcknowledged);
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);
  const updateNetworkSlice = useAppStore((s) => s.updateNetworkSlice);

  const pending =
    connectionType === NetInfoStateType.cellular &&
    !cellularPlaybackAllowed &&
    !cellularAcknowledged;

  useEffect(() => {
    if (!pending) return;

    updateModalSlice({
      currentModal: 'confirmation',
      modalData: {
        title: t('player.cellular_gate_title'),
        description: t('player.cellular_gate_message'),
        button: t('common.ok'),
        // Continue → remember for the session; `pending` clears and the player
        // mounts. ModalWrapper closes after the action runs.
        action: () => updateNetworkSlice({ cellularAcknowledged: true }),
        button2: t('common.cancel'),
        action2: () => router.back(),
      },
    });

    // A route-owned modal must never outlive its route: leaving the screen with
    // the sheet still up would strand `currentModal` and leave an undismissable
    // overlay over the tabs.
    return () => {
      if (useAppStore.getState().currentModal === 'confirmation') {
        updateModalSlice({ currentModal: null });
      }
    };
  }, [pending, t, updateModalSlice, updateNetworkSlice]);

  return { pending };
}
