/**
 * Mock server for React Native. Replaces the axios adapter on `apiClient` AND
 * `refreshClient` (the bare refresh-only instance) with one that intercepts
 * matching routes and returns fixture data, falling through to the real
 * network for anything unmatched.
 *
 * Call `initMockServer()` once at module load time (before any API calls) when
 * `EXPO_PUBLIC_API_MODE === 'mock'`. Idempotent — safe to import in multiple places.
 */
import { AxiosAdapter, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '../client';
import { refreshClient } from '../services/auth';
import { handlers } from './handlers';

let installed = false;

function installMockAdapter(client: AxiosInstance): void {
  const realAdapter = client.defaults.adapter as AxiosAdapter;

  (client.defaults as { adapter: unknown }).adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> => {
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toLowerCase() as Handler['method'];

    const handler = handlers.find(
      (h) => (h.method === method || h.method === '*') && h.test(url),
    );

    if (handler) {
      if (handler.delay) {
        await new Promise<void>((r) => setTimeout(r, handler.delay));
      }
      const { status = 200, data } = handler.respond(config);
      if (status >= 400) {
        // Mirror axios semantics: non-2xx must REJECT so callers' catch paths run.
        const error = new Error(`Mock request failed with status ${status}`) as Error & {
          isAxiosError: boolean;
          config: InternalAxiosRequestConfig;
          response: Partial<AxiosResponse>;
        };
        error.isAxiosError = true;
        error.config = config;
        error.response = { data, status, statusText: 'Error', config };
        throw error;
      }
      return {
        data,
        status,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
        request: {},
      } as AxiosResponse;
    }

    return (realAdapter as (c: InternalAxiosRequestConfig) => Promise<AxiosResponse>)(config);
  };
}

export function initMockServer(): void {
  if (installed) return;
  installed = true;

  installMockAdapter(apiClient);
  installMockAdapter(refreshClient);
}

type Handler = (typeof handlers)[number];
