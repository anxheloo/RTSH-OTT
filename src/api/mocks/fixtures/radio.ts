/** 13 mock radio stations for RTSH OTT (Phase 22.6b: + `bitrateKbps`). */

export const MOCK_RADIO_STREAM = 'https://stream.radioparadise.com/aac-128';

export const mockRadioStations = [
  { id: 'r1',  name: 'Radio Tirana 1',        genre: 'Lajme & Aktualitet', bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/EB122F/fff?text=RT1' },
  { id: 'r2',  name: 'Radio Tirana 2',        genre: 'Muzikë & Kulturë',   bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/212121/EB122F?text=RT2' },
  { id: 'r3',  name: 'Radio Tirana 3',        genre: 'Klasike & Arte',     bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/373737/fff?text=RT3' },
  { id: 'r4',  name: 'Radio Tirana Muzik',    genre: 'Muzikë Shqipe',      bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/7b2d8b/fff?text=RTM' },
  { id: 'r5',  name: 'Radio Tirana Sport',    genre: 'Sport',              bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/1a6b1a/fff?text=RTS' },
  { id: 'r6',  name: 'Radio Tirana Fëmijë',  genre: 'Fëmijë',            bitrateKbps: 96,  streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/e87b22/fff?text=RTF' },
  { id: 'r7',  name: 'Radio Studentore',      genre: 'Të rinjtë',          bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/1a3a6b/fff?text=RS' },
  { id: 'r8',  name: 'Radio Top Albania',     genre: 'Pop & Hits',         bitrateKbps: 192, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/0052b4/fff?text=Top' },
  { id: 'r9',  name: 'Radio Klan FM',         genre: 'Muzikë & Lojëra',   bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/e8002a/fff?text=Klan' },
  { id: 'r10', name: 'Radio Deejay Albania',  genre: 'Dance & Electronic', bitrateKbps: 192, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/00a0e3/fff?text=DJ' },
  { id: 'r11', name: 'Radio Plus',            genre: 'Informacion',        bitrateKbps: 96,  streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/c0392b/fff?text=Plus' },
  { id: 'r12', name: 'Kiss FM Albania',       genre: 'Pop & R&B',          bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/d40000/fff?text=Kiss' },
  { id: 'r13', name: 'Radio Metropol',        genre: 'Urban & Hip-Hop',    bitrateKbps: 128, streamUrl: MOCK_RADIO_STREAM, logoUrl: 'https://placehold.co/80x80/6a0dad/fff?text=Mtpl' },
] as const;
