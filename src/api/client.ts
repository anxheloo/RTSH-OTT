import { QueryClient } from '@tanstack/react-query';
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

import { useAppStore } from '@/store/useAppStore';
import { ENV } from '@/config/env';

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

/** Registered by the auth mutation layer (4.6). Returns a fresh access token, or null on failure. */
let refreshTokens: (() => Promise<string | null>) | null = null;

export function registerRefreshHandler(fn: (() => Promise<string | null>) | null): void {
  refreshTokens = fn;
}

/** All backend routes live under this version prefix; route constants stay bare. */
export const API_BASE_URL = `${ENV.EXPO_PUBLIC_API_BASE_URL.replace(/\/+$/, '')}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const { token, locale } = useAppStore.getState();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  // App locale (user-switchable in settings), not the device locale.
  config.headers.set('Accept-Language', locale);
  return config;
});

/**
 * Auth-endpoint 401s are credential errors, not stale-token signals, so they
 * must NOT trigger a refresh: a wrong-password `/auth/login` should reject
 * straight to the caller, and a logged-in step-up re-auth must never let a
 * bad password wipe the active session. `/users/*` etc. stay refreshable.
 * (`/auth/refresh` already bypasses this interceptor via `refreshClient`.)
 */
const isAuthRoute = (url?: string): boolean => !!url && url.startsWith('/auth/');

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    const status = error.response?.status;

    // 426 Upgrade Required — backend's force-update gate (compares
    // X-App-Version against its minimum). Blocking modal; never retried.
    if (status === 426) {
      useAppStore.getState().updateModalSlice({ currentModal: 'forceUpdate', modalData: {} });
      return Promise.reject(error);
    }

    if (status !== 401 || !original || original._retry || !refreshTokens || isAuthRoute(original.url)) {
      return Promise.reject(error);
    }

    original._retry = true;

    // Single-flight dedup lives inside refreshAccessToken (shared with the
    // boot background refresh). A null here can mean a transient failure
    // (offline, 5xx) — never log out from this layer; the refresh handler
    // already wiped the session itself on a confirmed 401/403.
    const newToken = await refreshTokens();

    if (!newToken) {
      return Promise.reject(error);
    }

    original.headers.set('Authorization', `Bearer ${newToken}`);
    return apiClient.request(original as AxiosRequestConfig);
  },
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof AxiosError && error.response?.status === 401) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: false,
    },
  },
});
