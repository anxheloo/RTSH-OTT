/** Generates 7 days of EPG data across all channels. */

import { mockChannels } from './channels';

const PROGRAMS_PER_CHANNEL = [
  { title: 'Lajmet', duration: 30, isAdult: false },
  { title: 'Mëngjes me RTSH', duration: 90, isAdult: false },
  { title: 'Dokumentar', duration: 60, isAdult: false },
  { title: 'Studio e Hapur', duration: 60, isAdult: false },
  { title: 'Lajmet e Mesditës', duration: 30, isAdult: false },
  { title: 'Seria shqiptare', duration: 45, isAdult: false },
  { title: 'Film Shqiptar', duration: 90, isAdult: false },
  { title: 'Lajmet e Mbrëmjes', duration: 30, isAdult: false },
  { title: 'Debat Politik', duration: 60, isAdult: false },
  { title: 'Natën e mirë fëmijë', duration: 30, isAdult: false },
  { title: 'Film Ndërkombëtar', duration: 110, isAdult: true },
  { title: 'Muzikë Shqipe', duration: 60, isAdult: false },
];

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
    items.push({
      id: `epg-${channelId}-${dateStr}-${epgIdCounter}`,
      channelId,
      channelName,
      title: prog.title,
      description: `${prog.title} — emision i transmetuar nga RTSH TANI.`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isAdult: prog.isAdult,
      // Currently airing → design `prog` now-state (highlighted row).
      isLive: now >= start.getTime() && now < end.getTime(),
      thumbnail: `https://placehold.co/320x180/212121/fff?text=${encodeURIComponent(prog.title)}`,
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
const LIVE_RECHECK_CHANNEL = 'ch1';

function lateNightAdultProgram(channelId: string, channelName: string) {
  const start = new Date(Date.now() + 2 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    id: `epg-${channelId}-late18`,
    channelId,
    channelName,
    title: 'Kinema e Natës (18+)',
    description: 'Film me përmbajtje për të rritur — kërkohet kodi prindëror.',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    isAdult: true,
    isLive: false,
    thumbnail: 'https://placehold.co/320x180/212121/fff?text=18%2B',
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
    ? mockChannels.filter((c) => c.id === channelId)
    : mockChannels;

  const today = localTodayKey();
  const items: object[] = [];
  for (const ch of channels) {
    for (const d of dates) {
      items.push(...generateDayEpg(ch.id, ch.name, d));
      if (d === today && ch.id === LIVE_RECHECK_CHANNEL) {
        items.push(lateNightAdultProgram(ch.id, ch.name));
      }
    }
  }
  return items;
}
