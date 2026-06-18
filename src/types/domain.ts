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
  /**
   * Profile details collected at registration (design "Të dhënat e llogarisë").
   * Optional — older accounts / partial backends may omit them; the account
   * screen renders a placeholder for missing values. `gender` mirrors the
   * register form's GENDERS union (`features/auth/schemas`).
   */
  username?: string;
  age?: number;
  location?: string;
  gender?: 'male' | 'female' | 'other' | 'unspecified';
  /** Highest completed education level (register `educationLevel`, optional). */
  educationLevel?: 'high' | 'medium' | 'low';
  avatarUrl?: string;
  /** Active package + entitlement (design profile badge "Paketa Bazë · 32 kanale"). */
  subscription?: Subscription;
}

/** A user's package entitlement (design profile/settings badge). */
export interface Subscription {
  package: string;
  /** Number of channels the package unlocks (design "· 32 kanale"). */
  channelCount: number;
}


/** Discriminator for the unified channels endpoint (`GET /channels?type=TV|RADIO`). */
export type ChannelType = 'TV' | 'RADIO';

/**
 * Unified channel / radio-station — maps `EndUserChannelDTO` from
 * `GET /api/v1/channels?type=TV|RADIO`. The service transforms `id` (int32 →
 * string) and `geoRestricted` → `geoBlocked` before returning this shape.
 *
 * `isAdult` is absent from the list response and only populated by the detail
 * endpoint (`GET /channels/{id}`); the list query leaves it undefined.
 */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  sortOrder: number;
  logoUrl: string;
  /** Thumbnail for TV cards; artwork for the radio player (design `scene` / `rp-art`). */
  imageUrl?: string;
  geoBlocked: boolean;
  /** Present only on the detail response (`GET /channels/{id}`). */
  isAdult?: boolean;
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
  // Playback data — same shape as PlaybackDecision, embedded so tapping a
  // program row can swap the player source without an extra network request.
  decision: string;
  programId: string;
  noticeMessage?: string;
  streams: Record<string, string>;
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
  /** True for dates after today — EPG is a schedule, not catch-up. */
  isFuture: boolean;
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

/**
 * Playback decision returned by `GET /channels/{id}`.
 * `decision` is a loose string for now — exact union values TBD with the backend.
 * `streams` maps quality keys (`master`, `720`, `480`, …) to HLS URLs;
 * `master` is the ABR playlist, numeric keys are fixed-rendition child playlists.
 */
export interface PlaybackDecision {
  decision: string;
  channelId: string;
  programId: string;
  noticeMessage?: string;
  streams: Record<string, string>;
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
 * Runtime validation (Zod) — auth boundary guards (plan 5.X.2 / 11.X.9).
 * The backend speaks `UserDTO` (int64 id, `username`, UPPERCASE enums); the app
 * speaks the `User` interface above. `userDtoSchema` validates the wire shape
 * AND transforms it into the domain shape in one parse, so a backend change
 * (missing token, renamed field) is rejected at the boundary instead of
 * silently persisting `undefined`.
 * =========================================================================== */

/** Backend gender/education enums ⇄ domain unions. */
const GENDER_FROM_DTO = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  UNSPECIFIED: 'unspecified',
} as const;

export type GenderDto = keyof typeof GENDER_FROM_DTO;

export const toGenderDto = (gender: User['gender'] & string): GenderDto =>
  gender.toUpperCase() as GenderDto;

const EDUCATION_FROM_DTO = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

const ageFromBirthDate = (birthDate?: string | null): number | undefined => {
  if (!birthDate) return undefined;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  return now.getFullYear() - born.getFullYear() - (beforeBirthday ? 1 : 0);
};

/**
 * Backend `UserDTO` → domain `User`. `id` may arrive as int64 → stringified;
 * `displayName` falls back to `username` (no display-name field on the wire);
 * `birthDate` / `city` + `country` are derived into the profile screen's
 * `age` / `location`. The parental gate is device-level (client-only, see
 * `ParentalSlice`), so it is intentionally NOT part of this wire shape.
 */
