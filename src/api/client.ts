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

export const apiClient = axios.create({
  baseURL: ENV.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let inflightRefresh: Promise<string | null> | null = null;

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

    if (status !== 401 || !original || original._retry || !refreshTokens || isAuthRoute(original.url)) {
      return Promise.reject(error);
    }

    original._retry = true;

    inflightRefresh ??= refreshTokens().finally(() => {
      inflightRefresh = null;
    });

    const newToken = await inflightRefresh;

    if (!newToken) {
      // logout is async (clears keychain + store); fire-and-forget from the
      // interceptor — the rejected request is what surfaces to the caller.
      void useAppStore.getState().logout();
      return Promise.reject(error);
    }

    original.headers.set('Authorization', `Bearer ${newToken}`);
    return apiClient.request(original as AxiosRequestConfig);
  },
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof AxiosError && error.response?.status === 401) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
