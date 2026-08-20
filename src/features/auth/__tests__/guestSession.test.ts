/**
 * Behavior tests for `mintGuestSession` — the retry policy that decides whether
 * a failed guest mint is worth another try.
 *
 * The invariant that matters: `POST /auth/guest` is rate-limited to 60 mints/min
 * PER IP, and carrier NAT puts a whole city behind one address — so a `429` is a
 * crowd, not a client fault, and retrying it is the difference between a guest
 * carrying on and a guest being bounced to the entry screen. The mirror
 * invariant is just as important: `403 auth.guest_disabled` (the backend kill
 * switch) must NOT be retried, or the switch takes minutes to take effect and
 * the caller never learns why.
 *
 * Timers are faked: the point is WHICH failures retry and how many times, not
 * how long the waits are.
 */
import { AxiosError, AxiosHeaders } from 'axios';

import { guestLogin } from '@/api/services/auth';

import { mintGuestSession } from '../guestSession';

jest.mock('@/api/services/auth', () => ({ guestLogin: jest.fn() }));
jest.mock('@/utils/device', () => ({
  buildDeviceRegistration: jest.fn(async () => ({ deviceKey: 'device-key-1' })),
  getOrCreateDeviceId: jest.fn(async () => 'device-key-1'),
}));

const mockGuestLogin = guestLogin as jest.Mock;

/** An axios failure with a real status. */
const httpError = (status: number) =>
  new AxiosError(`HTTP ${status}`, String(status), undefined, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

/** What axios actually throws when the request never reached a server. */
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK');

/**
 * Drives the mint to completion with the backoff waits collapsed.
 *
 * The no-op `catch` is required, not decorative: the promise can settle while
 * `runAllTimersAsync` is still being awaited, which is before the caller has
 * attached its `.rejects` assertion — Jest would flag that window as an
 * unhandled rejection. Attaching a handler early silences only that window; the
 * original promise is still returned and still rejects for the caller.
 */
const runMint = async () => {
  const promise = mintGuestSession();
  promise.catch(() => {});
  await jest.runAllTimersAsync();
  return promise;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mintGuestSession', () => {
  it('returns the token and the device key on a first-try success', async () => {
    mockGuestLogin.mockResolvedValue({ accessToken: 'guest-token' });

    await expect(runMint()).resolves.toEqual({
      accessToken: 'guest-token',
      deviceKey: 'device-key-1',
    });
    expect(mockGuestLogin).toHaveBeenCalledTimes(1);
  });

  /* --------------------------- retried: transient -------------------------- */

  it('retries a 429 — a shared-IP rate limit is a crowd, not a client fault', async () => {
    mockGuestLogin
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValue({ accessToken: 'guest-token' });

    await expect(runMint()).resolves.toMatchObject({ accessToken: 'guest-token' });
    expect(mockGuestLogin).toHaveBeenCalledTimes(2);
  });

  it('retries a network failure (the shape axios really throws when offline)', async () => {
    mockGuestLogin
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue({ accessToken: 'guest-token' });

    await expect(runMint()).resolves.toMatchObject({ accessToken: 'guest-token' });
    expect(mockGuestLogin).toHaveBeenCalledTimes(2);
  });

  it('retries a 5xx', async () => {
    mockGuestLogin
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValue({ accessToken: 'guest-token' });

    await expect(runMint()).resolves.toMatchObject({ accessToken: 'guest-token' });
    expect(mockGuestLogin).toHaveBeenCalledTimes(2);
  });

  it('gives up after a bounded number of attempts rather than hanging the boot', async () => {
    mockGuestLogin.mockRejectedValue(httpError(429));

    await expect(runMint()).rejects.toBeInstanceOf(AxiosError);
    // First attempt + 2 retries. Bounded on purpose: this runs on the boot path.
    expect(mockGuestLogin).toHaveBeenCalledTimes(3);
  });

  /* -------------------------- NOT retried: permanent ----------------------- */

  it('does NOT retry 403 — the kill switch must reach the caller immediately', async () => {
    mockGuestLogin.mockRejectedValue(httpError(403));

    await expect(runMint()).rejects.toBeInstanceOf(AxiosError);
    expect(mockGuestLogin).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry 400 — a rejected device payload can never succeed', async () => {
    mockGuestLogin.mockRejectedValue(httpError(400));

    await expect(runMint()).rejects.toBeInstanceOf(AxiosError);
    expect(mockGuestLogin).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry a non-axios throw', async () => {
    mockGuestLogin.mockRejectedValue(new TypeError('bug'));

    await expect(runMint()).rejects.toBeInstanceOf(TypeError);
    expect(mockGuestLogin).toHaveBeenCalledTimes(1);
  });
});
