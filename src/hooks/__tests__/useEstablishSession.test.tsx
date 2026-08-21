/**
 * Behavior tests for `useEstablishSession` — the boot decision that picks which
 * kind of session this launch has, and (just as important) which branches are
 * allowed to touch the network:
 *   • keychain holds a refresh token  → member, ZERO network
 *   • a PERSISTED guest token         → guest, ZERO network
 *   • no token + guest already chosen → mint one (the uncommon path)
 *   • no token + never chosen         → nothing; the auth stack renders
 *   • the mint throws                 → still settles, so the splash can hide
 *
 * The zero-network claims are the ones worth guarding. Minting on every launch
 * would put a rate-limited call (60/min per IP, with carrier NAT concentrating a
 * whole city behind one address) on the app-open path, where a `429` bounces a
 * guest to the entry screen through no fault of their own.
 *
 * Plus the platform gate: guest mode is iOS-only, so an Android launch must
 * touch neither the mint nor the persisted token — that is what keeps Android's
 * boot byte-identical to its pre-guest behavior.
 *
 * `GUEST_MODE_ENABLED` is mocked rather than read from `Platform`, so both
 * branches are asserted deterministically whichever platform jest runs as.
 * `mintGuestSession` is mocked at the module boundary — its retry policy is
 * covered in `features/auth/__tests__/guestSession.test.ts`.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAppStore } from '@/store/useAppStore';
import { useEstablishSession } from '@/hooks/useEstablishSession';
import { getGuestDeviceKey, mintGuestSession } from '@/features/auth/guestSession';
import { getRefreshToken } from '@/lib/tokenVault';

const mockSetGuestSession = jest.fn();
let mockGuestChosen = false;
let mockGuestToken: string | null = null;
let mockGuestModeEnabled = true;

jest.mock('@/store/useAppStore', () => ({
  useAppStore: {
    getState: () => ({
      guestChosen: mockGuestChosen,
      guestToken: mockGuestToken,
      setGuestSession: mockSetGuestSession,
    }),
    setState: jest.fn(),
  },
}));

jest.mock('@/constants/auth', () => ({
  get GUEST_MODE_ENABLED() {
    return mockGuestModeEnabled;
  },
  REFRESH_TOKEN_KEY: 'rtsh.refresh_token',
}));

jest.mock('@/lib/tokenVault', () => ({ getRefreshToken: jest.fn() }));
jest.mock('@/features/auth/guestSession', () => ({
  mintGuestSession: jest.fn(),
  getGuestDeviceKey: jest.fn(async () => 'device-key-1'),
}));

const mockGetRefreshToken = getRefreshToken as jest.Mock;
const mockMint = mintGuestSession as jest.Mock;
const mockGetDeviceKey = getGuestDeviceKey as jest.Mock;
const mockSetState = useAppStore.setState as jest.Mock;

/** Renders the hook and waits for the boot gate to settle. */
const boot = async () => {
  const { result } = renderHook(() => useEstablishSession());
  await waitFor(() => expect(result.current.tokenChecked).toBe(true));
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGuestChosen = false;
  mockGuestToken = null;
  mockGuestModeEnabled = true;
  mockGetRefreshToken.mockResolvedValue(null);
  mockGetDeviceKey.mockResolvedValue('device-key-1');
  mockMint.mockResolvedValue({ accessToken: 'guest-token', deviceKey: 'device-key-1' });
});

describe('useEstablishSession', () => {
  /* -------------------------------- member -------------------------------- */

  it('member: a stored refresh token authenticates with NO network call', async () => {
    mockGetRefreshToken.mockResolvedValue('refresh-token');

    await boot();

    expect(mockSetState).toHaveBeenCalledWith({ isAuthenticated: true });
    expect(mockMint).not.toHaveBeenCalled();
  });

  it('member wins over a stale guest choice — no token is minted', async () => {
    mockGetRefreshToken.mockResolvedValue('refresh-token');
    mockGuestChosen = true;

    await boot();

    expect(mockMint).not.toHaveBeenCalled();
  });

  it('member wins over a leftover guest token — it must not resurrect a guest', async () => {
    mockGetRefreshToken.mockResolvedValue('refresh-token');
    mockGuestToken = 'stale-guest-token';

    await boot();

    expect(mockSetState).toHaveBeenCalledWith({ isAuthenticated: true });
    expect(mockSetGuestSession).not.toHaveBeenCalled();
  });

  /* --------------------------- guest, persisted --------------------------- */

  it('returning guest: adopts the PERSISTED token with NO network call', async () => {
    mockGuestToken = 'stored-guest-token';

    await boot();

    expect(mockMint).not.toHaveBeenCalled();
    expect(mockSetGuestSession).toHaveBeenCalledWith('stored-guest-token', 'device-key-1');
  });

  it('a persisted token is preferred over minting a new one', async () => {
    mockGuestToken = 'stored-guest-token';
    mockGuestChosen = true;

    await boot();

    expect(mockMint).not.toHaveBeenCalled();
  });

  /* ----------------------------- guest, minted ---------------------------- */

  it('guest chose but has no token: mints one and adopts it', async () => {
    mockGuestChosen = true;

    await boot();

    expect(mockMint).toHaveBeenCalledTimes(1);
    expect(mockSetGuestSession).toHaveBeenCalledWith('guest-token', 'device-key-1');
    expect(mockSetState).not.toHaveBeenCalledWith({ isAuthenticated: true });
  });

  it('never chose guest: no session, no mint — the auth stack renders', async () => {
    await boot();

    expect(mockMint).not.toHaveBeenCalled();
    expect(mockSetGuestSession).not.toHaveBeenCalled();
  });

  /* ------------------------------- platform ------------------------------- */

  it('Android: never mints, even when the choice is somehow set', async () => {
    mockGuestModeEnabled = false;
    mockGuestChosen = true;

    await boot();

    expect(mockMint).not.toHaveBeenCalled();
  });

  it('Android: does not even read a persisted guest token — boot stays untouched', async () => {
    mockGuestModeEnabled = false;
    mockGuestToken = 'stored-guest-token';

    await boot();

    expect(mockSetGuestSession).not.toHaveBeenCalled();
    expect(mockGetDeviceKey).not.toHaveBeenCalled();
  });

  /* -------------------------------- failure ------------------------------- */

  it('mint failure still settles the gate, so the splash can never hang', async () => {
    mockGuestChosen = true;
    mockMint.mockRejectedValue(new Error('offline'));

    const result = await boot();

    expect(result.current.tokenChecked).toBe(true);
    expect(mockSetGuestSession).not.toHaveBeenCalled();
  });

  it('a throwing keychain read settles the gate too (fresh-install Keystore race)', async () => {
    mockGetRefreshToken.mockRejectedValue(new Error('keystore not ready'));

    const result = await boot();

    expect(result.current.tokenChecked).toBe(true);
  });
});
