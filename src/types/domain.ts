/**
 * Domain types — reconciled to the designer HTML data model (Phase 22.6b).
 * Mirrors the mockup's `CH` / `EPG` / `RADIO` / `DAYS` / `QUAL` / `PKGS` shapes,
 * plus the Home hero/continue cards and the profile package badge. The Hero /
 * Continue / Subscription shapes are design-inferred — validate against the real
 * backend contract when it lands (no query backs them yet).
 */
import { z } from 'zod';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  /** Active package + entitlement (design profile badge "Paketa Bazë · 32 kanale"). */
  subscription?: Subscription;
  /**
   * Whether a per-account parental PIN exists on the backend (source of truth).
   * Hydrates `ParentalSlice.isPinSet` on login so a fresh device knows to gate.
   * The PIN itself is never sent down — only this flag. See plan 22.14b.
   */
  parentalPinSet?: boolean;
}

/** A user's package entitlement (design profile/settings badge). */
export interface Subscription {
  package: ChannelPackage;
  /** Number of channels the package unlocks (design "· 32 kanale"). */
  channelCount: number;
}

/**
 * Channel package — the design's filter chips (`PKGS`). "Të gjitha" (All) is a
 * UI-only filter sentinel, not a package, so it is not part of this union.
 */
export type ChannelPackage = 'base' | 'sport' | 'news' | 'kids' | 'music' | 'regional';

export interface Channel {
  id: string;
  name: string;
  logoUrl: string;
  /** Scene / last-frame artwork for cards + mosaic tiles (design `scene`). */
  thumbnailUrl?: string;
  /** Package the channel belongs to (design chip filter). */
  package: ChannelPackage;
  /** Broadcasting live right now → design LIVE tag. */
  isLive: boolean;
  /** Adult / parental-locked channel → PIN gate (design `lock` 18+ tag). */
  isAdult: boolean;
  /** Geo-restricted channel → geo overlay (design `geo` tag). */
  geoBlocked: boolean;
  /** Optional inline stream URL; live streams normally come from the streams endpoint. */
  streamUrl?: string;
}

/**
 * Featured hero promo on Home (design `.hero` carousel item). `meta` is the
 * pre-composed line the design renders ("RTSH Film · 20:45 · Dokumentar");
 * structured fields are kept for flexibility.
 */
export interface HeroItem {
  id: string;
  /** Red kicker badge (design `.kick`, e.g. "PREMIERË SONTE"). */
  kicker: string;
  title: string;
  /** Secondary line under the title (design `.meta`). */
  meta: string;
  imageUrl: string;
  /** Channel opened on tap. */
  channelId: string;
}

/**
 * Continue-watching card on Home (design `.hcard` + `.pgbar`). Derived from
 * resume positions joined with the program; `progress` is the watched fraction.
 */
export interface ContinueItem {
  id: string;
  channelId: string;
  /** Channel name shown as the card subtitle (design `.sub`). */
  channelName: string;
  /** Program title shown as the card title (design `.ttl`). */
  title: string;
  thumbnailUrl: string;
  /** Watched fraction 0–1 (design progress bar width). */
  progress: number;
}

export interface EpgItem {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  isAdult: boolean;
  /** Currently airing — design `prog` now-state (highlighted row + play glyph). */
  isLive?: boolean;
  thumbnail?: string;
}

export interface CatchupItem {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  duration: number;  // seconds
  thumbnail?: string;
  streamUrl: string;
  airDate: string;   // ISO 8601
  isAdult: boolean;
}

/** Catch-up day-strip entry (design `DAYS` → `[weekday, date]`, today flagged). */
export interface CatchupDay {
  /** ISO date `YYYY-MM-DD`, used as the query key + list key. */
  key: string;
  /** Localized weekday label (design `E Diel` / `Sot`). */
  weekday: string;
  /** Short date label (design `31.05`). */
  date: string;
  isToday: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  logoUrl: string;
  /** Scene artwork for the radio player (design `rp-art`). */
  artworkUrl?: string;
  /** Stream bitrate shown in the player subtitle (design "128 kbps"). */
  bitrateKbps?: number;
}

/** Player quality / ABR level (design `QUAL` picker). `auto` = adaptive ABR. */
export type QualityId = 'auto' | '1080p' | '720p' | '576p' | '360p';

export interface QualityOption {
  id: QualityId;
  /** Display label (design `Auto` / `1080p` …). */
  label: string;
  /** Secondary description (design `Përshtatet me lidhjen (ABR)`). */
  description?: string;
}

/* ===========================================================================
 * Ads (design `adpop`). v1 creatives are static (image / brand gradient + copy
 * + CTA); video creatives are a later capability. The `AdOverlay` component
 * renders an `AdCreative`; the slot orchestration (when/where, frequency cap,
 * scheduling) is Phase 16, driven by `AppConfig.ads` + an ad-manifest service.
 * =========================================================================== */

/** Where an ad is triggered. Orchestration lives in Phase 16. */
export type AdSlot = 'launch' | 'channelSwitch' | 'scheduled';

/** A single promotional creative shown in the AdOverlay. */
export interface AdCreative {
  id: string;
  /** Advertiser name shown in the brand row (design "NOVA"). */
  brand: string;
  /** Monogram fallback when there's no `brandLogoUrl` (design white "N" tile). */
  brandMonogram?: string;
  brandLogoUrl?: string;
  /** Eyebrow above the headline (design "Ofertë speciale"). */
  tag: string;
  headline: string;
  subtitle?: string;
  /** Call-to-action label (design "Mëso më shumë"). */
  ctaLabel: string;
  /** Clickthrough URL opened on CTA tap. */
  ctaUrl?: string;
  /** Creative art; falls back to the brand gradient when absent. */
  imageUrl?: string;
}

/* ===========================================================================
 * Runtime validation (Zod) — auth boundary guards (plan 5.X.2).
 * The interfaces above are the full design contract; these schemas are the
 * runtime guard for the fields the session flow actually depends on. A backend
 * shape change (e.g. a missing token) is now rejected at the boundary instead
 * of silently persisting `undefined`. `looseObject` keeps unknown backend fields
 * (e.g. `subscription`) rather than stripping them, so the contract can grow
 * without breaking validation. `avatarUrl` is `.nullish()` because the backend
 * may send `null`.
 * =========================================================================== */

export const userSchema = z.looseObject({
  id: z.string().min(1),
  email: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullish(),
  parentalPinSet: z.boolean().optional(),
});

/** Login + refresh + register-completion payload. Validated before any token touches the keychain. */
export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export interface AppConfig {
  version: string;
  forceUpdate: boolean;
  minVersion: string;
  tcUrl: string;
  privacyUrl: string;
  /** Channel packages offered to this client (design `PKGS`, minus the All filter). */
  packages?: ChannelPackage[];
  ads: {
    launchEnabled: boolean;
    channelSwitchEnabled: boolean;
    channelSwitchFrequency: number;
    scheduledEnabled: boolean;
  };
  geoRestricted: boolean;
  supportedLocales: string[];
}
