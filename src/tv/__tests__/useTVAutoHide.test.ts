import { act, renderHook } from '@testing-library/react-native';

import { TV_AUTO_HIDE_MS, useTVAutoHide } from '../useTVAutoHide';

let mockIsTV = true;
jest.mock('../constants', () => ({
  get isTV() {
    return mockIsTV;
  },
}));

type RemoteEvent = { eventType: string; eventKeyAction?: number };
let mockRemote: ((e: RemoteEvent) => void) | null = null;
jest.mock('react-native/Libraries/Components/TV/useTVEventHandler', () => ({
  __esModule: true,
  default: (handler: (e: RemoteEvent) => void) => {
    mockRemote = handler;
  },
}));

const press = (eventKeyAction: number, eventType = 'right') =>
  act(() => {
    mockRemote?.({ eventType, eventKeyAction });
  });
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
  mockIsTV = true;
  mockRemote = null;
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useTVAutoHide', () => {
  it('hides once the timeout passes without a key while active', () => {
    const { result } = renderHook(() => useTVAutoHide(true));
    expect(result.current).toBe(true);
    advance(TV_AUTO_HIDE_MS - 1);
    expect(result.current).toBe(true);
    advance(1);
    expect(result.current).toBe(false);
  });

  it('reveals on a key release and restarts the countdown', () => {
    const { result } = renderHook(() => useTVAutoHide(true));
    advance(TV_AUTO_HIDE_MS);
    expect(result.current).toBe(false);

    press(1);
    expect(result.current).toBe(true);
    advance(TV_AUTO_HIDE_MS - 1);
    expect(result.current).toBe(true);
    advance(1);
    expect(result.current).toBe(false);
  });

  it('keeps the chrome up while keys keep arriving', () => {
    const { result } = renderHook(() => useTVAutoHide(true));
    advance(TV_AUTO_HIDE_MS - 1000);
    press(1);
    advance(TV_AUTO_HIDE_MS - 1000);
    expect(result.current).toBe(true);
  });

  it('ignores key presses and focus events — only releases count', () => {
    const { result } = renderHook(() => useTVAutoHide(true));
    advance(TV_AUTO_HIDE_MS);
    press(0); // key down
    press(-1, 'focus'); // focus move caused by hiding
    expect(result.current).toBe(false);
  });

  it('stays visible while inactive (paused / guide open)', () => {
    const { result } = renderHook(() => useTVAutoHide(false));
    advance(TV_AUTO_HIDE_MS * 3);
    expect(result.current).toBe(true);
  });

  it('starts the countdown when it becomes active', () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useTVAutoHide(active),
      {
        initialProps: { active: false },
      },
    );
    advance(TV_AUTO_HIDE_MS * 2);
    rerender({ active: true });
    expect(result.current).toBe(true);
    advance(TV_AUTO_HIDE_MS);
    expect(result.current).toBe(false);
  });

  it('shows again the moment it becomes inactive', () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useTVAutoHide(active),
      {
        initialProps: { active: true },
      },
    );
    advance(TV_AUTO_HIDE_MS);
    expect(result.current).toBe(false);
    rerender({ active: false });
    expect(result.current).toBe(true);
  });

  it('is always visible off-TV', () => {
    mockIsTV = false;
    const { result } = renderHook(() => useTVAutoHide(true));
    advance(TV_AUTO_HIDE_MS * 3);
    expect(result.current).toBe(true);
  });
});
