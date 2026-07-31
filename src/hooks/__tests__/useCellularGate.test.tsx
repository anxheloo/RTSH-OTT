/**
 * Behavior tests for the cellular-data gate.
 *
 * The contract under test is "hold playback until the user accepts": `pending`
 * is what the player routes gate their stream on, so these assert when it is
 * true, when it clears, and that leaving the route never strands the modal —
 * the regression that made the app untappable (a `confirmation` left in the
 * store renders an invisible full-screen modal window over everything).
 */
import { NetInfoStateType } from '@react-native-community/netinfo';
import { act, renderHook } from '@testing-library/react-native';

import { useCellularGate } from '../useCellularGate';

type MockState = {
  currentModal: string | null;
  connectionType: string;
  cellularPlaybackAllowed: boolean;
  cellularAcknowledged: boolean;
  updateModalSlice: jest.Mock;
  updateNetworkSlice: jest.Mock;
};

const mockState: MockState = {
  currentModal: null,
  connectionType: NetInfoStateType.wifi,
  cellularPlaybackAllowed: false,
  cellularAcknowledged: false,
  // Mirror the real slices closely enough that the modal's own lifecycle shows
  // up in state — otherwise the unmount-cleanup assertion proves nothing.
  updateModalSlice: jest.fn((patch: Partial<MockState>) => Object.assign(mockState, patch)),
  updateNetworkSlice: jest.fn((patch: Partial<MockState>) => Object.assign(mockState, patch)),
};

jest.mock('@/store/useAppStore', () => {
  const useAppStore = (selector: (s: MockState) => unknown) => selector(mockState);
  useAppStore.getState = () => mockState;
  return { useAppStore };
});

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
const mockBack = jest.requireMock('expo-router').router.back as jest.Mock;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

/** The `modalData` the gate handed to `ModalWrapper` on the last prompt. */
const lastModalData = () =>
  mockState.updateModalSlice.mock.calls.at(-1)?.[0].modalData as {
    action?: () => void;
    action2?: () => void;
  };

beforeEach(() => {
  mockState.currentModal = null;
  mockState.connectionType = NetInfoStateType.wifi;
  mockState.cellularPlaybackAllowed = false;
  mockState.cellularAcknowledged = false;
  mockState.updateModalSlice.mockClear();
  mockState.updateNetworkSlice.mockClear();
  mockBack.mockClear();
});

describe('useCellularGate', () => {
  it('is not pending off cellular, and never prompts', () => {
    const { result } = renderHook(() => useCellularGate());

    expect(result.current.pending).toBe(false);
    expect(mockState.updateModalSlice).not.toHaveBeenCalled();
  });

  it('holds playback and prompts on cellular', () => {
    mockState.connectionType = NetInfoStateType.cellular;

    const { result } = renderHook(() => useCellularGate());

    expect(result.current.pending).toBe(true);
    expect(mockState.updateModalSlice).toHaveBeenCalledWith(
      expect.objectContaining({ currentModal: 'confirmation' }),
    );
  });

  it('Continue acknowledges for the session and releases playback', () => {
    mockState.connectionType = NetInfoStateType.cellular;
    const { result, rerender } = renderHook(() => useCellularGate());

    act(() => lastModalData().action?.());
    rerender({});

    expect(mockState.updateNetworkSlice).toHaveBeenCalledWith({ cellularAcknowledged: true });
    expect(result.current.pending).toBe(false);
  });

  it('Cancel pops the route and leaves playback held', () => {
    mockState.connectionType = NetInfoStateType.cellular;
    const { result } = renderHook(() => useCellularGate());

    act(() => lastModalData().action2?.());

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockState.cellularAcknowledged).toBe(false);
    expect(result.current.pending).toBe(true);
  });

  it('clears its modal on unmount — a confirmation must never outlive the route', () => {
    mockState.connectionType = NetInfoStateType.cellular;
    const { unmount } = renderHook(() => useCellularGate());
    expect(mockState.currentModal).toBe('confirmation');

    unmount();

    expect(mockState.currentModal).toBeNull();
  });

  it('does not prompt again once acknowledged', () => {
    mockState.connectionType = NetInfoStateType.cellular;
    mockState.cellularAcknowledged = true;

    const { result } = renderHook(() => useCellularGate());

    expect(result.current.pending).toBe(false);
    expect(mockState.updateModalSlice).not.toHaveBeenCalled();
  });

  it('never prompts when cellular playback is allowed in settings', () => {
    mockState.connectionType = NetInfoStateType.cellular;
    mockState.cellularPlaybackAllowed = true;

    const { result } = renderHook(() => useCellularGate());

    expect(result.current.pending).toBe(false);
    expect(mockState.updateModalSlice).not.toHaveBeenCalled();
  });
});
