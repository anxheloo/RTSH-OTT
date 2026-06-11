import type { QualityId } from '@/types/domain';

export const SEEK_STEP_S = 10;

/** Default ABR mode — the native player adapts bitrate to the connection. */
export const DEFAULT_QUALITY: QualityId = 'auto';

/**
 * Quality picker entries (design `QUAL`). `label` is the technical name (not
 * translated); `descriptionKey` resolves the localized blurb. The full list is
 * the *menu of possible* qualities; the active quality sheet filters it down to
 * Auto + the renditions a stream actually offers (`PlayerSlice.availableQualities`).
 * Manual selection swaps the player source to the rendition URL (expo-video can't
 * cap a variant); `auto` prefers the master playlist for native ABR. See
 * `utils/resolveStreamSource`.
 */
export const QUALITY_OPTIONS = [
  { id: 'auto', label: 'Auto', descriptionKey: 'player.quality_auto' },
  { id: '1080p', label: '1080p', descriptionKey: 'player.quality_1080p' },
  { id: '720p', label: '720p', descriptionKey: 'player.quality_720p' },
  { id: '576p', label: '576p', descriptionKey: 'player.quality_576p' },
  { id: '360p', label: '360p', descriptionKey: 'player.quality_360p' },
] as const satisfies readonly { id: QualityId; label: string; descriptionKey: string }[];
