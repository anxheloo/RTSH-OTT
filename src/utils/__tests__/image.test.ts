/** Unit tests for the snapshot cache-bust helper. */
import { cacheBustUrl } from '../image';

describe('cacheBustUrl', () => {
  it('appends ?cb= to a bare URL and &cb= when a query exists', () => {
    expect(cacheBustUrl('https://cdn.example/snap.jpg', 7)).toBe(
      'https://cdn.example/snap.jpg?cb=7',
    );
    expect(cacheBustUrl('https://cdn.example/snap.jpg?w=320', 7)).toBe(
      'https://cdn.example/snap.jpg?w=320&cb=7',
    );
  });

  it('returns the input untouched when the URL or token is missing', () => {
    expect(cacheBustUrl(undefined, 7)).toBeUndefined();
    expect(cacheBustUrl('https://cdn.example/snap.jpg', undefined)).toBe(
      'https://cdn.example/snap.jpg',
    );
  });
});
