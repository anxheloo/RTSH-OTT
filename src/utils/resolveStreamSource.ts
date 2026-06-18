/**
 * resolveStreamSource — maps a `streams` map + the selected `QualityId` to the
 * single URL the player should load.
 *
 * The backend returns `streams` as a plain object where `master` is the ABR
 * multivariant playlist and numeric keys (`720`, `576`, `360`, …) are
 * fixed-rendition child playlists. Manual quality selection works by swapping
 * the player source to the chosen rendition URL — expo-video cannot pin a
 * variant inside a master playlist.
 */
import type { QualityId } from '@/types/domain';

/** Maps our `QualityId` labels to the backend's numeric stream keys. */
const QUALITY_TO_KEY: Record<Exclude<QualityId, 'auto'>, string> = {
  '1080p': '1080',
  '720p': '720',
  '576p': '576',
  '360p': '360',
};

/** Maps backend numeric keys back to `QualityId` (inverse of QUALITY_TO_KEY). */
const KEY_TO_QUALITY: Record<string, Exclude<QualityId, 'auto'>> = {
  '1080': '1080p',
  '720': '720p',
  '576': '576p',
  '360': '360p',
};

/** The URL to feed the player for the given quality. Returns '' only when streams is empty. */
export function resolveStreamSource(streams: Record<string, string>, quality: QualityId): string {
  if (quality !== 'auto') {
    const key = QUALITY_TO_KEY[quality];
    return streams[key] ?? streams.master ?? Object.values(streams)[0] ?? '';
  }
  // Auto → master (native ABR) when present; otherwise first available rendition.
  return streams.master ?? Object.values(streams)[0] ?? '';
}

/**
 * Quality IDs the user can actually pin (i.e. we have their child URLs).
 * Empty when the stream has only a master → quality sheet shows Auto only.
 */
export function availableQualityIds(streams: Record<string, string> | null | undefined): QualityId[] {
  if (!streams) return [];
  return Object.keys(streams)
    .map((k) => KEY_TO_QUALITY[k])
    .filter((q): q is Exclude<QualityId, 'auto'> => Boolean(q));
}