/**
 * Behavior tests for AdOverlay — the revenue-critical invariants:
 *   • `onComplete` + the impression beacon fire EXACTLY ONCE per ad, on every
 *     dismissal path (duration timer / skip / video natural end)
 *   • `watchedSeconds` is clamped to the (sanitized) duration
 *   • the safeDuration failsafe: a missing/0/NaN duration still auto-dismisses
 *     (the historical hard-app-lock bug — pinned fixed here)
 *   • the skip control is hidden for non-skippable creatives and inert until
 *     `skipAfterSeconds` elapses
 *
 * Heavy native children (video, images, icons, blur, the Layout barrel) are
 * mocked to stubs — the unit under test is the overlay's timing + beacon logic,
 * not the creative rendering.
 */
import { act, fireEvent, render } from '@testing-library/react-native';

import { reportAdImpression } from '@/api/services/ads';
import type { AdCreative } from '@/types/domain';

import AdOverlay from '../AdOverlay';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/api/services/ads', () => ({
  reportAdImpression: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-event-id'),
}));

// Layout barrel pulls expo-router (RadioMiniPlayer) — stub just what's used.
jest.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AnimatedView: require('react-native').View,
}));

jest.mock('@/components/Icons', () => ({
  Icon: () => null,
}));

jest.mock('@/components/Media/ReusableImage', () => ({
  __esModule: true,
  default: () => null,
}));

// Capture the mounted VideoPlayer's props so the natural-end path can be fired.
let mockVideoProps: { onPlayEnd?: () => void } | null = null;
jest.mock('@/components/Media/VideoPlayer', () => ({
  __esModule: true,
  default: (props: { onPlayEnd?: () => void }) => {
    mockVideoProps = props;
    return null;
  },
}));

jest.mock('expo-blur', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native');
  return { BlurView: RN.View };
});

const mkCreative = (over: Partial<AdCreative> = {}): AdCreative => ({
  id: 42,
  type: 'IMAGE',
  mediaUrl: 'https://cdn.example/ad.jpg',
  durationSeconds: 10,
  skippable: false,
  skipAfterSeconds: 3,
  ...over,
});

const mockImpression = reportAdImpression as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  mockVideoProps = null;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AdOverlay', () => {
  it('auto-dismisses at durationSeconds and beacons the impression once', () => {
    const onComplete = jest.fn();
    render(
      <AdOverlay
        creative={mkCreative({ durationSeconds: 10 })}
        channelId={7}
        onComplete={onComplete}
      />,
    );

    act(() => jest.advanceTimersByTime(9_000));
    expect(onComplete).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(2_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockImpression).toHaveBeenCalledTimes(1);
    expect(mockImpression).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        durationSeconds: 10,
        channelId: 7,
      }),
    );
    // `placement` is never sent (it lives on the GET /ads response); the beacon
    // carries a per-impression `clientEventId` for the backend's de-dupe.
    expect(mockImpression.mock.calls[0][1]).not.toHaveProperty('placement');
    expect(mockImpression.mock.calls[0][1].clientEventId).toBe('test-event-id');
    // Clamped: watched can never exceed the ad's duration.
    const { watchedSeconds } = mockImpression.mock.calls[0][1];
    expect(watchedSeconds).toBeLessThanOrEqual(10);

    // Idempotent: further timer ticks never re-fire either callback.
    act(() => jest.advanceTimersByTime(20_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockImpression).toHaveBeenCalledTimes(1);
  });

  it('hides the skip control entirely for non-skippable creatives', () => {
    const { queryByTestId } = render(
      <AdOverlay creative={mkCreative({ skippable: false })} onComplete={jest.fn()} />,
    );
    expect(queryByTestId('ad-skip')).toBeNull();
  });

  it('skip is inert until skipAfterSeconds, then ends the ad once', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <AdOverlay
        creative={mkCreative({ skippable: true, skipAfterSeconds: 3, durationSeconds: 10 })}
        channelId={7}
        onComplete={onComplete}
      />,
    );

    // Before the gate elapses the button is disabled — a press does nothing.
    fireEvent.press(getByTestId('ad-skip'));
    expect(onComplete).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(3_600));
    fireEvent.press(getByTestId('ad-skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockImpression).toHaveBeenCalledTimes(1);

    // The still-armed duration timer must not double-fire after a skip.
    act(() => jest.advanceTimersByTime(20_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockImpression).toHaveBeenCalledTimes(1);
  });

  it('failsafe: a NaN/0 duration still auto-dismisses within the 15s default', () => {
    const onComplete = jest.fn();
    render(
      <AdOverlay
        creative={mkCreative({ durationSeconds: NaN, skippable: false })}
        channelId={7}
        onComplete={onComplete}
      />,
    );

    act(() => jest.advanceTimersByTime(16_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    // The sanitized fallback (15s), never NaN, reaches the beacon.
    expect(mockImpression.mock.calls[0][1].durationSeconds).toBe(15);
    expect(Number.isNaN(mockImpression.mock.calls[0][1].watchedSeconds)).toBe(false);
  });

  it("a VIDEO creative's natural end fires the same single completion path", () => {
    const onComplete = jest.fn();
    render(
      <AdOverlay
        creative={mkCreative({ type: 'VIDEO', durationSeconds: 30 })}
        onComplete={onComplete}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(4_000);
      mockVideoProps?.onPlayEnd?.();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockImpression).toHaveBeenCalledTimes(1);

    // Duration timer afterwards must not re-fire.
    act(() => jest.advanceTimersByTime(60_000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
