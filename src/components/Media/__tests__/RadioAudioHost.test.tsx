/**
 * Behavior tests for RadioAudioHost's cold-start contract: until a station is
 * first selected the engine is left alone. Every sync expo-audio call blocks JS
 * on a main-thread hop, and the first `setAudioModeAsync` pays a one-time
 * Kotlin-reflection init — both landed in the cold-start window on a low-end
 * Android TV box (REACT-NATIVE-RTSH-OTT-24). Once engaged, closing the station
 * must still pause and clear the lock-screen controls.
 *
 * Also: a station switch must not read as a user pause. iOS pauses the old item
 * before swapping it, which reported a settled paused frame and flipped the
 * store off, then back on ~300 ms later (seen on an iPhone, 2026-09-29).
 */
import { act, render } from '@testing-library/react-native';
import { setAudioModeAsync } from 'expo-audio';

import { useAppStore } from '@/store/useAppStore';

import RadioAudioHost from '../RadioAudioHost';

let mockStatusListener: ((status: object) => void) | null = null;

const mockPlayer = {
  replace: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
  setActiveForLockScreen: jest.fn(),
  clearLockScreenControls: jest.fn(),
  addListener: jest.fn((_event: string, cb: (status: object) => void) => {
    mockStatusListener = cb;
    return { remove: jest.fn() };
  }),
  currentTime: 0,
  duration: 0,
};

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayer,
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/realtime', () => ({
  publish: jest.fn(),
  STOMP_DEST: { watch: '/app/watch', watchEnd: '/app/watch.end' },
}));

jest.mock('@/utils', () => ({
  getStreamHeaders: () => ({ 'User-Agent': 'test' }),
  isAtPlaybackEnd: () => false,
  resolveExternalPlaybackChange:
    jest.requireActual('@/utils/audioSync').resolveExternalPlaybackChange,
}));

const selectStation = () =>
  act(() => {
    useAppStore.getState().setRadioChannel({
      channelId: '7',
      streamUrl: 'https://example.test/radio.m3u8',
      title: 'Radio Tirana',
    });
  });

describe('RadioAudioHost', () => {
  beforeEach(() => {
    act(() => useAppStore.getState().clearRadio());
  });

  it('does not touch the engine on mount when no station was ever selected', () => {
    render(<RadioAudioHost>{null}</RadioAudioHost>);

    expect(setAudioModeAsync).not.toHaveBeenCalled();
    expect(mockPlayer.pause).not.toHaveBeenCalled();
    expect(mockPlayer.clearLockScreenControls).not.toHaveBeenCalled();
  });

  it('sets the audio mode once, on first station select, before replacing the source', () => {
    render(<RadioAudioHost>{null}</RadioAudioHost>);
    selectStation();

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
    });
    expect(mockPlayer.replace).toHaveBeenCalledWith({
      uri: 'https://example.test/radio.m3u8',
      headers: { 'User-Agent': 'test' },
    });
    expect(mockPlayer.play).toHaveBeenCalled();

    act(() => {
      useAppStore.getState().setRadioChannel({
        channelId: '8',
        streamUrl: 'https://example.test/other.m3u8',
        title: 'Radio 2',
      });
    });
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
  });

  it('still pauses and clears the lock screen when an engaged station is closed', () => {
    render(<RadioAudioHost>{null}</RadioAudioHost>);
    selectStation();
    mockPlayer.pause.mockClear();

    act(() => useAppStore.getState().clearRadio());

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(mockPlayer.clearLockScreenControls).toHaveBeenCalled();
  });

  it('ignores the paused frame a station switch emits, but not a real pause after it plays', () => {
    const settled = { isLoaded: true, isBuffering: false, error: null };
    render(<RadioAudioHost>{null}</RadioAudioHost>);
    selectStation();

    // The old item, paused by the native replace before the new one starts.
    act(() => mockStatusListener?.({ ...settled, playing: false }));
    expect(useAppStore.getState().radioIsPlaying).toBe(true);

    // Once the new source plays, a settled paused frame is a real (lock-screen) pause.
    act(() => mockStatusListener?.({ ...settled, playing: true }));
    act(() => mockStatusListener?.({ ...settled, playing: false }));
    expect(useAppStore.getState().radioIsPlaying).toBe(false);
  });
});
