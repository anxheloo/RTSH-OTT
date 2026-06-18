/**
 * Mock handlers: map HTTP method + URL pattern → fixture response.
 * URL matching is against `config.url` (the path after baseURL).
 */
import { InternalAxiosRequestConfig } from 'axios';

import type { AdSlot, DevicePlatform } from '@/types/domain';

import { mockAdCreatives } from './fixtures/ads';
import { mockTokens, mockUserDto } from './fixtures/auth';
import {
  mockRegister,
  mockRegisterVerify,
  mockResetPassword,
  mockResetRequest,
  mockResetVerify,
} from './fixtures/authFlow';
import { mockCatchupItems } from './fixtures/catchup';
import { mockChannels } from './fixtures/channels';
import { getMockAppVersion, mockAppConfig } from './fixtures/config';
import { getMockEpg } from './fixtures/epg';
import { mockHeroes } from './fixtures/home';

type MockResponse = { status?: number; data: unknown };

type Handler = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | '*';
  test: (url: string) => boolean;
  delay?: number;
  respond: (config: InternalAxiosRequestConfig) => MockResponse;
};

/** axios serializes the request body to a JSON string before the adapter — parse it back. */
function parseBody<T>(data: unknown): T {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch {
      return {} as T;
    }
  }
  return (data ?? {}) as T;
}

const BIPBOP = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3';

/** Playback streams returned by `GET /channels/{id}` and embedded in EPG items. */
const MOCK_STREAMS: Record<string, string> = {
  master: `${BIPBOP}/bipbop_4x3_variant.m3u8`,
  '720': `${BIPBOP}/gear4/prog_index.m3u8`,
  '576': `${BIPBOP}/gear3/prog_index.m3u8`,
  '360': `${BIPBOP}/gear2/prog_index.m3u8`,
};

