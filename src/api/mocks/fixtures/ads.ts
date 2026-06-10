/**
 * Mock ad creatives (design `adpop`). The launch creative mirrors the HTML
 * mockup's NOVA "Internet 5G" promo — a static image ad (brand surface + copy +
 * CTA), no `imageUrl` so it renders the brand-dark creative exactly like the
 * design. `channelSwitch` / `scheduled` are wired in Phase 16.
 */
import type { AdCreative, AdSlot } from '@/types/domain';

const novaLaunch: AdCreative = {
  id: 'ad-launch-nova',
  brand: 'NOVA',
  brandMonogram: 'N',
  tag: 'Ofertë speciale',
  headline: 'Internet 5G\npa limit',
  subtitle: 'Vetëm 1.500 L / muaj · Aktivizo sot',
  ctaLabel: 'Mëso më shumë',
  ctaUrl: 'https://www.rtsh.al',
};

export const mockAdCreatives: Partial<Record<AdSlot, AdCreative>> = {
  launch: novaLaunch,
};
