/** Generates 7 days of EPG data across all channels. */

import { mockChannels } from './channels';

const PROGRAMS_PER_CHANNEL = [
  { title: 'Lajmet', duration: 30, isAdult: false },
  { title: 'Mëngjes me RTSH', duration: 90, isAdult: false, hasCatchup: false },
  { title: 'Dokumentar', duration: 60, isAdult: false },
  { title: 'Studio e Hapur', duration: 60, isAdult: false },
  { title: 'Lajmet e Mesditës', duration: 30, isAdult: false, hasCatchup: false },
  { title: 'Seria shqiptare', duration: 45, isAdult: false },
  { title: 'Film Shqiptar', duration: 90, isAdult: false },
  { title: 'Lajmet e Mbrëmjes', duration: 30, isAdult: false },
  { title: 'Debat Politik', duration: 60, isAdult: false },
  { title: 'Natën e mirë fëmijë', duration: 30, isAdult: false },
  { title: 'Film Ndërkombëtar', duration: 110, isAdult: true },
  { title: 'Muzikë Shqipe', duration: 60, isAdult: false },
];

const BIPBOP = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3';

/** Playback data embedded in every EPG item — mirrors the PlaybackDecisionDTO shape. */
const MOCK_EPG_STREAMS: Record<string, string> = {
  master: `${BIPBOP}/bipbop_4x3_variant.m3u8`,
  '720p': `${BIPBOP}/gear4/prog_index.m3u8`,
  '540p': `${BIPBOP}/gear3/prog_index.m3u8`,
  '360p': `${BIPBOP}/gear2/prog_index.m3u8`,
};

let epgIdCounter = 0;

function generateDayEpg(channelId: string, channelName: string, dateStr: string) {
  const items = [];
  let cursor = new Date(`${dateStr}T06:00:00`);
  const now = Date.now();

  for (let i = 0; i < PROGRAMS_PER_CHANNEL.length; i++) {
    const prog = PROGRAMS_PER_CHANNEL[i % PROGRAMS_PER_CHANNEL.length];
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + prog.duration * 60_000);
    epgIdCounter += 1;
    const id = `epg-${channelId}-${dateStr}-${epgIdCounter}`;
    items.push({
      id,
      channelId,
      channelName,
      title: prog.title,
      description: `${prog.title} — emision i transmetuar nga RTSH TANI.`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isAdult: prog.isAdult,
      isLive: now >= start.getTime() && now < end.getTime(),
      hasCatchup: 'hasCatchup' in prog ? prog.hasCatchup : true,
      thumbnail: `https://placehold.co/320x180/212121/fff?text=${encodeURIComponent(prog.title)}`,
      // Playback data — same shape as PlaybackDecisionDTO
      decision: 'ALLOWED',
      programId: id,
      streams: MOCK_EPG_STREAMS,
    });
    cursor = end;
  }
  return items;
}

/** Local `YYYY-MM-DD` (matches the channel screen + live-guard date keys). */
function localTodayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * A short 18+ programme starting ~2 min from now on RTSH 1 (clean channel), so
 * the live parental re-check (22.14c) is demonstrable on cue — open RTSH 1 and
 * the gate fires when this programme starts — without waiting for the fixed
 * afternoon adult slot. Scoped to one channel (see `getMockEpg`) so it never
 * surprises other channels; today only. Plausible title (reads as real EPG).
 */
// RTSH 1 (id=1 → transformed to '1' by the service layer).
const LIVE_RECHECK_CHANNEL = '1';

function lateNightAdultProgram(channelId: string, channelName: string) {
  const start = new Date(Date.now() + 2 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  const id = `epg-${channelId}-late18`;
  return {
    id,
    channelId,
    channelName,
    title: 'Kinema e Natës (18+)',
    description: 'Film me përmbajtje për të rritur — kërkohet kodi prindëror.',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isAdult: true,
    isLive: false,
    thumbnail: 'https://placehold.co/320x180/212121/fff?text=18%2B',
    decision: 'ALLOWED',
    programId: id,
    streams: MOCK_EPG_STREAMS,
  };
}

function getDateStrings(daysBack: number, daysForward: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let d = -daysBack; d <= daysForward; d++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + d);
    dates.push(dt.toISOString().split('T')[0]);
  }
  return dates;
}

export function getMockEpg(channelId?: string, date?: string): object[] {
  const dates = date ? [date] : getDateStrings(1, 5);
  const channels = channelId
    ? mockChannels.filter((c) => String(c.id) === channelId)
    : mockChannels;

  const today = localTodayKey();
  const items: object[] = [];
  for (const ch of channels) {
    const chId = String(ch.id);
    for (const d of dates) {
      items.push(...generateDayEpg(chId, ch.name, d));
      if (d === today && chId === LIVE_RECHECK_CHANNEL) {
        items.push(lateNightAdultProgram(chId, ch.name));
      }
    }
  }
  return items;
}