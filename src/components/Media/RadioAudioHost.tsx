/**
 * RadioAudioHost — the single radio audio engine for the whole app.
 *
 * Mounted once at the authenticated layout (above the router), it owns the only
 * `expo-audio` player and is driven entirely by `PlayerSlice`: the radio routes
 * and the mini-player never touch audio directly — they mutate the store, and
 * this host obeys (swap source on `radioStreamUrl`, play/pause on
 * `radioIsPlaying`). Living above the router is what lets playback survive tab
 * navigation and screen unmounts, which is the whole point of the docked
 * mini-player. Renders nothing.
 *
 * Background-while-locked relies on the iOS `audio` background mode + Android
 * foreground-service entitlements emitted by the `expo-audio` config plugin
 * (`enableBackgroundPlayback: true`) — a native rebuild is required for them to
 * take effect.
 */
import { useEffect } from 'react';

import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { useAppStore } from '@/store/useAppStore';
import { getStreamHeaders } from '@/utils';
// Analytics disabled for now — re-enable when telemetry is wanted.
// import { useWatchTracking } from '@/analytics';

const RadioAudioHost: React.FC = () => {
  // const radioChannelId = useAppStore((s) => s.radioChannelId);
  const radioStreamUrl = useAppStore((s) => s.radioStreamUrl);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const radioTitle = useAppStore((s) => s.radioTitle);
  const radioArtworkUrl = useAppStore((s) => s.radioArtworkUrl);
  const player = useAudioPlayer(null);

  // Radio watch_start/end tracks the engine's lifetime (store-driven), not any
  // screen — playback survives navigation, so the screen mount is the wrong key.
  // useWatchTracking(radioChannelId ?? '', 'radio');

  // Background-capable audio session, set once. `shouldPlayInBackground` keeps
  // the session alive when the screen locks; `doNotMix` is required for the OS
  // to associate the lock-screen controls with this player.
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
    });
  }, []);

  // Swap the live stream whenever the selected station changes.
  useEffect(() => {
    if (radioStreamUrl) {
      player.replace({ uri: radioStreamUrl, headers: getStreamHeaders() });
    }
  }, [radioStreamUrl, player]);

  // Lock-screen now-playing controls (also required on Android for sustained
  // >3min background playback). Cleared when the station is torn down.
  useEffect(() => {
    if (!radioStreamUrl) {
      player.clearLockScreenControls();
      return;
    }
    player.setActiveForLockScreen(true, {
      title: radioTitle ?? undefined,
      artworkUrl: radioArtworkUrl ?? undefined,
    });
  }, [radioStreamUrl, radioTitle, radioArtworkUrl, player]);

  // Mirror the store's play/pause intent onto the engine.
  useEffect(() => {
    if (!radioStreamUrl) {
      player.pause();
      return;
    }
    if (radioIsPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [radioIsPlaying, radioStreamUrl, player]);

  return null;
};

export default RadioAudioHost;