export const userDtoSchema = z
  .looseObject({
    id: z.union([z.string(), z.number()]),
    email: z.string().min(1),
    username: z.string().min(1),
    birthDate: z.string().nullish(),
    city: z.string().nullish(),
    country: z.string().nullish(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).nullish(),
    educationLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).nullish(),
    avatarUrl: z.string().nullish(),
  })
  .transform(
    (dto): User => ({
      id: String(dto.id),
      email: dto.email,
      displayName: dto.username,
      username: dto.username,
      age: ageFromBirthDate(dto.birthDate),
      location: [dto.city, dto.country].filter(Boolean).join(', ') || undefined,
      gender: dto.gender ? GENDER_FROM_DTO[dto.gender] : undefined,
      educationLevel: dto.educationLevel ? EDUCATION_FROM_DTO[dto.educationLevel] : undefined,
      avatarUrl: dto.avatarUrl ?? undefined,
    }),
  );

/**
 * Token-pair response from the endpoints that ROTATE the refresh token
 * (`POST /users/me/change-password`). Unlike `/auth/refresh`, these return a
 * fresh refresh token too, so the caller must rewrite the keychain copy.
 */
export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type TokenPair = z.infer<typeof tokenPairSchema>;

/** Login + register-verify payload. Validated before any token touches the keychain. */
export const authResponseSchema = z.object({
  user: userDtoSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

/**
 * Refresh response carries ONLY a new access token (no user, no rotation —
 * the refresh token is static until expiry; backend decision 2026-06-12).
 * Extra wire fields (`tokenType`, `expiresInSeconds`) are ignored.
 */
export const refreshResponseSchema = z.looseObject({
  accessToken: z.string().min(1),
});

/** Reset step 2 — the one-time token that authorizes the new-password POST. */
export const resetVerifyResponseSchema = z.object({
  resetToken: z.string().min(1),
});

export interface AppConfig {
  version: string;
  forceUpdate: boolean;
  minVersion: string;
  tcUrl: string;
  privacyUrl: string;
  ads: {
    launchEnabled: boolean;
    channelSwitchEnabled: boolean;
    channelSwitchFrequency: number;
    scheduledEnabled: boolean;
  };
  geoRestricted: boolean;
  supportedLocales: string[];
}

/**
 * Backend platform discriminator (`X-Device-Platform` header + `/app/version`
 * query param). The backend uses it to pick the stream manifest / ABR ladder.
 * `tizen` / `webos` exist in the contract but are served by separate web apps.
 */
export type DevicePlatform = 'ios' | 'android' | 'androidtv' | 'androidstb' | 'tizen' | 'webos';

/** `GET /app/version?platform=…` — version gate / STB self-update check. */
export interface AppVersionInfo {
  platform: DevicePlatform;
  latestVersion: string;
  minSupportedVersion: string;
  /** Direct APK URL for sideloaded platforms (androidstb). Absent on store builds. */
  downloadUrl?: string;
}

/**
 * Form-factor + OS discriminator for the device registry (`PUT /users/me/device`).
 * Confirmed from the OpenAPI `DeviceInfoDTO` enum (2026-06-12). `TIZEN_TV` /
 * `WEBOS_TV` belong to the separate web apps — this client never sends them.
 */
export type DeviceType =
  | 'PHONE_IOS'
  | 'PHONE_ANDROID'
  | 'TABLET_IPADOS'
  | 'TABLET_ANDROID'
  | 'ANDROID_TV'
  | 'STB_ANDROID'
  | 'TIZEN_TV'
  | 'WEBOS_TV';

/**
 * `PUT /users/me/device` body — registers/upserts this device for the logged-in
 * account. `deviceKey` is the same keychain UUID sent as `X-Device-Id`.
 */
export interface DeviceRegistration {
  deviceKey: string;
  type: DeviceType;
  model: string;
  operatingSystem: string;
  appVersion: string;
}
