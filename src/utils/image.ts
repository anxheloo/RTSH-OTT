/**
 * Image helpers.
 *
 * Live channel snapshots live at a STABLE URL with MUTABLE content, so the disk
 * cache would serve a stale frame forever. Appending a cache-bust query param
 * (a query's `dataUpdatedAt`) forces a fresh download on each refetch while a
 * stable value between refetches still serves the disk-cached frame. This is the
 * supported alternative to `cachePolicy="none"`, which on expo-image 56 leaves
 * the image unpainted.
 */

/**
 * Appends a `cb` cache-bust param to a snapshot URL. Returns the URL untouched
 * when either the URL or the token is missing.
 */
export function cacheBustUrl(uri?: string, token?: number): string | undefined {
  if (!uri || !token) return uri;
  return `${uri}${uri.includes('?') ? '&' : '?'}cb=${token}`;
}
