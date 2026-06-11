/**
 * Mock stream manifests — lets you exercise every backend contract the resolver
 * (`utils/resolveStreamSource`) handles, with real public HLS URLs, without
 * touching app code. Flip `MOCK_STREAM_SHAPE` and reload.
 *
 * Renditions/master use Apple's `bipbop_4x3` example (same content at different
 * sizes) so a manual quality switch is visibly different on screen.
 */
import type { StreamManifest } from '@/api/services/streams';
import type { Rendition } from '@/types/domain';

const BIPBOP = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3';

/** A multivariant (master) playlist → native ABR when fed as the source. */
export const MOCK_STREAM_MASTER = `${BIPBOP}/bipbop_4x3_variant.m3u8`;

/** A lone single-rendition URL (the "one public test URL" case). */
export const MOCK_STREAM_SINGLE = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

/** Four per-rendition child playlists — the shape the backend will expose. */
export const MOCK_RENDITIONS: Rendition[] = [
  { id: '1080p', url: `${BIPBOP}/gear5/prog_index.m3u8` },
  { id: '720p', url: `${BIPBOP}/gear4/prog_index.m3u8` },
  { id: '576p', url: `${BIPBOP}/gear3/prog_index.m3u8` },
  { id: '360p', url: `${BIPBOP}/gear2/prog_index.m3u8` },
];

/**
 * Which manifest shape the mock returns. Change this to test each path:
 *  - `'single'`     → only `hlsUrl`. Sheet = **Auto only**; plays the one URL.
 *  - `'master'`     → `masterUrl` only → **native ABR** (Auto adapts). Sheet = Auto only.
 *  - `'renditions'` → 4 child URLs, **no master**. Auto = fixed **720p**; manual swaps. Sheet lists all 4.
 *  - `'full'`       → master **+** renditions. Auto = ABR; manual pins a child. Sheet lists all 4.
 */
export const MOCK_STREAM_SHAPE: 'single' | 'master' | 'renditions' | 'full' = 'full';

export function buildMockStreamManifest(): StreamManifest {
  switch (MOCK_STREAM_SHAPE) {
    case 'single':
      return { hlsUrl: MOCK_STREAM_SINGLE, headers: {} };
    case 'master':
      return { hlsUrl: MOCK_STREAM_MASTER, masterUrl: MOCK_STREAM_MASTER, headers: {} };
    case 'renditions':
      // hlsUrl mirrors the 720p child as the universal fallback (no master).
      return { hlsUrl: MOCK_RENDITIONS[1].url, renditions: MOCK_RENDITIONS, headers: {} };
    case 'full':
      return {
        hlsUrl: MOCK_STREAM_MASTER,
        masterUrl: MOCK_STREAM_MASTER,
        renditions: MOCK_RENDITIONS,
        headers: {},
      };
  }
}
