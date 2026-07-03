/**
 * useImagePrefetch — warms the expo-image cache for a set of remote images so
 * they paint instantly when an off-screen row scrolls into view or a sibling
 * screen reuses them (a channel's logo/snapshot is shared by Home, the Guide,
 * and the player header). This is the standard "prefetch the next likely
 * assets while the current screen is idle" pattern.
 *
 * Fire-and-forget: a warm cache is an optimization, never a correctness
 * requirement, so prefetch rejections are swallowed. The effect re-runs only
 * when the resolved URL set changes (a stable join key is the sole dep, so a
 * plain re-render is a no-op) — a fresh snapshot cache-bust token warms the new
 * frames while unchanged URLs cost nothing. Pass the SAME URL the row renders
 * (cache-busted included) so the prefetched entry matches the row's request and
 * the two coalesce instead of double-downloading.
 */
import { useEffect } from 'react';

import { NetInfoStateType } from '@react-native-community/netinfo';
import { Image } from 'expo-image';

import { useAppStore } from '@/store/useAppStore';

/** Newline join/split — URLs never contain a newline, so it's a safe delimiter. */
const DELIM = '\n';

export function useImagePrefetch(urls: (string | null | undefined)[]) {
  // Prefetch is a speculative download, so it must honor the user's data-saver
  // choice: skip on cellular when data-saver is on (on-screen images still load
  // normally — only the warm-ahead is dropped). Wi-Fi prefetches regardless.
  const dataSaverEnabled = useAppStore((s) => s.dataSaverEnabled);
  const connectionType = useAppStore((s) => s.connectionType);
  const skip = dataSaverEnabled && connectionType === NetInfoStateType.cellular;

  // Single stable key so the effect fires only when the set of resolved URLs
  // actually changes, not on every render.
  const key = urls.filter((u): u is string => !!u).join(DELIM);

  useEffect(() => {
    if (!key || skip) return;
    Image.prefetch(key.split(DELIM), { cachePolicy: 'memory-disk' }).catch(() => {});
  }, [key, skip]);
}
