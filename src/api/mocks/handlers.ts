/**
 * Mock handlers: map HTTP method + URL pattern → fixture response.
 * URL matching is against `config.url` (the path after baseURL).
 */
import { InternalAxiosRequestConfig } from 'axios';

import { mockAuthResponse, mockUser } from './fixtures/auth';
import { mockCatchupItems } from './fixtures/catchup';
import { MOCK_LIVE_STREAM,mockChannels } from './fixtures/channels';
import { mockAppConfig } from './fixtures/config';
import { getMockEpg } from './fixtures/epg';
import { mockRadioStations } from './fixtures/radio';

type MockResponse = { status?: number; data: unknown };

type Handler = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | '*';
  test: (url: string) => boolean;
  delay?: number;
  respond: (config: InternalAxiosRequestConfig) => MockResponse;
};

export const handlers: Handler[] = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/login'),
    respond: () => ({ data: mockAuthResponse }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/register'),
    respond: () => ({ data: mockAuthResponse }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/refresh'),
    respond: () => ({ data: mockAuthResponse }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/logout'),
    respond: () => ({ data: { success: true } }),
  },
  {
    method: 'post',
    test: (u) => u.endsWith('/auth/forgot-password'),
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
    respond: (cfg) => ({ data: { user: { ...mockUser, ...(cfg.data as object) } } }),
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
    respond: () => ({ data: { streamUrl: MOCK_LIVE_STREAM, headers: {} } }),
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
];
