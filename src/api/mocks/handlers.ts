/**
 * Mock handlers: map HTTP method + URL pattern → fixture response.
 * URL matching is against `config.url` (the path after baseURL).
 */
import { InternalAxiosRequestConfig } from 'axios';

import type { AdSlot } from '@/types/domain';

import { mockAdCreatives } from './fixtures/ads';
import { mockAuthResponse, mockUser } from './fixtures/auth';
import {
  mockRegisterDetails,
  mockRegisterStart,
  mockRegisterVerify,
  mockResetPassword,
  mockResetRequest,
  mockResetVerify,
} from './fixtures/authFlow';
import { mockCatchupItems } from './fixtures/catchup';
import { MOCK_LIVE_STREAM,mockChannels } from './fixtures/channels';
import { mockAppConfig } from './fixtures/config';
import { getMockEpg } from './fixtures/epg';
import { mockContinueWatching, mockHeroes } from './fixtures/home';
import {
  clearMockParentalPin,
  isMockParentalPinSet,
  setMockParentalPin,
  verifyMockParentalPin,
} from './fixtures/parental';
import { mockRadioStations } from './fixtures/radio';

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

/**
 * Stamps the live `parentalPinSet` flag (from the parental mock) onto any user
 * payload so the client can hydrate `isPinSet` on login / profile fetch (22.14b).
 */
const userWithPin = () => ({ ...mockUser, parentalPinSet: isMockParentalPinSet() });

export const handlers: Handler[] = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/login'),
    respond: () => ({ data: { ...mockAuthResponse, user: userWithPin() } }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/refresh'),
    respond: () => ({ data: { ...mockAuthResponse, user: userWithPin() } }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/logout'),
    respond: () => ({ data: { success: true } }),
  },

  // Registration wizard (specific routes before the bare `/auth/register`).
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register/verify'),
    delay: 400,
    respond: (cfg) => mockRegisterVerify(parseBody<{ email?: string; code?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register/details'),
    delay: 400,
    respond: (cfg) => mockRegisterDetails(parseBody<{ email?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register/resend'),
    respond: () => ({ data: { success: true } }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register'),
    delay: 400,
    respond: (cfg) => mockRegisterStart(parseBody<{ email?: string; username?: string }>(cfg.data)),
  },

  // Password-reset wizard.
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/forgot-password'),
    delay: 400,
    respond: (cfg) => mockResetRequest(parseBody<{ email?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/reset/verify'),
    delay: 400,
    respond: (cfg) => mockResetVerify(parseBody<{ email?: string; code?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/reset/password'),
    delay: 400,
    respond: (cfg) => mockResetPassword(parseBody<{ email?: string }>(cfg.data)),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/reset/resend'),
    respond: () => ({ data: { success: true } }),
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u.endsWith('/users/me'),
    respond: () => ({ data: { user: mockUser } }),
  },
  {
    method: 'patch',
    test: (u) => u.endsWith('/users/me'),
    respond: (cfg) => ({ data: { user: { ...userWithPin(), ...(cfg.data as object) } } }),
  },

  // ── Parental PIN (per-account; backend is source of truth — plan 22.14b) ────
  {
    method: 'post',
    test: (u) => u.endsWith('/users/parental-pin/verify'),
    delay: 300,
    respond: (cfg) => {
      const { pin } = parseBody<{ pin?: string }>(cfg.data);
      return { data: { valid: verifyMockParentalPin(pin) } };
    },
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/users/parental-pin'),
    delay: 300,
    respond: (cfg) => {
      const { pin } = parseBody<{ pin?: string }>(cfg.data);
      setMockParentalPin(pin);
      return { data: { success: true } };
    },
  },
  {
    method: 'delete',
    test: (u) => u.endsWith('/users/parental-pin'),
    respond: () => {
      clearMockParentalPin();
      return { data: { success: true } };
    },
  },

  // ── Home feed ──────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u === '/home',
    respond: () => ({ data: { heroes: mockHeroes, continueWatching: mockContinueWatching } }),
  },

  // ── Channels ───────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u === '/channels',
    respond: () => ({ data: { channels: mockChannels } }),
  },
  {
    method: 'get',
    test: (u) => /^\/channels\/[^/]+$/.test(u),
    respond: (cfg) => {
      const id = cfg.url?.split('/').pop();
      const ch = mockChannels.find((c) => c.id === id);
      return ch ? { data: { channel: ch } } : { status: 404, data: { error: 'Channel not found' } };
    },
  },

  // ── Streams ────────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => /^\/streams\//.test(u),
    respond: () => ({ data: { hlsUrl: MOCK_LIVE_STREAM, headers: {} } }),
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
      return item ? { data: { program: item } } : { status: 404, data: { error: 'Program not found' } };
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
    respond: (cfg) => {
      const id = cfg.url?.split('/').pop();
      const item = mockCatchupItems.find((c) => c.id === id);
      return item ? { data: { item } } : { status: 404, data: { error: 'Not found' } };
    },
  },

  // ── Radio ──────────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u === '/radio',
    respond: () => ({ data: { stations: mockRadioStations } }),
  },
  {
    method: 'get',
    test: (u) => /^\/radio\/[^/]+$/.test(u),
    respond: (cfg) => {
      const id = cfg.url?.split('/').pop();
      const st = mockRadioStations.find((r) => r.id === id);
      return st ? { data: { station: st } } : { status: 404, data: { error: 'Not found' } };
    },
  },

  // ── Config ─────────────────────────────────────────────────────────────────
  {
    method: 'get',
    test: (u) => u === '/config',
    respond: () => ({ data: mockAppConfig }),
  },

  // ── Ads (server-authoritative slot gating — plan 16.1) ──────────────────────
  {
    method: 'get',
    test: (u) => /^\/ads\/[^/]+$/.test(u),
    delay: 200,
    respond: (cfg) => {
      const slot = cfg.url?.split('/').pop() as AdSlot | undefined;
      // Launch slot is gated on the config flag; other slots are Phase 16.
      const ad =
        slot === 'launch' && mockAppConfig.ads.launchEnabled
          ? (mockAdCreatives.launch ?? null)
          : null;
      return { data: { ad } };
    },
  },
];
