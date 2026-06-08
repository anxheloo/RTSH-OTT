/**
 * 19 mock TV channels for RTSH OTT, shaped to the Phase 22.6b `Channel` model:
 * `package` (design chips), `isLive` (LIVE tag), `isAdult` (lock/18+ tag → PIN),
 * `geoBlocked` (geo tag → overlay). Stream URLs point to a public HLS test
 * stream. The full design channel list lands with the Home build (22.7); a
 * couple of lock/geo/non-live samples here exercise the design tags.
 */

export const MOCK_LIVE_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const SCENE = (label: string) =>
  `https://placehold.co/320x180/141417/EB122F?text=${encodeURIComponent(label)}`;

export const mockChannels = [
  { id: 'ch1',  name: 'RTSH 1',           logoUrl: 'https://placehold.co/120x80/EB122F/fff?text=RTSH+1',     thumbnailUrl: SCENE('RTSH 1'),     package: 'base',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch2',  name: 'RTSH 2',           logoUrl: 'https://placehold.co/120x80/212121/EB122F?text=RTSH+2',  thumbnailUrl: SCENE('RTSH 2'),     package: 'base',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch3',  name: 'RTSH 3 Kultura',   logoUrl: 'https://placehold.co/120x80/373737/fff?text=RTSH+3',     thumbnailUrl: SCENE('RTSH 3'),     package: 'base',     isLive: false, isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch4',  name: 'RTSH Sport',       logoUrl: 'https://placehold.co/120x80/1a6b1a/fff?text=Sport',      thumbnailUrl: SCENE('Sport'),      package: 'sport',    isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch5',  name: 'RTSH Muzik',       logoUrl: 'https://placehold.co/120x80/7b2d8b/fff?text=Muzik',      thumbnailUrl: SCENE('Muzik'),      package: 'music',    isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch6',  name: 'RTSH Fëmijë',      logoUrl: 'https://placehold.co/120x80/e87b22/fff?text=Fëmijë',     thumbnailUrl: SCENE('Fëmijë'),     package: 'kids',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch7',  name: 'RTSH Parlament',   logoUrl: 'https://placehold.co/120x80/1a3a6b/fff?text=Parlament',  thumbnailUrl: SCENE('Parlament'),  package: 'news',     isLive: false, isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch8',  name: 'RTSH Film',        logoUrl: 'https://placehold.co/120x80/0052b4/fff?text=Film',       thumbnailUrl: SCENE('Film'),       package: 'base',     isLive: true,  isAdult: true,  geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch9',  name: 'RTSH SAT',         logoUrl: 'https://placehold.co/120x80/e8002a/fff?text=SAT',        thumbnailUrl: SCENE('SAT'),        package: 'base',     isLive: true,  isAdult: false, geoBlocked: true,  streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch10', name: 'RTSH Shkollë',     logoUrl: 'https://placehold.co/120x80/00a0e3/fff?text=Shkollë',    thumbnailUrl: SCENE('Shkollë'),    package: 'kids',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch11', name: 'RTSH 24',          logoUrl: 'https://placehold.co/120x80/c0392b/fff?text=RTSH+24',    thumbnailUrl: SCENE('RTSH 24'),    package: 'news',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch12', name: 'RTSH Korça',       logoUrl: 'https://placehold.co/120x80/2c3e50/fff?text=Korça',      thumbnailUrl: SCENE('Korça'),      package: 'regional', isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch13', name: 'RTSH Gjirokastra', logoUrl: 'https://placehold.co/120x80/e67e22/fff?text=Gjiro',      thumbnailUrl: SCENE('Gjirokastra'),package: 'regional', isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch14', name: 'RTSH Kukësi',      logoUrl: 'https://placehold.co/120x80/16213e/fff?text=Kukësi',     thumbnailUrl: SCENE('Kukësi'),     package: 'regional', isLive: false, isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch15', name: 'RTSH Shkodra',     logoUrl: 'https://placehold.co/120x80/003580/fff?text=Shkodra',    thumbnailUrl: SCENE('Shkodra'),    package: 'regional', isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch16', name: 'RTSH Lajme',       logoUrl: 'https://placehold.co/120x80/d40000/fff?text=Lajme',      thumbnailUrl: SCENE('Lajme'),      package: 'news',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch17', name: 'RTSH Plus',        logoUrl: 'https://placehold.co/120x80/6a0dad/fff?text=Plus',       thumbnailUrl: SCENE('Plus'),       package: 'base',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch18', name: 'RTSH Agro',        logoUrl: 'https://placehold.co/120x80/c0392b/fff?text=Agro',       thumbnailUrl: SCENE('Agro'),       package: 'base',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch19', name: 'RTSH Shqip',       logoUrl: 'https://placehold.co/120x80/2980b9/fff?text=Shqip',      thumbnailUrl: SCENE('Shqip'),      package: 'base',     isLive: true,  isAdult: false, geoBlocked: false, streamUrl: MOCK_LIVE_STREAM },
] as const;
