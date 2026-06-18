/**
 * Channel package metadata (design `PKGS`). Shared by the Home filter chips,
 * Guide, and Search. Labels are Albanian for now — move to i18n in 22.16.
 * `ChannelPackage` was removed from the domain type (2026-06-18); the type is
 * defined locally here since it's a UI concern (filter chips), not a backend field.
 */

export type ChannelPackage = 'base' | 'sport' | 'news' | 'kids' | 'music' | 'regional';

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