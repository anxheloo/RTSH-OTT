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
 * string) before returning this shape. Geo-blocking is no longer a list flag —
 * it's enforced by the CDN on channel open (`GET /channels/{id}`).
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
  /** Channel opened on tap. Only live/airing items are tappable; upcoming items are not. */
  channelId: string;
  /** True when the programme is currently airing — enables tap-to-open. Upcoming items are false. */
  isLive: boolean;
}

/**
 * Wire DTO from `GET /api/v1/guide` — one entry per channel with its currently
 * airing programme (`now`). The channel identity is `id` / `name` (same as the
 * channels endpoint), NOT `channelId` / `channelName`. No `next` is returned.
 */
export interface GuideChannelDto {
  id: number | string;
  name: string;
  logoUrl?: string;
  imageUrl?: string;
  now: GuideProgramDto | null;
}

/**
 * Domain "now on TV" guide row — `GET /api/v1/guide` mapped (int64 id → string).
 * `now` carries only the airing programme; the bar's progress is derived
 * client-side from `now.start` / `now.end`.
 */
export interface GuideChannel {
  channelId: string;
  channelName: string;
  logoUrl?: string;
  imageUrl?: string;
  now: {
    id: string;
    title: string;
    description: string;
    start: string; // ISO 8601
    end: string;   // ISO 8601
    isAdult: boolean;
  } | null;
}

/** Wire DTO from `GET /channels/{id}/epg` — plain array, minimal fields. */
export interface GuideProgramDto {
  id: number;
  name: string;
  description: string;
  start: string;   // ISO 8601
  end: string;     // ISO 8601
  ageRating?: string;
  isAdult: boolean;
  hasCatchup?: boolean;
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
  /**
   * Whether a catch-up recording exists for this (finished) programme. `false`
   * → no recording, so the past row is non-playable (pale, non-pressable).
   * Absent/`true` → playable as recorded. Only meaningful for past programmes.
   */
  hasCatchup?: boolean;
  thumbnail?: string;
  // Playback data — embedded by the mock; fetched separately from /epg/{programId}
  // in production once the backend implements the catch-up endpoint.
  decision?: string;
  programId?: string;
  noticeMessage?: string;
  streams?: Record<string, string>;
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

/**
 * Player quality / ABR level (design `QUAL` picker). `auto` = adaptive ABR
 * (the `master` playlist). Every other value is a backend rendition key taken
 * verbatim from `PlaybackDecision.streams` (e.g. `720p`, `540p`, `360p`) — the
 * list is fully dynamic, so a key the backend renames or adds flows through
 * unchanged. `(string & {})` keeps the `'auto'` literal hint while accepting any key.
 */
export type QualityId = 'auto' | (string & {});

export interface QualityOption {
  id: QualityId;
  /** Display label (design `Auto` / `1080p` …). */
  label: string;
  /** Secondary description (design `Përshtatet me lidhjen (ABR)`). */
  description?: string;
}

/**
 * Playback decision returned by `GET /channels/{id}` and
 * `GET /channels/{channelId}/epg/{programId}`.
 * `decision` is a loose string for now — exact union values TBD with the backend
 * (`ALLOWED` confirmed). `streams` maps quality keys (`master`, `720p`, `540p`, …)
 * to HLS URLs; `master` is the ABR playlist, rendition keys are `QualityId`-shaped
 * fixed-rendition child playlists. `sessionId` identifies this playback session; `expiresAt` is
 * the ISO-8601 instant the signed stream URLs stop being valid.
 */
export interface PlaybackDecision {
  decision: string;
  channelId: string;
  programId: string;
  noticeMessage?: string;
  streams: Record<string, string>;
  sessionId: string;
  expiresAt: string;
}

/* ===========================================================================
 * Ads. The backend decides whether an ad applies for a placement; the client
 * renders whatever creative it receives. Placement orchestration (frequency
 * cap, scheduling) is server-authoritative.
 * =========================================================================== */

/** Ad trigger placement passed as a query param to `GET /ads`. */
export type AdPlacement = 'APP_OPEN' | 'CHANNEL_CHANGE' | 'MID_ROLL';

/** Creative returned by `GET /ads?placement=...` — mirrors `AdCreativeDTO`. */
export interface AdCreative {
  id: number;
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  durationSeconds: number;
  skippable: boolean;
  skipAfterSeconds: number;
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

export type EducationDto = keyof typeof EDUCATION_FROM_DTO;

export const toEducationDto = (education: User['educationLevel'] & string): EducationDto =>
  education.toUpperCase() as EducationDto;

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
 * Coarse platform class the backend uses to pick the right player URL — sent as
 * a query param on the playback requests (`GET /channels/{id}` and the catch-up
 * playback endpoint). Derived from `DeviceType` — see `getDeviceClass()`.
 * Distinct from the responsive layout class (`@/responsive`, phone/tablet/tv):
 * this is the *physical platform* the backend serves streams for.
 */
export type DeviceClass = 'MOBILE' | 'TV' | 'STB';

/**
 * `PUT /users/me/device` body — registers/upserts this device for the logged-in
 * account. `deviceKey` is the stable keychain UUID sent on app entry.
 */
export interface DeviceRegistration {
  deviceKey: string;
  type: DeviceType;
  model: string;
  operatingSystem: string;
  appVersion: string;
}
