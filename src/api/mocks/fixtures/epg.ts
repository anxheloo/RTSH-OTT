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

function generateDayEpg(channelId: string, dateStr: string) {
  const items = [];
  let cursor = new Date(`${dateStr}T06:00:00`);

  for (let i = 0; i < PROGRAMS_PER_CHANNEL.length; i++) {
    const prog = PROGRAMS_PER_CHANNEL[i % PROGRAMS_PER_CHANNEL.length];
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + prog.duration * 60_000);
    epgIdCounter += 1;
    items.push({
      id: `epg-${channelId}-${dateStr}-${epgIdCounter}`,
      channelId,
      title: prog.title,
      description: `${prog.title} — emision i transmetuar nga RTSH TANI.`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isAdult: prog.isAdult,
      thumbnail: `https://placehold.co/320x180/212121/fff?text=${encodeURIComponent(prog.title)}`,
    });
    cursor = end;
  }
  return items;
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

  const items: object[] = [];
  for (const ch of channels) {
    for (const d of dates) {
      items.push(...generateDayEpg(ch.id, d));
    }
  }
  return items;
}
