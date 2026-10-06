/**
 * Pins the product decision of 2026-09-21: only radio (expo-audio) plays on the
 * lock screen; TV channels continue in the background through PiP alone. On
 * Android, `staysActiveInBackground` / `showNowPlayingNotification` start
 * expo-video's media foreground service, whose lifecycle races crashed builds 17
 * and 20 (REACT-NATIVE-RTSH-OTT-A, -B, -W, -18, -1B) — so neither may be enabled,
 * while PiP must stay on.
 */
import { render } from '@testing-library/react-native';

import LivePlayer from '../LivePlayer';

// The fake player records every property assignment `useVideoPlayer`'s setup
// callback makes, so the test can assert on what the real wrapper configured.
const mockAssigned: Record<string, unknown> = {};
let mockViewProps: Record<string, unknown> = {};
let mockLastPlayer: Record<string, unknown> | null = null;

jest.mock('expo-video', () => ({
  // One player per mount, like the real hook — a new instance per render would
  // re-run every effect keyed on `player`.
  useVideoPlayer: (_source: unknown, setup?: (p: object) => void) => {
    const [player] = jest.requireActual('react').useState(() => {
      const p = new Proxy(
        {
          play: jest.fn(),
          pause: jest.fn(),
          seekBy: jest.fn(),
          replaceAsync: jest.fn(() => Promise.resolve()),
        },
        {
          set: (target, key, value) => {
            mockAssigned[String(key)] = value;
            return Reflect.set(target, key, value);
          },
        },
      );
      setup?.(p);
      return p;
    });
    mockLastPlayer = player;
    return player;
  },
  VideoView: (props: Record<string, unknown>) => {
    mockViewProps = props;
    return null;
  },
}));

jest.mock('expo', () => ({
  useEvent: (_player: unknown, _event: string, initial?: unknown) => initial,
  useEventListener: () => undefined,
}));

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/components/Layout', () => ({ FullScreenLoader: () => null }));
jest.mock('../PlayerControls', () => ({ __esModule: true, default: () => null }));

beforeEach(() => {
  for (const key of Object.keys(mockAssigned)) delete mockAssigned[key];
  mockViewProps = {};
});

describe('LivePlayer — background playback', () => {
  it('never enables expo-video background playback or the now-playing notification', () => {
    render(<LivePlayer channelId="1" streamUrl="https://cdn.example/live" channelName="RTSH 1" />);
    expect(mockAssigned.staysActiveInBackground).not.toBe(true);
    expect(mockAssigned.showNowPlayingNotification).not.toBe(true);
  });

  it('keeps picture-in-picture on while not paused', () => {
    render(<LivePlayer channelId="1" streamUrl="https://cdn.example/live" channelName="RTSH 1" />);
    expect(mockViewProps.allowsPictureInPicture).toBe(true);
    expect(mockViewProps.startsPictureInPictureAutomatically).toBe(true);
  });
});

describe('LivePlayer — time updates', () => {
  // Every tick calls AVPlayerItem.currentDate(), a synchronous XPC on the main
  // thread that hung iOS for 2s+ (REACT-NATIVE-RTSH-OTT-2E). Live never reads
  // the position (its bar is pinned full), so it must not pay for the ticks.
  it('are off for a live stream', () => {
    render(<LivePlayer channelId="1" streamUrl="https://cdn.example/live" channelName="RTSH 1" />);
    expect(mockAssigned.timeUpdateEventInterval).toBe(0);
  });

  it('are on for a recording, which needs them for the seek bar', () => {
    render(
      <LivePlayer channelId="1" streamUrl="https://cdn.example/rec" channelName="RTSH 1" isLive={false} />,
    );
    expect(mockAssigned.timeUpdateEventInterval).toBe(0.5);
  });

  it('follow a live → recorded switch without a remount', () => {
    const view = render(
      <LivePlayer channelId="1" streamUrl="https://cdn.example/live" channelName="RTSH 1" />,
    );
    view.rerender(
      <LivePlayer channelId="1" streamUrl="https://cdn.example/rec" channelName="RTSH 1" isLive={false} />,
    );
    expect(mockAssigned.timeUpdateEventInterval).toBe(0.5);
  });
});

describe('LivePlayer — source swap', () => {
  // `replaceAsync` resolves after the screen may already be gone; play() on a
  // released player throws "Unable to find the native shared object"
  // (REACT-NATIVE-RTSH-OTT-2H).
  it('does not play after unmount when the swap resolves late', async () => {
    let resolveSwap!: () => void;
    const view = render(
      <LivePlayer channelId="1" streamUrl="https://cdn.example/a" channelName="RTSH 1" />,
    );
    const player = mockLastPlayer!;
    (player.replaceAsync as jest.Mock).mockReturnValue(
      new Promise<void>((r) => (resolveSwap = r)),
    );
    view.rerender(<LivePlayer channelId="1" streamUrl="https://cdn.example/b" channelName="RTSH 1" />);
    (player.play as jest.Mock).mockClear();

    view.unmount();
    resolveSwap();
    await Promise.resolve();

    expect(player.play).not.toHaveBeenCalled();
  });

  it('does not play a stale swap that a newer one replaced', async () => {
    const resolvers: (() => void)[] = [];
    const view = render(
      <LivePlayer channelId="1" streamUrl="https://cdn.example/a" channelName="RTSH 1" />,
    );
    const player = mockLastPlayer!;
    (player.replaceAsync as jest.Mock).mockImplementation(
      () => new Promise<void>((r) => resolvers.push(r)),
    );
    view.rerender(<LivePlayer channelId="1" streamUrl="https://cdn.example/b" channelName="RTSH 1" />);
    view.rerender(<LivePlayer channelId="1" streamUrl="https://cdn.example/c" channelName="RTSH 1" />);
    (player.play as jest.Mock).mockClear();

    resolvers[0](); // the superseded "b" swap lands last-but-irrelevant
    await Promise.resolve();
    expect(player.play).not.toHaveBeenCalled();

    resolvers[1]();
    await Promise.resolve();
    expect(player.play).toHaveBeenCalledTimes(1);
  });
});
