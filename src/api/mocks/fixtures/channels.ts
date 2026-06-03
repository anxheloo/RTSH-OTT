/** 19 mock TV channels for RTSH OTT. Stream URLs point to public HLS test streams. */

export const MOCK_LIVE_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

export const mockChannels = [
  { id: 'ch1',  name: 'RTSH 1',          logoUrl: 'https://placehold.co/120x80/EB122F/fff?text=RTSH+1',      category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch2',  name: 'RTSH 2',          logoUrl: 'https://placehold.co/120x80/212121/EB122F?text=RTSH+2',   category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch3',  name: 'RTSH 3 Kultura',  logoUrl: 'https://placehold.co/120x80/373737/fff?text=RTSH+3',      category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch4',  name: 'RTSH Sport',      logoUrl: 'https://placehold.co/120x80/1a6b1a/fff?text=Sport',       category: 'sport',      streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch5',  name: 'RTSH Muzik',      logoUrl: 'https://placehold.co/120x80/7b2d8b/fff?text=Muzik',       category: 'music',      streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch6',  name: 'RTSH Fëmijë',    logoUrl: 'https://placehold.co/120x80/e87b22/fff?text=Fëmijë',      category: 'kids',       streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch7',  name: 'RTSH Parlament',  logoUrl: 'https://placehold.co/120x80/1a3a6b/fff?text=Parlament',   category: 'parliament', streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch8',  name: 'TV Klan',         logoUrl: 'https://placehold.co/120x80/0052b4/fff?text=Klan',        category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch9',  name: 'Top Channel',     logoUrl: 'https://placehold.co/120x80/e8002a/fff?text=Top',         category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch10', name: 'Vizion Plus',     logoUrl: 'https://placehold.co/120x80/00a0e3/fff?text=Vizion',      category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch11', name: 'Report TV',       logoUrl: 'https://placehold.co/120x80/c0392b/fff?text=Report',      category: 'news',       streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch12', name: 'A1 Report',       logoUrl: 'https://placehold.co/120x80/2c3e50/fff?text=A1',          category: 'news',       streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch13', name: 'Ora News',        logoUrl: 'https://placehold.co/120x80/e67e22/fff?text=Ora',         category: 'news',       streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch14', name: 'ABC News',        logoUrl: 'https://placehold.co/120x80/16213e/fff?text=ABC',         category: 'news',       streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch15', name: 'Euronews Albania',logoUrl: 'https://placehold.co/120x80/003580/fff?text=Euro',        category: 'news',       streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch16', name: 'News24',          logoUrl: 'https://placehold.co/120x80/d40000/fff?text=News24',      category: 'news',       streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch17', name: 'MCN',             logoUrl: 'https://placehold.co/120x80/6a0dad/fff?text=MCN',         category: 'music',      streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch18', name: 'Alsat-M',         logoUrl: 'https://placehold.co/120x80/c0392b/fff?text=Alsat',       category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
  { id: 'ch19', name: 'Scan TV',         logoUrl: 'https://placehold.co/120x80/2980b9/fff?text=Scan',        category: 'tv',         streamUrl: MOCK_LIVE_STREAM },
] as const;
