import { useEffect } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { STORE_UPDATE_MODE } from '@/constants/appUpdate';

/**
 * `STORE_UPDATE_MODE === 'block'` → keeps the blocking `forceUpdate` modal up.
 * `ModalSlice` holds one modal at a time, so another modal (e.g. `noInternet`)
 * can replace it; the store subscription re-raises it the moment the slot is
 * free again. A subscription, not a selector, so the root never re-renders on
 * modal changes. The 'notice' mode is `StoreUpdateBanner`, not this.
 */
export function useStoreUpdateBlock() {
  useEffect(() => {
    if (STORE_UPDATE_MODE !== 'block') return;
    const raise = () => {
      const { currentModal, updateModalSlice } = useAppStore.getState();
      if (!currentModal) updateModalSlice({ currentModal: 'forceUpdate' });
    };
    raise();
    return useAppStore.subscribe(raise);
  }, []);
}
