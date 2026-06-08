/**
 * Channel package metadata (design `PKGS`). Shared by the Home filter chips,
 * Guide, and Search. Labels are Albanian for now — move to i18n in 22.16.
 */
import type { ChannelPackage } from '@/types/domain';

export const CHANNEL_PACKAGES: readonly ChannelPackage[] = [
  'base',
  'sport',
  'news',
  'kids',
  'music',
  'regional',
] as const;

/** Filter value: a package or the "all" sentinel (design "Të gjitha"). */
export type PackageFilter = ChannelPackage | 'all';

// TODO(anx 2026-06-08): replace with i18n keys in 22.16.
export const PACKAGE_LABEL: Record<ChannelPackage, string> = {
  base: 'Bazë',
  sport: 'Sport',
  news: 'Lajme',
  kids: 'Fëmijë',
  music: 'Muzikë',
  regional: 'Rajonale',
};

export const ALL_PACKAGES_LABEL = 'Të gjitha';
