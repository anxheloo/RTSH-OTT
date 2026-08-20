/**
 * Behavior tests for `refreshAccessToken` — the auth-flow invariants that keep
 * users logged in (or correctly logged out):
 *   • single-flight: concurrent callers share ONE refresh request
 *   • transient failure (network/5xx) → null, NO teardown, token survives
 *   • confirmed 401/403 → delegates to the shared `forceSessionExpired()` teardown
 *   • no refresh token → null without a network call
 *   • GUEST sessions re-mint via `/auth/guest` instead of `/auth/refresh`, and
 *     only a confirmed 401/403 on that mint tears the session down
 *
 * `forceSessionExpired`'s own behavior (logout + query-cache wipe + notify) is
 * covered by `api/__tests__/client.test.ts` — extracted there 2026-07-14
 * (device-identity migration) so this module's confirmed-401/403 branch and the
 * new `playback.device_class_required` 400 branch share one implementation
 * instead of two hand-copies. This file only asserts the delegation.
 *
 * The store, i18n, vault, and client are mocked so the test exercises only this
 * module's decision logic (no MMKV / native imports).
 */
import { AxiosError, AxiosHeaders } from 'axios';

import { useAppStore } from '@/store/useAppStore';
import { mintGuestSession } from '@/features/auth/guestSession';
import { getRefreshToken } from '@/lib/tokenVault';

import { forceSessionExpired } from '../../client';
import * as authService from '../../services/auth';
import { refreshAccessToken } from '../authRefresh';

const mockLogout = jest.fn(async () => {});
const mockSetGuestSession = jest.fn();
let mockStoreState: Record<string, unknown> = {};

jest.mock('@/store/useAppStore', () => ({
  useAppStore: { getState: () => mockStoreState, setState: jest.fn() },
}));

jest.mock('@/utils/device', () => ({
  buildDeviceRegistration: jest.fn(async () => ({ deviceKey: 'device-key-1' })),
}));

jest.mock('@/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

jest.mock('@/lib/tokenVault', () => ({
  getRefreshToken: jest.fn(async () => 'refresh-token'),
}));

jest.mock('../../client', () => ({
  forceSessionExpired: jest.fn(async () => {}),
  registerRefreshHandler: jest.fn(),
}));

jest.mock('../../services/auth', () => ({ refresh: jest.fn() }));

// Mocked at the module boundary: the mint's RETRY policy (which failures are
// worth another attempt) is covered in `features/auth/__tests__/guestSession`.
// This file asserts only what this module decides once a mint has settled.
jest.mock('@/features/auth/guestSession', () => ({ mintGuestSession: jest.fn() }));

const mockRefresh = authService.refresh as jest.Mock;
const mockMint = mintGuestSession as jest.Mock;
const mockGetRefreshToken = getRefreshToken as jest.Mock;
const mockForceSessionExpired = forceSessionExpired as jest.Mock;

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
  // Default: a signed-in member. Guest tests opt in explicitly.
  mockStoreState = { isGuest: false, logout: mockLogout, setGuestSession: mockSetGuestSession };
});

const asGuest = () => {
  mockStoreState = { isGuest: true, logout: mockLogout, setGuestSession: mockSetGuestSession };
};

const axios403 = () =>
  new AxiosError('Forbidden', '403', undefined, undefined, {
    status: 403,
    statusText: 'Forbidden',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
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

  it('transient failure (network/timeout/5xx) → null, NO session teardown', async () => {
    mockRefresh.mockRejectedValue(new AxiosError('Network Error'));
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(mockForceSessionExpired).not.toHaveBeenCalled();
  });

  it('confirmed 401 → delegates to the shared forceSessionExpired teardown', async () => {
    mockRefresh.mockRejectedValue(axios401());
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(mockForceSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('no stored refresh token → null without touching the network', async () => {
    mockGetRefreshToken.mockResolvedValue(null);
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  /* ------------------------------- guest ---------------------------------- */

  it('guest session re-mints via /auth/guest and never calls /auth/refresh', async () => {
    asGuest();
    mockMint.mockResolvedValue({ accessToken: 'fresh-guest-token', deviceKey: 'device-key-1' });

    await expect(refreshAccessToken()).resolves.toBe('fresh-guest-token');

    expect(mockMint).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
    // A guest holds no refresh token, so the vault must not even be consulted.
    expect(mockGetRefreshToken).not.toHaveBeenCalled();
    expect(mockSetGuestSession).toHaveBeenCalledWith('fresh-guest-token', 'device-key-1');
  });

  it('guest mint refused (403) → tears the session down so the guard routes to auth', async () => {
    asGuest();
    mockMint.mockRejectedValue(axios403());

    await expect(refreshAccessToken()).resolves.toBeNull();

    expect(mockLogout).toHaveBeenCalledTimes(1);
    // Wrong for a guest: they never had a session to "expire".
    expect(mockForceSessionExpired).not.toHaveBeenCalled();
  });

  it('guest mint fails transiently → null, but NO teardown (must not eject mid-programme)', async () => {
    asGuest();
    // Already past `mintGuestSession`'s own retries — offline, or a `429` from
    // the shared-IP mint limit that outlasted the backoff.
    mockMint.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

    await expect(refreshAccessToken()).resolves.toBeNull();

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockForceSessionExpired).not.toHaveBeenCalled();
  });

  it('guest re-mint is single-flighted like the member path', async () => {
    asGuest();
    mockMint.mockResolvedValue({ accessToken: 'fresh-guest-token', deviceKey: 'device-key-1' });

    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(a).toBe('fresh-guest-token');
    expect(b).toBe('fresh-guest-token');
    expect(mockMint).toHaveBeenCalledTimes(1);
  });
});
