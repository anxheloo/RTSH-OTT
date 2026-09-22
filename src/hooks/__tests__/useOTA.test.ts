import NetInfo from '@react-native-community/netinfo';
import { act, renderHook } from '@testing-library/react-native';
import * as Updates from 'expo-updates';

import { useOTA } from '../useOTA';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const updates = Updates as jest.Mocked<typeof Updates> & { isEnabled: boolean };
const netFetch = NetInfo.fetch as jest.Mock;

const flush = () => act(async () => {});

beforeEach(() => {
  jest.useFakeTimers();
  updates.isEnabled = true;
  netFetch.mockResolvedValue({ isConnected: true });
  updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false } as never);
  updates.fetchUpdateAsync.mockResolvedValue({ isNew: true } as never);
  updates.reloadAsync.mockResolvedValue();
});

afterEach(() => jest.useRealTimers());

describe('useOTA', () => {
  it('is ready immediately when updates are disabled (dev builds)', () => {
    updates.isEnabled = false;
    const { result } = renderHook(() => useOTA());
    expect(result.current).toBe(true);
    expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('boots the current bundle when there is no update', async () => {
    const { result } = renderHook(() => useOTA());
    expect(result.current).toBe(false);
    await flush();
    expect(result.current).toBe(true);
    expect(updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('reloads into a new update and keeps the splash gate shut', async () => {
    updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true } as never);
    const { result } = renderHook(() => useOTA());
    await flush();
    expect(updates.reloadAsync).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(false);
  });

  it('skips the check entirely when offline', async () => {
    netFetch.mockResolvedValue({ isConnected: false });
    const { result } = renderHook(() => useOTA());
    await flush();
    expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(result.current).toBe(true);
  });

  it('boots after 5s on a slow download and never reloads mid-session', async () => {
    updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true } as never);
    let finishDownload: (v: unknown) => void = () => {};
    updates.fetchUpdateAsync.mockReturnValue(new Promise((r) => (finishDownload = r)) as never);

    const { result } = renderHook(() => useOTA());
    await flush();
    expect(result.current).toBe(false);

    act(() => jest.advanceTimersByTime(5000));
    expect(result.current).toBe(true);

    finishDownload({ isNew: true });
    await flush();
    expect(updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('boots the current bundle when the check fails', async () => {
    updates.checkForUpdateAsync.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useOTA());
    await flush();
    expect(result.current).toBe(true);
    expect(updates.reloadAsync).not.toHaveBeenCalled();
  });
});
