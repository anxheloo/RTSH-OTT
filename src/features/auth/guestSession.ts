/**
 * Guest session minting — the ONE place that turns "no session" into a guest
 * access token. All three call sites use it (the welcome-gate button, the boot
 * rehydrate, and the 401 re-mint), so they cannot drift on retry policy.
 *
 * Bounded retry on TRANSIENT failures only. `POST /auth/guest` is rate-limited
 * to 60 mints/min PER IP, and mobile carriers put very large numbers of
 * subscribers behind a single NAT egress — so a `429` here is a crowd, not a
 * client fault, and must never read as "guest mode is unavailable". The same
 * applies after an admin session purge, when every install re-mints at once.
 *
 * The backoff is deliberately SHORT (0.5s, 2s) and ignores the server's
 * `Retry-After: 60`: this runs on the boot path, where a 60s hang is far worse
 * than falling back to the welcome gate — and that gate carries its own
 * "continue without an account" button, so a user who lands there retries with
 * one tap. It is an entry screen with a guest affordance, not a registration
 * wall, which is the distinction the App Store rejection actually turns on.
 *
 * Permanent failures are NOT retried and propagate to the caller: a `400`
 * (validation) can never succeed, and `403 auth.guest_disabled` is the
 * backend's kill switch, whose entire purpose is to route the user to sign-in.
 */
import axios from 'axios';

import { guestLogin } from '@/api/services/auth';
import { buildDeviceRegistration, getOrCreateDeviceId } from '@/utils/device';

export interface GuestSession {
  accessToken: string;
  /**
   * The device's stable keychain UUID, carried out with the token so callers can
   * tag monitoring without a second async read.
   */
  deviceKey: string;
}

/** Delays between attempts; length == number of RETRIES (the first try is immediate). */
const RETRY_DELAYS_MS = [500, 2000];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Transient = worth retrying. An absent `status` is a network/timeout failure,
 * `429` is the shared-IP rate limit, `5xx` is the backend having a bad moment.
 * Everything else — including a non-axios throw — is permanent.
 */
const isTransient = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status === 429 || status >= 500;
};

/** Mint a guest access token, retrying only what a retry can actually fix. */
export async function mintGuestSession(): Promise<GuestSession> {
  const device = await buildDeviceRegistration();

  for (let attempt = 0; ; attempt++) {
    try {
      const { accessToken } = await guestLogin(device);
      return { accessToken, deviceKey: device.deviceKey };
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length || !isTransient(error)) throw error;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * The device key on its own — for the boot path, which rehydrates a PERSISTED
 * guest token and therefore needs no network and no device payload, only the
 * id that tags monitoring.
 */
export const getGuestDeviceKey = getOrCreateDeviceId;
