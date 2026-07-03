/**
 * Enforces one ad on screen at a time, app-wide — the ad equivalent of
 * `ModalSlice`'s single-active-modal invariant. `wantsToShow` is the caller's
 * own full readiness condition (fetched, revealed, not yet dismissed, …); this
 * hook only adds exclusivity on top of it. The first ad whose `wantsToShow`
 * goes true claims the shared slot (`AdsSlice.activeAdId`) and releases it the
 * moment it stops wanting to show; every other ad is starved of the slot until
 * then. Needed because the app-open overlay is mounted above the router (it
 * outlives navigation) while the channel-change/mid-roll overlays live inside
 * `channel/[id]` — without a shared owner, a screen transition can leave both
 * mounted and visible at once.
 */
import { useEffect } from 'react';

import { useAppStore } from '@/store/useAppStore';

export function useAdSlot(wantsToShow: boolean, adId: number | undefined): boolean {
  const activeAdId = useAppStore((s) => s.activeAdId);
  const updateAdsSlice = useAppStore((s) => s.updateAdsSlice);

  const granted = wantsToShow && !!adId && (activeAdId === null || activeAdId === adId);

  useEffect(() => {
    if (!granted || !adId) return;
    updateAdsSlice({ activeAdId: adId });
    return () => {
      if (useAppStore.getState().activeAdId === adId) updateAdsSlice({ activeAdId: null });
    };
  }, [granted, adId, updateAdsSlice]);

  return granted;
}
