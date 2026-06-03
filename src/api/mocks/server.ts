/**
 * Mock server for React Native. Replaces the axios adapter on `apiClient` with
 * one that intercepts matching routes and returns fixture data, falling through
 * to the real network for anything unmatched.
 *
 * Call `initMockServer()` once at module load time (before any API calls) when
 * `EXPO_PUBLIC_API_MODE === 'mock'`. Idempotent — safe to import in multiple places.
 */
import { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '../client';
import { handlers } from './handlers';

let installed = false;

export function initMockServer(): void {
  if (installed) return;
  installed = true;

  const realAdapter = apiClient.defaults.adapter as AxiosAdapter;

  (apiClient.defaults as { adapter: unknown }).adapter = async (
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
      return {
        data,
        status,
        statusText: status < 400 ? 'OK' : 'Error',
        headers: { 'content-type': 'application/json' },
        config,
        request: {},
      } as AxiosResponse;
    }

    return (realAdapter as (c: InternalAxiosRequestConfig) => Promise<AxiosResponse>)(config);
  };
}

type Handler = (typeof handlers)[number];
