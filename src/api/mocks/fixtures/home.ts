/**
 * Mock Home feed — featured heroes (design `.hero`). Scene art reuses the
 * channel thumbnails so the cards look coherent.
 * Design-inferred shapes (no backend yet) — see `types/domain` (22.6b).
 */
import { mockChannels } from './channels';

const sceneFor = (id: string): string =>
  mockChannels.find((c) => c.id === id)?.thumbnailUrl ??
  'https://placehold.co/320x180/141417/EB122F?text=RTSH';

export const mockHeroes = [
  {
    id: 'hero1',
    kicker: 'PREMIERË SONTE',
    title: 'Historia që nuk e dini',
    meta: 'RTSH Film · 20:45 · Dokumentar',
    imageUrl: sceneFor('ch8'),
    channelId: 'ch8',
  },
  {
    id: 'hero2',
    kicker: 'DREJTPËRDREJT',
    title: 'Edicioni Qendror i Lajmeve',
    meta: 'RTSH 1 · 19:30 · Lajme',
    imageUrl: sceneFor('ch1'),
    channelId: 'ch1',
  },
  {
    id: 'hero3',
    kicker: 'SPORT',
    title: 'Magazina Sportive',
    meta: 'RTSH Sport · 21:30 · Sport',
    imageUrl: sceneFor('ch4'),
    channelId: 'ch4',
  },
] as const;
