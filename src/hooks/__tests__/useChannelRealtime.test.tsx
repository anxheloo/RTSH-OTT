/**
 * Behavior tests for the mid-roll scheduler wiring inside `useChannelRealtime` —
 * the layer the pure-core tests (`realtime/__tests__/midroll.test.ts`) can't
 * cover: that a FUTURE `startTime` actually arms the boundary timer and flips
 * `dueAd` when wall-clock crosses it (the "band opens later today" case from
 * the backend contract), that the scheduler is inert for RECORDED playback, and
 * that `onAdComplete` retires the ad.
 *
 * The realtime transport (STOMP client) is stubbed — the unit under test is the
 * clock/boundary-timer/derivation loop, not socket delivery. The pure scheduling
 * core is the REAL module (`requireActual`), so these tests exercise the true
 * due-rule, not a mock of it.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';

import type { Ad } from '@/types/domain';

import { useChannelRealtime } from '../useChannelRealtime';

// Stub the transport; keep the real pure scheduling core. Building the module
// by hand (instead of requireActual on the barrel) avoids importing the STOMP
// client → api client → native-storage chain.
jest.mock('@/realtime', () => ({
  ...jest.requireActual('@/realtime/midroll'),
  STOMP_DEST: {
    watch: '/app/watch',
    watchEnd: '/app/watch.end',
    channelTopic: (id: number) => `/topic/channel.${id}`,
    userGeoQueue: '/user/queue/geo',
  },
  publish: jest.fn(),
  subscribe: jest.fn(() => undefined),
}));

jest.mock('@/store/useAppStore', () => {
  const state = { realtimeConnected: false };
  const useAppStore = (selector: (s: typeof state) => unknown) => selector(state);
  useAppStore.getState = () => state;
  return { useAppStore };
});

jest.mock('../useAppState', () => ({
  useAppState: jest.fn(),
}));

const MIN = 60_000;

const mkAd = (id: number, over: Partial<Ad> = {}): Ad => ({
  id,
  type: 'IMAGE',
  mediaUrl: `https://cdn.example/ad-${id}.jpg`,
  durationSeconds: 10,
  skippable: true,
  skipAfterSeconds: 5,
  placement: 'MID_ROLL',
  ...over,
});

const renderRealtime = (midrolls: Ad[], kind: 'LIVE' | 'RECORDED' = 'LIVE') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useChannelRealtime(12, null, kind, midrolls), { wrapper });
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useChannelRealtime mid-roll scheduling', () => {
  it('holds a future startTime, then fires dueAd when the boundary passes', () => {
    const start = Date.now() + 2 * MIN;
    const ad = mkAd(901, {
      startTime: new Date(start).toISOString(),
      validUntil: new Date(start + 30 * MIN).toISOString(),
    });

    const { result } = renderRealtime([ad]);
    expect(result.current.dueAd).toBeNull();

    // Just before the band opens — still nothing.
    act(() => jest.advanceTimersByTime(2 * MIN - 1_000));
    expect(result.current.dueAd).toBeNull();

    // Cross the boundary (timer fires at startTime + 250ms).
    act(() => jest.advanceTimersByTime(2_000));
    expect(result.current.dueAd?.id).toBe(901);
  });

  it('shows an already-open window immediately (join mid-band)', () => {
    const ad = mkAd(902, {
      startTime: new Date(Date.now() - 10 * MIN).toISOString(),
      validUntil: new Date(Date.now() + 20 * MIN).toISOString(),
    });
    const { result } = renderRealtime([ad]);
    expect(result.current.dueAd?.id).toBe(902);
  });

  it('onAdComplete retires the due ad', () => {
    const ad = mkAd(903, {
      startTime: new Date(Date.now() - MIN).toISOString(),
      validUntil: new Date(Date.now() + 20 * MIN).toISOString(),
    });
    const { result } = renderRealtime([ad]);
    expect(result.current.dueAd?.id).toBe(903);

    act(() => result.current.onAdComplete());
    expect(result.current.dueAd).toBeNull();
  });

  it('never schedules for RECORDED playback', () => {
    const ad = mkAd(904, {
      startTime: new Date(Date.now() + MIN).toISOString(),
      validUntil: new Date(Date.now() + 30 * MIN).toISOString(),
    });
    const { result } = renderRealtime([ad], 'RECORDED');
    act(() => jest.advanceTimersByTime(5 * MIN));
    expect(result.current.dueAd).toBeNull();
  });
});
