/**
 * Unified channel fixture — TV + RADIO in the `EndUserChannelDTO` wire shape.
 * The service's `toChannel()` transform is applied in the real client; the mock
 * handler returns these objects directly so they go through the same transform.
 */

export const MOCK_LIVE_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const scene = (label: string) =>
  `https://placehold.co/320x180/141417/EB122F?text=${encodeURIComponent(label)}`;

const art = (label: string) =>
  `https://placehold.co/400x400/141417/EB122F?text=${encodeURIComponent(label)}`;

export const mockChannels = [
  // ── TV ────────────────────────────────────────────────────────────────────
  { id: 1,  name: 'RTSH 1',           type: 'TV',    sortOrder: 1,  logoUrl: 'https://placehold.co/120x80/EB122F/fff?text=RTSH+1',     imageUrl: scene('RTSH 1') },
  { id: 2,  name: 'RTSH 2',           type: 'TV',    sortOrder: 2,  logoUrl: 'https://placehold.co/120x80/212121/EB122F?text=RTSH+2',  imageUrl: scene('RTSH 2') },
  { id: 3,  name: 'RTSH 3 Kultura',   type: 'TV',    sortOrder: 3,  logoUrl: 'https://placehold.co/120x80/373737/fff?text=RTSH+3',     imageUrl: scene('RTSH 3') },
  { id: 4,  name: 'RTSH Sport',       type: 'TV',    sortOrder: 4,  logoUrl: 'https://placehold.co/120x80/1a6b1a/fff?text=Sport',      imageUrl: scene('Sport') },
  { id: 5,  name: 'RTSH Muzik',       type: 'TV',    sortOrder: 5,  logoUrl: 'https://placehold.co/120x80/7b2d8b/fff?text=Muzik',      imageUrl: scene('Muzik') },
  { id: 6,  name: 'RTSH Fëmijë',     type: 'TV',    sortOrder: 6,  logoUrl: 'https://placehold.co/120x80/e87b22/fff?text=Fëmijë',     imageUrl: scene('Fëmijë') },
  { id: 7,  name: 'RTSH Parlament',   type: 'TV',    sortOrder: 7,  logoUrl: 'https://placehold.co/120x80/1a3a6b/fff?text=Parlament',  imageUrl: scene('Parlament') },
  { id: 8,  name: 'RTSH Film',        type: 'TV',    sortOrder: 8,  logoUrl: 'https://placehold.co/120x80/0052b4/fff?text=Film',       imageUrl: scene('Film') },
  { id: 9,  name: 'RTSH SAT',         type: 'TV',    sortOrder: 9,  logoUrl: 'https://placehold.co/120x80/e8002a/fff?text=SAT',        imageUrl: scene('SAT') },
  { id: 10, name: 'RTSH Shkollë',    type: 'TV',    sortOrder: 10, logoUrl: 'https://placehold.co/120x80/00a0e3/fff?text=Shkollë',    imageUrl: scene('Shkollë') },
  { id: 11, name: 'RTSH 24',          type: 'TV',    sortOrder: 11, logoUrl: 'https://placehold.co/120x80/c0392b/fff?text=RTSH+24',    imageUrl: scene('RTSH 24') },
  { id: 12, name: 'RTSH Korça',      type: 'TV',    sortOrder: 12, logoUrl: 'https://placehold.co/120x80/2c3e50/fff?text=Korça',      imageUrl: scene('Korça') },
  { id: 13, name: 'RTSH Gjirokastra', type: 'TV',    sortOrder: 13, logoUrl: 'https://placehold.co/120x80/e67e22/fff?text=Gjiro',      imageUrl: scene('Gjirokastra') },
  { id: 14, name: 'RTSH Kukësi',     type: 'TV',    sortOrder: 14, logoUrl: 'https://placehold.co/120x80/16213e/fff?text=Kukësi',     imageUrl: scene('Kukësi') },
  { id: 15, name: 'RTSH Shkodra',     type: 'TV',    sortOrder: 15, logoUrl: 'https://placehold.co/120x80/003580/fff?text=Shkodra',    imageUrl: scene('Shkodra') },
  { id: 16, name: 'RTSH Lajme',       type: 'TV',    sortOrder: 16, logoUrl: 'https://placehold.co/120x80/d40000/fff?text=Lajme',      imageUrl: scene('Lajme') },
  { id: 17, name: 'RTSH Plus',        type: 'TV',    sortOrder: 17, logoUrl: 'https://placehold.co/120x80/6a0dad/fff?text=Plus',       imageUrl: scene('Plus') },
  { id: 18, name: 'RTSH Agro',        type: 'TV',    sortOrder: 18, logoUrl: 'https://placehold.co/120x80/c0392b/fff?text=Agro',       imageUrl: scene('Agro') },
  { id: 19, name: 'RTSH Shqip',       type: 'TV',    sortOrder: 19, logoUrl: 'https://placehold.co/120x80/2980b9/fff?text=Shqip',      imageUrl: scene('Shqip') },

  // ── RADIO ─────────────────────────────────────────────────────────────────
  { id: 20, name: 'Radio Tirana 1',       type: 'RADIO', sortOrder: 1,  logoUrl: 'https://placehold.co/80x80/EB122F/fff?text=RT1',    imageUrl: art('RT1') },
  { id: 21, name: 'Radio Tirana 2',       type: 'RADIO', sortOrder: 2,  logoUrl: 'https://placehold.co/80x80/212121/EB122F?text=RT2', imageUrl: art('RT2') },
  { id: 22, name: 'Radio Tirana 3',       type: 'RADIO', sortOrder: 3,  logoUrl: 'https://placehold.co/80x80/373737/fff?text=RT3',    imageUrl: art('RT3') },
  { id: 23, name: 'Radio Tirana Muzik',   type: 'RADIO', sortOrder: 4,  logoUrl: 'https://placehold.co/80x80/7b2d8b/fff?text=RTM',    imageUrl: art('RTM') },
  { id: 24, name: 'Radio Tirana Sport',   type: 'RADIO', sortOrder: 5,  logoUrl: 'https://placehold.co/80x80/1a6b1a/fff?text=RTS',    imageUrl: art('RTS') },
  { id: 25, name: 'Radio Tirana Fëmijë', type: 'RADIO', sortOrder: 6,  logoUrl: 'https://placehold.co/80x80/e87b22/fff?text=RTF',    imageUrl: art('RTF') },
  { id: 26, name: 'Radio Studentore',     type: 'RADIO', sortOrder: 7,  logoUrl: 'https://placehold.co/80x80/1a3a6b/fff?text=RS',     imageUrl: art('RS') },
  { id: 27, name: 'Radio Top Albania',    type: 'RADIO', sortOrder: 8,  logoUrl: 'https://placehold.co/80x80/0052b4/fff?text=Top',    imageUrl: art('Top') },
  { id: 28, name: 'Radio Klan FM',        type: 'RADIO', sortOrder: 9,  logoUrl: 'https://placehold.co/80x80/e8002a/fff?text=Klan',   imageUrl: art('Klan') },
  { id: 29, name: 'Radio Deejay Albania', type: 'RADIO', sortOrder: 10, logoUrl: 'https://placehold.co/80x80/00a0e3/fff?text=DJ',     imageUrl: art('DJ') },
  { id: 30, name: 'Radio Plus',           type: 'RADIO', sortOrder: 11, logoUrl: 'https://placehold.co/80x80/c0392b/fff?text=Plus',   imageUrl: art('Plus') },
  { id: 31, name: 'Kiss FM Albania',      type: 'RADIO', sortOrder: 12, logoUrl: 'https://placehold.co/80x80/d40000/fff?text=Kiss',   imageUrl: art('Kiss') },
  { id: 32, name: 'Radio Metropol',       type: 'RADIO', sortOrder: 13, logoUrl: 'https://placehold.co/80x80/6a0dad/fff?text=Mtpl',   imageUrl: art('Mtpl') },
] as const;