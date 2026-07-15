/**
 * Behavior test for `forceSessionExpired` — the shared session-teardown for a
 * token that can never work again (logout + query-cache wipe + session-expired
 * notify). Extracted out of `authRefresh.ts`'s confirmed-401/403 branch on
 * 2026-07-14 (device-identity migration) so the new `playback.device_class_required`
 * 400 path in this module's response interceptor could reuse it instead of a
 * second hand-copy — `authRefresh.test.ts` only asserts that it *delegates*
 * here on 401/403; this file is what proves the teardown itself is correct.
 */
import { useAppStore } from '@/store/useAppStore';

import { forceSessionExpired, queryClient } from '../client';

jest.mock('@/store/useAppStore', () => {
  const logout = jest.fn(async () => {});
  const updateModalSlice = jest.fn();
  return {
    useAppStore: {
      getState: () => ({ token: null, locale: 'en', logout, updateModalSlice }),
      setState: jest.fn(),
    },
  };
});

jest.mock('@/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

const store = useAppStore.getState() as unknown as {
  logout: jest.Mock;
  updateModalSlice: jest.Mock;
};

describe('forceSessionExpired', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs out, clears the query cache, and shows the session-expired notify', async () => {
    const clearSpy = jest.spyOn(queryClient, 'clear');

    await forceSessionExpired();

    expect(store.logout).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(store.updateModalSlice).toHaveBeenCalledWith(
      expect.objectContaining({ currentModal: 'notify' }),
    );
  });
});
