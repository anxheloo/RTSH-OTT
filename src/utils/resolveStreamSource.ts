/**
 * resolveStreamSource — maps a `streams` map + the selected `QualityId` to the
 * single URL the player should load.
 *
 * The backend returns `streams` as a plain object: `master` is the ABR
 * multivariant playlist and every other key is a fixed-rendition child playlist
 * named verbatim by the backend (e.g. `720p`, `540p`, `360p`). The mapping is
 * fully dynamic — `master` ↔ `auto`, every other key IS its own `QualityId` — so
 * the picker tracks whatever the backend sends without a code change. Manual
 * selection swaps the player source to the chosen rendition URL — expo-video
 * cannot pin a variant inside a master playlist.
 */
import type { QualityId } from '@/types/domain';

/** The `master`/ABR stream key, surfaced to the user as `auto`. */
export const MASTER_KEY = 'master';

/** The URL to feed the player for the given quality. Returns '' when streams is missing/empty. */
export function resolveStreamSource(
  streams: Record<string, string> | null | undefined,
  quality: QualityId,
): string {
  if (!streams) return '';
  if (quality !== 'auto') {
    // The rendition key === the QualityId; fall back to master/first if absent.
    return streams[quality] ?? streams[MASTER_KEY] ?? Object.values(streams)[0] ?? '';
  }
  // Auto → master (native ABR) when present; otherwise first available rendition.
  return streams[MASTER_KEY] ?? Object.values(streams)[0] ?? '';
}

/**
 * Rendition keys the user can pin — every stream key except `master`, in the
 * order the backend sent them. Empty when the stream is master-only → the
 * quality sheet shows Auto alone.
 */
export function availableQualityIds(streams: Record<string, string> | null | undefined): QualityId[] {
  if (!streams) return [];
  return Object.keys(streams).filter((key) => key !== MASTER_KEY);
}