export const handlers: Handler[] = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/login'),
    respond: () => ({ data: { ...mockTokens, user: mockUserDto } }),
  },
  {
    // Wire shape mirrors `RefreshTokenResponseDTO` — the client only reads
    // `accessToken`; the extra fields prove the loose schema ignores them.
    method: 'post',
    test: (u) => u.endsWith('/auth/refresh'),
    respond: () => ({
      data: {
        accessToken: mockTokens.accessToken,
        tokenType: 'Bearer',
        expiresInSeconds: 1800,
        refreshToken: mockTokens.refreshToken,
      },
    }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/logout'),
    respond: () => ({ data: {} }),
  },

  // Registration (specific routes before the bare `/auth/register`).
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register/verify'),
    delay: 400,
    respond: (cfg) => mockRegisterVerify(parseBody<{ email?: string; code?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register/resend-otp'),
    respond: () => ({ data: { message: 'Code resent' } }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register'),
    delay: 400,
    respond: (cfg) => mockRegister(parseBody<Parameters<typeof mockRegister>[0]>(cfg.data)),
  },

  // Password reset (verify before the bare `/auth/reset-password`).
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/forgot-password'),
    delay: 400,
    respond: (cfg) => mockResetRequest(parseBody<{ email?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/reset-password/verify'),
    delay: 400,
    respond: (cfg) => mockResetVerify(parseBody<{ email?: string; code?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/reset-password'),
    delay: 400,
    respond: (cfg) =>
      mockResetPassword(parseBody<{ resetToken?: string; newPassword?: string }>(cfg.data)),
  },

  // ── Users (bare `UserDTO` responses — no envelope) ─────────────────────────
  // Change password ROTATES the refresh token → returns a FRESH pair (the
  // client rewrites the keychain). Matched before the bare `/users/me` routes.
  {
    method: 'post',
    test: (u) => u.endsWith('/users/me/change-password'),
    delay: 300,
    respond: () => ({ data: { ...mockTokens } }),
  },
  {
    method: 'get',
    test: (u) => u.endsWith('/users/me'),
    respond: () => ({ data: mockUserDto }),
  },
  {
    method: 'patch',
    test: (u) => u.endsWith('/users/me'),
    respond: (cfg) => ({ data: { ...mockUserDto, ...parseBody<object>(cfg.data) } }),
  },

  // Parental control is device-level (client-only, 2026-06-16) — no endpoints.

  // ── Home feed ──────────────────────────────────────────────────────────────
  // Data routes carry realistic latencies so loading states (skeletons) are
  // actually exercised in mock mode — instant responses hide them entirely.
  {
    method: 'get',
    test: (u) => u === '/home',
    delay: 450,
    respond: () => ({ data: { heroes: mockHeroes } }),
  },

  // ── Channels (TV + Radio unified) ─────────────────────────────────────────
  // Real API: plain array, `type` query param required by the client.
  {
    method: 'get',
    test: (u) => u === '/channels',
    delay: 500,
    respond: (cfg) => {
      const type = (cfg.params as { type?: string } | undefined)?.type;
      const filtered = type ? mockChannels.filter((c) => c.type === type) : mockChannels;
      return { data: filtered };
    },
  },

  // Channel detail — `GET /channels/{id}` returns a PlaybackDecisionDTO:
  // stream URLs + access decision. Channel metadata (name, logo) comes from the list.
  {
    method: 'get',
    test: (u) => /^\/channels\/[^/]+$/.test(u),
    delay: 300,
    respond: (cfg) => {
      const id = cfg.url?.split('/').pop();
      const channel = mockChannels.find((c) => String(c.id) === id);
      if (!channel) return { status: 404, data: { error: 'Channel not found' } };
      return {
        data: {
          decision: 'ALLOWED',
          channelId: channel.id,
          programId: channel.id,
          streams: MOCK_STREAMS,
        },
      };
    },
  },

  // Per-channel EPG — `GET /channels/{id}/epg?date=YYYY-MM-DD`.
  // Each item embeds the same PlaybackDecisionDTO fields so tapping a program
  // row swaps the player source without a separate network request.
  {
    method: 'get',
    test: (u) => /^\/channels\/[^/]+\/epg$/.test(u),
    delay: 400,
    respond: (cfg) => {
      const parts = cfg.url?.split('/') ?? [];
      const channelId = parts[parts.length - 2];
      const params = cfg.params as { date?: string } | undefined;
      return { data: { items: getMockEpg(channelId, params?.date) } };
    },
  },

  // ── EPG ────────────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u === '/epg',
    delay: 400,
    respond: (cfg) => {
      const params = cfg.params as { date?: string; channelId?: string } | undefined;
      return { data: { items: getMockEpg(params?.channelId, params?.date) } };
    },
  },
  {
    method: 'get',
    test: (u) => /^\/epg\/program\/[^/]+$/.test(u),
    respond: (cfg) => {
      const id = cfg.url?.split('/').pop();
      const items = getMockEpg();
      const item = items.find((i) => (i as { id: string }).id === id);
      return item
        ? { data: { program: item } }
        : { status: 404, data: { error: 'Program not found' } };
    },
  },

  // ── Catch-up ───────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u === '/catchup',
    delay: 300,
    respond: () => ({ data: { items: mockCatchupItems } }),
  },
  {
    method: 'get',
    test: (u) => /^\/catchup\/[^/]+$/.test(u),
    delay: 300,
    respond: (cfg) => {
      const id = cfg.url?.split('/').pop();
      const item = mockCatchupItems.find((c) => c.id === id);
      return item ? { data: { item } } : { status: 404, data: { error: 'Not found' } };
    },
  },

  // ── Config ─────────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u === '/config',
    respond: () => ({ data: mockAppConfig }),
  },
  {
    method: 'get',
    test: (u) => u === '/app/version',
    respond: (cfg) => {
      const platform = (cfg.params as { platform?: DevicePlatform } | undefined)?.platform;
      return platform
        ? { data: getMockAppVersion(platform) }
        : { status: 400, data: { error: 'platform is required' } };
    },
  },

  // ── Devices ────────────────────────────────────────────────────────────────
  {
    method: 'put',
    test: (u) => u === '/users/me/device',
    delay: 150,
    respond: (cfg) => {
      const body = cfg.data ? (JSON.parse(cfg.data as string) as { deviceKey?: string }) : {};
      return body.deviceKey
        ? { data: {} }
        : { status: 400, data: { error: 'deviceKey is required' } };
    },
  },

  // ── Ads (server-authoritative slot gating — plan 16.1) ──────────────────────
  {
    method: 'get',
    test: (u) => /^\/ads\/[^/]+$/.test(u),
    delay: 200,
    respond: (cfg) => {
      const slot = cfg.url?.split('/').pop() as AdSlot | undefined;
      const ad =
        slot === 'launch' && mockAppConfig.ads.launchEnabled
          ? (mockAdCreatives.launch ?? null)
          : null;
      return { data: { ad } };
    },
  },
];
