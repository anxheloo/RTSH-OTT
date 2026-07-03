/**
 * Unit tests for stream-source resolution: the contentType inference that keeps
 * extensionless HLS manifests playable (the "NoDeclaredBrand" fix), and the
 * dynamic quality → URL mapping.
 */
import { availableQualityIds, inferContentType, resolveStreamSource } from '../resolveStreamSource';

describe('inferContentType', () => {
  it('maps recognized streaming extensions to their protocol', () => {
    expect(inferContentType('https://cdn.example/live/master.m3u8')).toBe('hls');
    expect(inferContentType('https://cdn.example/live/manifest.mpd')).toBe('dash');
    expect(inferContentType('https://cdn.example/live/stream.ism')).toBe('smoothStreaming');
    expect(inferContentType('https://cdn.example/live/stream.isml')).toBe('smoothStreaming');
  });

  it('maps other media extensions to auto (progressive — keeps VIDEO ads working)', () => {
    expect(inferContentType('https://cdn.example/ads/spot.mp4')).toBe('auto');
  });

  it('defaults an extensionless URL to hls (our /playback/manifest endpoint)', () => {
    expect(inferContentType('https://api.example/playback/manifest?u=abc.m3u8')).toBe('hls');
    expect(inferContentType('https://api.example/playback/manifest')).toBe('hls');
  });

  it('ignores query/hash when reading the extension', () => {
    expect(inferContentType('https://cdn.example/master.m3u8?token=x#t=5')).toBe('hls');
  });

  it('is case-insensitive and null-safe', () => {
    expect(inferContentType('https://cdn.example/MASTER.M3U8')).toBe('hls');
    expect(inferContentType(null)).toBe('hls');
    expect(inferContentType(undefined)).toBe('hls');
  });
});

describe('resolveStreamSource', () => {
  const streams = {
    master: 'https://cdn.example/master.m3u8',
    '720p': 'https://cdn.example/720.m3u8',
    '360p': 'https://cdn.example/360.m3u8',
  };

  it('auto → master (native ABR)', () => {
    expect(resolveStreamSource(streams, 'auto')).toBe(streams.master);
  });

  it('a pinned quality → its rendition URL', () => {
    expect(resolveStreamSource(streams, '720p')).toBe(streams['720p']);
  });

  it('an unknown quality falls back to master', () => {
    expect(resolveStreamSource(streams, '1080p')).toBe(streams.master);
  });

  it('auto without a master falls back to the first rendition', () => {
    expect(resolveStreamSource({ '720p': streams['720p'] }, 'auto')).toBe(streams['720p']);
  });

  it('returns "" for a missing/empty map', () => {
    expect(resolveStreamSource(null, 'auto')).toBe('');
    expect(resolveStreamSource({}, 'auto')).toBe('');
  });
});

describe('availableQualityIds', () => {
  it('lists every key except master, in backend order', () => {
    expect(
      availableQualityIds({ master: 'm', '720p': 'a', '360p': 'b' }),
    ).toEqual(['720p', '360p']);
  });

  it('is empty for master-only or missing streams', () => {
    expect(availableQualityIds({ master: 'm' })).toEqual([]);
    expect(availableQualityIds(null)).toEqual([]);
  });
});
