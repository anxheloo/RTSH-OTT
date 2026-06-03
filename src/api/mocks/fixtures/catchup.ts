/** 20 mock catch-up items spanning the last 7 days. */

import { MOCK_LIVE_STREAM } from './channels';

const CATCHUP_TITLES = [
  'Lajmet 19:00',
  'Studio e Hapur - Speciale',
  'Dokumentar: Shqipëria e fshehtë',
  'Seria: Toka Jonë Ep. 12',
  'Film: Gjuetari i Ëndrrave',
  'Debat: Çështje Ekonomike',
  'Sporti Live: Superliga',
  'Muzikë: Kënga Magjike 2026',
  'Natën e Mirë Fëmijë',
  'Lajmet e Mesditës',
  'Dokumentar: Natyra Shqiptare',
  'Seria: Shijat e Jetës Ep. 7',
  'Film: Kthimi i Heroit',
  'Intervistë: Ministrja e Kulturës',
  'Sporti: Analizë Fundjavore',
  'Muzikë: Folklor Shqiptar',
  'Lajmet 13:00',
  'Dokumentar: Ilirët',
  'Seria: Rrugëtimi Ep. 5',
  'Film: Nata e Fundit',
];

const CHANNEL_NAMES: Record<string, string> = {
  ch1: 'RTSH 1', ch2: 'RTSH 2', ch3: 'RTSH 3 Kultura',
  ch4: 'RTSH Sport', ch5: 'RTSH Muzik', ch6: 'RTSH Fëmijë',
};
const CHANNEL_IDS = Object.keys(CHANNEL_NAMES);

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const mockCatchupItems = CATCHUP_TITLES.map((title, i) => ({
  id: `catchup-${i + 1}`,
  channelId: CHANNEL_IDS[i % CHANNEL_IDS.length],
  channelName: CHANNEL_NAMES[CHANNEL_IDS[i % CHANNEL_IDS.length]],
  title,
  description: `${title} — disponibël për 7 ditë nga data e transmetimit.`,
  duration: 1800 + (i * 300) % 5400,
  thumbnail: `https://placehold.co/320x180/212121/fff?text=${encodeURIComponent(title.slice(0, 12))}`,
  streamUrl: MOCK_LIVE_STREAM,
  airDate: daysAgo(i % 7),
  isAdult: i === 19,
}));
