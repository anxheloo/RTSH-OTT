import { useQuery } from '@tanstack/react-query';

import type { AdSlot } from '@/types/domain';

import { getAdManifest } from '../services/ads';

/** Ad creative for a slot, or null when none applies. Server decides (16.1). */
export const useAdQuery = (slot: AdSlot, opts?: { enabled?: boolean }) => {
  const { data } = useQuery({
    queryKey: ['ad', slot],
    queryFn: () => getAdManifest(slot),
    enabled: opts?.enabled ?? true,
    staleTime: Infinity,
  });
  return { creative: data ?? null };
};
