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
import type { ContentType } from 'expo-video';

import type { QualityId } from '@/types/domain';

/** The `master`/ABR stream key, surfaced to the user as `auto`. */
export const MASTER_KEY = 'master';

/**
 * Infers the expo-video `contentType` from a stream URL's file extension.
 *
 * expo-video defaults to `'auto'`, which falls back to progressive (container
 * sniffing) and breaks streaming manifests served from an extensionless
 * endpoint (e.g. `/playback/manifest?u=…`) — ExoPlayer's extractors fail with
 * "NoDeclaredBrand". So the rule here is:
 *   - recognized streaming extension → that protocol (`hls`/`dash`/`smoothStreaming`);
 *   - any other (known media) extension, e.g. `.mp4` → `'auto'` (progressive);
 *   - NO extension at all → `'hls'` (our backend serves HLS from an extensionless
 *     manifest endpoint; this is the default that fixes the live/recorded streams).
 */
export function inferContentType(uri: string | null | undefined): ContentType {
  if (!uri) return 'hls';
  // Drop query + hash, then look at the last path segment only.
  const path = uri.split(/[?#]/, 1)[0];
  const segment = path.slice(path.lastIndexOf('/') + 1);
  const dot = segment.lastIndexOf('.');
  if (dot === -1) return 'hls'; // no extension → HLS manifest endpoint

  switch (segment.slice(dot + 1).toLowerCase()) {
    case 'm3u8':
      return 'hls';
    case 'mpd':
      return 'dash';
    case 'ism':
    case 'isml':
      return 'smoothStreaming';
    default:
      return 'auto';
  }
}

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