import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

import { useAppStore } from '@/store/useAppStore';
import i18n from '@/i18n';

/**
 * Hybrid error routing for forms. Screens that render an inline error (auth
 * forms, change-password) set `meta: INLINE_CLIENT_ERROR`: the global modal is
 * suppressed for *client* (4xx) failures — the expected, field-actionable ones
 * the form already shows inline — but still fires for *unexpected* failures
 * (5xx, network, timeout) the form can't meaningfully render. The inline side
 * mirrors the same 4xx boundary via `authErrorMessage` (returns `undefined` for
 * 5xx/network), so a request never shows both an inline message and a modal.
 */
export const INLINE_CLIENT_ERROR = { inlineClientError: true } as const;

/**
 * Fully suppresses the global error modal for a query/mutation, at *any* status
 * — for fire-and-forget metadata calls (e.g. device registration) where a
 * failure is non-actionable and must never surface to the user.
 */
export const SILENT_ERROR = { silentError: true } as const;

// Type the meta flags for both queries and mutations.
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { inlineClientError?: boolean; silentError?: boolean };
    mutationMeta: { inlineClientError?: boolean; silentError?: boolean };
  }
}

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Refresh handler injected by the auth layer at boot via `setupAuthRefresh()`.
 * This client stays a thin transport module: it knows *when* to refresh (401)
 * but not *how* — the handler (which touches the store, keychain, and logout)
 * is registered from one layer up. Same shape as `axios-auth-refresh`'s
 * `createAuthRefreshInterceptor(instance, refreshLogic)` / `react-native-axios-jwt`'s
 * `applyAuthTokenInterceptor` — injection also breaks the client↔auth-service
 * import cycle. Returns a fresh access token, or null on failure.
 */
let refreshTokens: (() => Promise<string | null>) | null = null;

export function registerRefreshHandler(fn: (() => Promise<string | null>) | null): void {
  refreshTokens = fn;
}

/**
 * Backend base URL — hardcoded in source so it's bundled identically for local,
 * EAS, and OTA builds (no dependency on a build-time `.env`). Route constants
 * stay bare; the `/api/v1` version prefix lives here.
 */
// export const API_BASE_URL = 'http://46.183.121.56:8089/api/v1';
export const API_BASE_URL = 'https://api.mcn-mw.com/api/v1/';

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

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      !refreshTokens ||
      isAuthRoute(original.url)
    ) {
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

/**
 * Statuses the interceptor already owns end-to-end, so the global error handler
 * must stay silent on them: 401/403 → refresh-or-logout (+ session-expired
 * notify in `refreshAccessToken`), 426 → blocking `forceUpdate` modal.
 */
const isHandledByInterceptor = (status?: number): boolean =>
  status === 401 || status === 403 || status === 426;

/**
 * A 4xx the user can act on (validation, conflict, bad credentials). These are
 * the inline-rendered class — forms with `meta: INLINE_CLIENT_ERROR` suppress
 * the modal for them. 5xx / network / timeout (no `status`) fall through to the
 * modal. Keep this boundary in lock-step with `authErrorMessage`'s 4xx gate.
 */
const isClientError = (status?: number): boolean =>
  status !== undefined && status >= 400 && status < 500;

/** Prefer the backend's message when present; else `undefined` → ModalWrapper's localized default. */
const apiErrorDescription = (error: unknown): string | undefined => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? undefined;
  }
  return undefined;
};

/**
 * Centralized error handling (TanStack v5 removed per-`useQuery` `onError`).
 * Unexpected failures (5xx, network, 404…) surface the `apiError` modal once,
 * from one place — queries offer Retry (refetch), mutations a dismiss. Forms
 * that render inline set `meta: INLINE_CLIENT_ERROR`, which suppresses the modal
 * only for client (4xx) errors — 5xx/network still modal (see the meta JSDoc).
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const status = error instanceof AxiosError ? error.response?.status : undefined;
      if (query.meta?.silentError) return;
      if (query.meta?.inlineClientError && isClientError(status)) return;
      if (isHandledByInterceptor(status)) return;
      useAppStore.getState().updateModalSlice({
        currentModal: 'apiError',
        modalData: {
          description: apiErrorDescription(error),
          button: i18n.t('common.retry'),
          action: () => void query.fetch(),
        },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      const status = error instanceof AxiosError ? error.response?.status : undefined;
      if (mutation.meta?.silentError) return;
      if (mutation.meta?.inlineClientError && isClientError(status)) return;
      if (isHandledByInterceptor(status)) return;
      useAppStore.getState().updateModalSlice({
        currentModal: 'apiError',
        modalData: { description: apiErrorDescription(error) },
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 15 * 60_000,
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
