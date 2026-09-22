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

jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: unknown, setup?: (p: object) => void) => {
    const player = new Proxy(
      { play: jest.fn(), pause: jest.fn(), seekBy: jest.fn(), replaceAsync: jest.fn() },
      {
        set: (target, key, value) => {
          mockAssigned[String(key)] = value;
          return Reflect.set(target, key, value);
        },
      },
    );
    setup?.(player);
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
