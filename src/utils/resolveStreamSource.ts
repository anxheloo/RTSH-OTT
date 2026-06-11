/**
 * resolveStreamSource — maps a `StreamManifest` + the selected `QualityId` to the
 * single URL the player should load.
 *
 * Why this exists: `expo-video` (56.x) cannot pin a variant inside a master
 * playlist (`videoTrack` / `availableVideoTracks` are read-only). So "manual"
 * quality is implemented by swapping the player *source* to the chosen
 * rendition's own child URL, while "auto" feeds the master playlist (or, until a
 * master exists, a fixed 720p default). The fallback chain guarantees we always
 * return *some* playable URL — even when the backend gives only one source or a
 * lone public test URL.
 *
 * Forward-compatible: the day the backend returns `masterUrl`, `auto` becomes
 * real native ABR with no code change.
 */
import type { StreamManifest } from '@/api/services/streams';
import type { QualityId } from '@/types/domain';

const AUTO_PREFERRED: QualityId = '720p';

/** The URL to feed the player for the given quality. Never empty when the manifest has any source. */
export function resolveStreamSource(manifest: StreamManifest, quality: QualityId): string {
  const byId = (id: QualityId) => manifest.renditions?.find((r) => r.id === id)?.url;

  if (quality !== 'auto') {
    // Manual pin → the rendition's own child URL. Fall back so a missing/unknown
    // rendition still plays the best source we have instead of breaking.
    return byId(quality) ?? manifest.masterUrl ?? manifest.hlsUrl;
  }

  // Auto → master (native ABR) when present; otherwise a fixed sensible default
  // from the available renditions; otherwise the lone source we were given.
  return (
    manifest.masterUrl ??
    byId(AUTO_PREFERRED) ??
    manifest.renditions?.[0]?.url ??
    manifest.hlsUrl
  );
}

/**
 * Rendition ids the user can actually pin (i.e. we hold their child URLs).
 * Empty when the stream is a master-only or single source → the quality sheet
 * then offers Auto only, instead of a menu of options that can't be selected.
 */
export function availableQualityIds(manifest: StreamManifest | null): QualityId[] {
  return manifest?.renditions?.map((r) => r.id) ?? [];
}
