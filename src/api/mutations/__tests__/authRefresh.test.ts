/**
 * Behavior tests for `refreshAccessToken` — the auth-flow invariants that keep
 * users logged in (or correctly logged out):
 *   • single-flight: concurrent callers share ONE refresh request
 *   • transient failure (network/5xx) → null, NO logout, token survives
 *   • confirmed 401/403 → logout + query-cache wipe + session-expired notice
 *   • no refresh token → null without a network call
 *
 * The store, i18n, vault, and client are mocked so the test exercises only this
 * module's decision logic (no MMKV / native imports).
 */
import { AxiosError, AxiosHeaders } from 'axios';

import { useAppStore } from '@/store/useAppStore';
import { getRefreshToken } from '@/lib/tokenVault';

import { queryClient } from '../../client';
import * as authService from '../../services/auth';
import { refreshAccessToken } from '../authRefresh';

jest.mock('@/store/useAppStore', () => {
  const logout = jest.fn(async () => {});
  const updateModalSlice = jest.fn();
  const setState = jest.fn();
  return {
    useAppStore: {
      getState: () => ({ logout, updateModalSlice }),
      setState,
    },
  };
});

jest.mock('@/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

jest.mock('@/lib/tokenVault', () => ({
  getRefreshToken: jest.fn(async () => 'refresh-token'),
}));

jest.mock('../../client', () => ({
  queryClient: { clear: jest.fn() },
  registerRefreshHandler: jest.fn(),
}));

jest.mock('../../services/auth', () => ({
  refresh: jest.fn(),
}));

const mockRefresh = authService.refresh as jest.Mock;
const mockGetRefreshToken = getRefreshToken as jest.Mock;
const store = useAppStore.getState() as unknown as {
  logout: jest.Mock;
  updateModalSlice: jest.Mock;
};

const axios401 = () =>
  new AxiosError('Unauthorized', '401', undefined, undefined, {
    status: 401,
    statusText: 'Unauthorized',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRefreshToken.mockResolvedValue('refresh-token');
});

describe('refreshAccessToken', () => {
  it('returns the new access token and writes it to the store', async () => {
    mockRefresh.mockResolvedValue({ accessToken: 'new-at' });
    await expect(refreshAccessToken()).resolves.toBe('new-at');
    expect(useAppStore.setState).toHaveBeenCalledWith({ token: 'new-at' });
  });

  it('single-flights concurrent callers into ONE network request', async () => {
    let release!: (v: { accessToken: string }) => void;
    mockRefresh.mockReturnValue(new Promise((r) => (release = r)));

    const a = refreshAccessToken();
    const b = refreshAccessToken();
    release({ accessToken: 'shared-at' });

    await expect(a).resolves.toBe('shared-at');
    await expect(b).resolves.toBe('shared-at');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('starts a FRESH request after the previous one settles (no stale inflight)', async () => {
    mockRefresh.mockResolvedValueOnce({ accessToken: 'first' });
    await refreshAccessToken();
    mockRefresh.mockResolvedValueOnce({ accessToken: 'second' });
    await expect(refreshAccessToken()).resolves.toBe('second');
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });

  it('transient failure (network/timeout/5xx) → null, NO logout, NO cache wipe', async () => {
    mockRefresh.mockRejectedValue(new AxiosError('Network Error'));
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(store.logout).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
  });

  it('confirmed 401 → logout + query-cache wipe + session-expired notify', async () => {
    mockRefresh.mockRejectedValue(axios401());
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(store.logout).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(store.updateModalSlice).toHaveBeenCalledWith(
      expect.objectContaining({ currentModal: 'notify' }),
    );
  });

  it('no stored refresh token → null without touching the network', async () => {
    mockGetRefreshToken.mockResolvedValue(null);
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
