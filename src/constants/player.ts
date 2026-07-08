import type { QualityId } from '@/types/domain';

/** Default ABR mode — the native player adapts bitrate to the connection. */
export const DEFAULT_QUALITY: QualityId = 'auto';

/**
 * The quality picker is fully data-driven: the active sheet shows `auto` + the
 * rendition keys the current stream actually offers
 * (`PlayerSlice.availableQualities`, derived in `utils/resolveStreamSource →
 * availableQualityIds`). Each rendition's label IS its backend key (`720p`, …),
 * so there is no fixed options table to keep in sync. See `utils/resolveStreamSource`.
 */
